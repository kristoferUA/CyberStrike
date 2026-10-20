const aliases: Record<string, string[]> = {
  integral: ["integral", "square", "higher-order"],
  square: ["square", "integral"],
  algebraic: ["algebraic", "anf"],
  lattice: ["lattice", "lll", "bkz"],
  nonce: ["nonce", "nonces"],
  feistel: ["feistel", "spn"],
  prng: ["prng", "random generator", "mt19937", "lcg"],
}
const generic = new Set([
  "a",
  "an",
  "the",
  "of",
  "for",
  "and",
  "or",
  "with",
  "in",
  "to",
  "attack",
  "attacks",
  "cipher",
  "ciphers",
  "block",
  "crypto",
  "cryptography",
  "low",
])

export function searchReferences(documents: { topic: string; text: string }[], query: string, limit = 8) {
  const words = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])]
  const specific = words.filter((word) => !generic.has(word))
  const terms = specific.length ? specific : words
  const groups = terms.map((term) => ({ term, words: aliases[term] ?? [term] }))
  const phrase = query.trim().toLowerCase()
  const hits = documents
    .flatMap((document) => {
      const lines = document.text.split(/\r?\n/)
      let heading = ""
      return lines.flatMap((line, index) => {
        if (/^#{1,6}\s/.test(line)) heading = line.replace(/^#+\s*/, "")
        const lower = line.toLowerCase()
        const matched = groups.filter((group) => group.words.some((word) => lower.includes(word)))
        if (!matched.length) return []
        const title = /^#{1,6}\s/.test(line)
        const score =
          matched.reduce((sum, group) => sum + (aliases[group.term] ? 5 : 2), 0) +
          (lower.includes(phrase) ? 8 : 0) +
          (title ? 3 : 0)
        return [
          {
            topic: document.topic,
            line: index + 1,
            heading,
            score,
            matched: matched.map((group) => group.term),
            excerpt: lines
              .slice(Math.max(0, index - 1), index + 3)
              .map((value, offset) => `${Math.max(0, index - 1) + offset + 1}: ${value.slice(0, 700)}`)
              .join("\n"),
          },
        ]
      })
    })
    .sort((left, right) => right.score - left.score || left.topic.localeCompare(right.topic) || left.line - right.line)
  const selected: typeof hits = []
  for (const hit of hits) {
    if (selected.some((other) => other.topic === hit.topic && Math.abs(other.line - hit.line) < 5)) continue
    selected.push(hit)
    if (selected.length >= limit) break
  }
  return { terms, total: hits.length, hits: selected }
}
