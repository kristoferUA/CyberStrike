import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { tmpdir } from "../fixture/fixture"
import { Ripgrep } from "../../src/file/ripgrep"

describe("file.ripgrep", () => {
  test("reaps a real producer when the consumer stops after 100 results", async () => {
    const proc = Bun.spawn(
      [
        process.execPath,
        "-e",
        'process.stdout.write(Array.from({length:1000},(_,i)=>`file-${i}\\n`).join(""));setInterval(()=>{},1000)',
      ],
      { stdin: "ignore", stdout: "pipe", stderr: "ignore", timeout: 5000 },
    )
    const started = performance.now()
    const files: string[] = []
    for await (const file of Ripgrep.lines(proc)) {
      files.push(file)
      if (files.length === 100) break
    }
    expect(files).toHaveLength(100)
    expect(performance.now() - started).toBeLessThan(1500)
    expect(proc.exitCode !== null || proc.signalCode !== null).toBe(true)
  })

  test("cancels a quiet producer while waiting for its next stdout chunk", async () => {
    const proc = Bun.spawn([process.execPath, "-e", "setInterval(()=>{},1000)"], {
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
      timeout: 5000,
    })
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new Error("search deadline")), 100)
    try {
      await expect(Array.fromAsync(Ripgrep.lines(proc, controller.signal))).rejects.toThrow()
      expect(proc.exitCode !== null || proc.signalCode !== null).toBe(true)
    } finally {
      clearTimeout(timer)
      proc.kill()
    }
  })

  test("defaults to include hidden", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "visible.txt"), "hello")
        await fs.mkdir(path.join(dir, ".cyberstrike"), { recursive: true })
        await Bun.write(path.join(dir, ".cyberstrike", "thing.json"), "{}")
      },
    })

    const files = await Array.fromAsync(Ripgrep.files({ cwd: tmp.path }))
    const hasVisible = files.includes("visible.txt")
    const hasHidden = files.includes(path.join(".cyberstrike", "thing.json"))
    expect(hasVisible).toBe(true)
    expect(hasHidden).toBe(true)
  })

  test("hidden false excludes hidden", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "visible.txt"), "hello")
        await fs.mkdir(path.join(dir, ".cyberstrike"), { recursive: true })
        await Bun.write(path.join(dir, ".cyberstrike", "thing.json"), "{}")
      },
    })

    const files = await Array.fromAsync(Ripgrep.files({ cwd: tmp.path, hidden: false }))
    const hasVisible = files.includes("visible.txt")
    const hasHidden = files.includes(path.join(".cyberstrike", "thing.json"))
    expect(hasVisible).toBe(true)
    expect(hasHidden).toBe(false)
  })
})
