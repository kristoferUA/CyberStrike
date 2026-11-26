import fs from "fs/promises"
import { xdgData, xdgCache, xdgConfig, xdgState } from "xdg-basedir"
import path from "path"
import os from "os"
import { lazy } from "../util/lazy"

const app = "cyberstrike"

const data = path.join(xdgData!, app)
const cache = path.join(xdgCache!, app)
const config = path.join(xdgConfig!, app)
const state = path.join(xdgState!, app)

export namespace Global {
  export const Path = {
    // Allow override via CYBERSTRIKE_TEST_HOME for test isolation
    get home() {
      return process.env.CYBERSTRIKE_TEST_HOME || os.homedir()
    },
    data,
    bin: path.join(data, "bin"),
    log: path.join(data, "log"),
    cache,
    config,
    state,
  }

  export const initialize = lazy(async () => {
    await Promise.all(
      [Path.data, Path.config, Path.state, Path.log, Path.bin].map((dir) => fs.mkdir(dir, { recursive: true })),
    )

    const cacheVersion = "21"
    const marker = Bun.file(path.join(Path.cache, "version"))
    if ((await marker.text().catch(() => "0")) === cacheVersion) return

    const contents = await fs.readdir(Path.cache).catch(() => [])
    await Promise.all(
      contents.map((item) => fs.rm(path.join(Path.cache, item), { recursive: true, force: true }).catch(() => {})),
    )
    await marker.write(cacheVersion)
  })
}
