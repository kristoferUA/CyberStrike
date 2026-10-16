import type { Hooks, PluginInput } from "@cyberstrike-io/plugin"
export async function AnthropicAuthPlugin(_input: PluginInput): Promise<Hooks> {
  return {
    auth: {
      provider: "anthropic",
      methods: [
        {
          // Subscription sign-in is owned by native Claude Code, via the
          // separate `cyberstrike claude` command.
          type: "api",
          label: "Anthropic API key (subscription: use cyberstrike claude)",
          prompts: [
            {
              type: "text",
              key: "key",
              message: "Anthropic API key (for a subscription, run cyberstrike claude --login)",
              placeholder: "sk-ant-api...",
            },
          ],
          authorize: async (inputs) => {
            const key = inputs?.key?.trim()
            if (!key) return { type: "failed" as const }
            if (key.startsWith("sk-ant-oat")) {
              throw new Error(
                "For a Claude subscription, run cyberstrike claude --login. Do not paste OAuth tokens here.",
              )
            }
            return { type: "success" as const, key }
          },
        },
      ],
    },
  }
}
