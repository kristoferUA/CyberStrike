import { expect, test } from "bun:test"
import { Rpc } from "../../src/util/rpc"
import type { rpc } from "./rpc-worker"

test("queues the first request until a delayed worker installs its handler", async () => {
  const worker = new Worker(new URL("./rpc-worker.ts", import.meta.url))
  const client = Rpc.client<typeof rpc>(worker)
  try {
    expect(await client.call("echo", "ready")).toBe("ready")
  } finally {
    client.close()
    worker.terminate()
  }
})

test("rejects when a worker method throws", async () => {
  const worker = new Worker(new URL("./rpc-worker.ts", import.meta.url))
  const client = Rpc.client<typeof rpc>(worker)
  try {
    await expect(client.call("fail", undefined)).rejects.toThrow("worker method failed")
  } finally {
    client.close()
    worker.terminate()
  }
})

test("rejects startup if the worker never installs its handler", async () => {
  const worker = new Worker(new URL("./rpc-silent-worker.ts", import.meta.url))
  const client = Rpc.client<typeof rpc>(worker, { timeout: 200 })
  try {
    await expect(client.call("echo", "ready")).rejects.toThrow("did not become ready")
  } finally {
    client.close()
    worker.terminate()
  }
})
