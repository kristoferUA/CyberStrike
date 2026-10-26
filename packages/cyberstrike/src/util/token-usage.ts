export function reportedTokens(tokens: {
  total?: number
  input: number
  output: number
  reasoning: number
  cache: { read: number; write: number }
}) {
  if (tokens.total !== undefined && Number.isFinite(tokens.total) && tokens.total > 0) return tokens.total
  // Reasoning is already a subset of output, not a separate context allocation.
  const total = tokens.input + tokens.output + tokens.cache.read + tokens.cache.write
  return Number.isFinite(total) && total > 0 ? total : undefined
}
