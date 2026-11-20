import { expect, test } from "bun:test"
import path from "node:path"
import { tmpdir } from "../fixture/fixture"

function launch(directory: string, url: string, ...args: string[]) {
  const proc = Bun.spawn([process.execPath, "run", "--conditions=browser", path.resolve("src/index.ts"), ...args], {
    stdout: "pipe",
    stderr: "pipe",
    timeout: 15_000,
    env: {
      ...process.env,
      CYBERSTRIKE_MODELS_URL: url,
      CYBERSTRIKE_MODELS_PATH: undefined,
      CYBERSTRIKE_DISABLE_MODELS_FETCH: undefined,
      XDG_DATA_HOME: path.join(directory, "data"),
      XDG_STATE_HOME: path.join(directory, "state"),
      XDG_CONFIG_HOME: path.join(directory, "config"),
      XDG_CACHE_HOME: path.join(directory, "cache"),
    },
  })
  return Promise.all([proc.exited, new Response(proc.stdout).text(), new Response(proc.stderr).text()])
}

test("local CLI discovery and knowledge work without app state or a model catalog request", async () => {
  await using temp = await tmpdir()
  let requests = 0
  using server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch() {
      requests++
      return new Response("Unavailable", { status: 503 })
    },
  })

  const [versionCode, version, versionError] = await launch(temp.path, server.url.origin, "--version")
  const [listCode, output, listError] = await launch(
    temp.path,
    server.url.origin,
    "knowledge",
    "list",
    "--category",
    "pwn",
  )
  expect(versionCode).toBe(0)
  expect(version.trim()).not.toBe("")
  expect(versionError).toBe("")
  expect(listCode).toBe(0)
  expect(JSON.parse(output).pwn).toContain("overflow-basics")
  expect(listError).toBe("")
  expect(requests).toBe(0)
  const stateDirs = new Bun.Glob("*/cyberstrike").scanSync({ cwd: temp.path, onlyFiles: false })
  expect(Array.from(stateDirs)).toEqual([])
}, 35_000)

test("explicit catalog refresh reports HTTP failure and preserves the previous cache", async () => {
  await using temp = await tmpdir()
  using server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () => new Response("Unavailable", { status: 503 }),
  })
  const cache = path.join(temp.path, "cache", "cyberstrike")
  await Bun.write(path.join(cache, "version"), "21")
  const file = path.join(cache, "models.json")
  const previous = '{"test":{"id":"test","name":"Test","env":[],"models":{}}}'
  await Bun.write(file, previous)

  const [code, output, error] = await launch(temp.path, server.url.origin, "models", "--refresh")
  expect(code).toBe(1)
  expect(output + error).not.toContain("Models cache refreshed")
  expect(error).toContain("Model catalog returned HTTP 503")
  expect(await Bun.file(file).text()).toBe(previous)
}, 20_000)
