export namespace Rpc {
  type Definition = {
    [method: string]: (input: any) => any
  }

  export function listen(rpc: Definition) {
    onmessage = async (evt) => {
      const parsed = JSON.parse(evt.data)
      if (parsed.type === "rpc.request") {
        try {
          const result = await rpc[parsed.method](parsed.input)
          postMessage(JSON.stringify({ type: "rpc.result", result, id: parsed.id }))
        } catch (error) {
          postMessage(
            JSON.stringify({
              type: "rpc.error",
              id: parsed.id,
              message: error instanceof Error ? error.message : String(error),
            }),
          )
        }
      }
    }
    // Requests sent before this handler is installed can be dropped by Bun Workers.
    postMessage(JSON.stringify({ type: "rpc.ready" }))
  }

  export function emit(event: string, data: unknown) {
    postMessage(JSON.stringify({ type: "rpc.event", event, data }))
  }

  export function client<T extends Definition>(
    target: {
      postMessage: (data: string) => void | null
      onmessage: ((this: Worker, ev: MessageEvent<any>) => any) | null
    },
    options: { timeout?: number } = {},
  ) {
    const ready = Promise.withResolvers<void>()
    const timer = setTimeout(
      () => ready.reject(new Error("TUI worker did not become ready within the startup timeout")),
      options.timeout ?? 15000,
    )
    ready.promise.catch(() => {})
    const pending = new Map<number, { resolve: (result: unknown) => void; reject: (error: Error) => void }>()
    const listeners = new Map<string, Set<(data: any) => void>>()
    let closed: Error | undefined
    let id = 0
    target.onmessage = async (evt) => {
      const parsed = JSON.parse(evt.data)
      if (parsed.type === "rpc.ready") {
        clearTimeout(timer)
        ready.resolve()
      }
      if (parsed.type === "rpc.result") {
        const request = pending.get(parsed.id)
        if (request) {
          request.resolve(parsed.result)
          pending.delete(parsed.id)
        }
      }
      if (parsed.type === "rpc.error") {
        pending.get(parsed.id)?.reject(new Error(parsed.message))
        pending.delete(parsed.id)
      }
      if (parsed.type === "rpc.event") {
        const handlers = listeners.get(parsed.event)
        if (handlers) {
          for (const handler of handlers) {
            handler(parsed.data)
          }
        }
      }
    }
    return {
      ready: ready.promise,
      close(error = new Error("TUI worker closed")) {
        closed = error
        clearTimeout(timer)
        ready.reject(error)
        for (const request of pending.values()) request.reject(error)
        pending.clear()
      },
      async call<Method extends keyof T>(
        method: Method,
        input: Parameters<T[Method]>[0],
      ): Promise<Awaited<ReturnType<T[Method]>>> {
        await ready.promise
        if (closed) throw closed
        const requestId = id++
        return new Promise<Awaited<ReturnType<T[Method]>>>((resolve, reject) => {
          pending.set(requestId, { resolve: (result) => resolve(result as Awaited<ReturnType<T[Method]>>), reject })
          target.postMessage(JSON.stringify({ type: "rpc.request", method, input, id: requestId }))
        })
      },
      on<Data>(event: string, handler: (data: Data) => void) {
        let handlers = listeners.get(event)
        if (!handlers) {
          handlers = new Set()
          listeners.set(event, handlers)
        }
        handlers.add(handler)
        return () => {
          handlers!.delete(handler)
        }
      },
    }
  }
}
