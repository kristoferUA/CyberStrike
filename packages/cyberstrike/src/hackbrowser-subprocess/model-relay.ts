// Keep ChatGPT credentials and refresh logic in the parent process. The worker
// receives a temporary capability for this single model on a loopback socket.
export function modelRelay(model: string, transport: typeof fetch) {
  const key = crypto.randomUUID() + crypto.randomUUID()
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    idleTimeout: 0,
    maxRequestBodySize: 16 * 1024 * 1024,
    async fetch(request) {
      if (request.headers.get("authorization") !== `Bearer ${key}`) {
        return Response.json({ error: { message: "Unauthorized crawler model request" } }, { status: 401 })
      }
      const url = new URL(request.url)
      if (request.method !== "POST" || url.pathname !== "/v1/responses" || url.search) {
        return new Response("Not found", { status: 404 })
      }
      const body = (await request.json().catch(() => undefined)) as Record<string, unknown> | undefined
      if (!body || body.model !== model) {
        return Response.json({ error: { message: "Invalid crawler model request" } }, { status: 400 })
      }
      try {
        const response = await transport("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: request.signal,
          redirect: "error",
        })
        return new Response(response.body, {
          status: response.status,
          headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
        })
      } catch (error) {
        return Response.json(
          { error: { message: error instanceof Error ? error.message : "Crawler model request failed" } },
          { status: 502 },
        )
      }
    },
  })
  return {
    baseURL: `http://127.0.0.1:${server.port}/v1`,
    apiKey: key,
    close() {
      server.stop(true)
    },
  }
}
