export const CRYPTO_SKILLS = [
  "ctf-crypto",
  "crypto-classical",
  "crypto-rsa",
  "crypto-symmetric",
  "crypto-ecc-dh",
  "crypto-prng-stream",
  "crypto-lattice-pqc",
  "crypto-protocols",
]

export const CRYPTO_REFERENCES = [
  "classic-ciphers",
  "historical",
  "rsa-attacks",
  "rsa-attacks-2",
  "modern-ciphers",
  "modern-ciphers-2",
  "modern-ciphers-3",
  "modern-ciphers-4",
  "ecc-attacks",
  "dh-attacks",
  "prng",
  "prng-attacks",
  "stream-ciphers",
  "advanced-math",
  "lattice-and-lwe",
  "post-quantum",
  "zkp-and-advanced",
  "exotic-crypto",
  "exotic-crypto-2",
  "upstream-index",
] as const

export const CRYPTO_PHASES = [
  {
    id: "intake",
    name: "Scope and artifacts",
    requirement:
      "Record the challenge, supplied files and hashes, flag format, allowed target/oracle, query limits and exclusions.",
  },
  {
    id: "classification",
    name: "Classify the construction",
    requirement:
      "Separate encoding from encryption; identify primitives, parameters, lengths, modes, randomness and available observations.",
  },
  {
    id: "model",
    name: "Mathematical model",
    requirement:
      "Write exact equations, knowns/unknowns and attack preconditions. Fix rings, modulus, byte order, padding and integer widths.",
  },
  {
    id: "attack",
    name: "Bounded attack plan",
    requirement:
      "Choose a matching reference and the cheapest justified technique; record complexity, oracle budget, environment and stopping conditions.",
  },
  {
    id: "recovery",
    name: "Recover a candidate",
    requirement:
      "Save a reproducible solver and its output. Log failed hypotheses and recovered parameters without treating printable text as proof.",
  },
  {
    id: "verification",
    name: "Verify independently",
    requirement:
      "Re-encrypt, verify a signature, satisfy the original equations or use the challenge checker. Save solver/check output and verify exact bytes and flag format.",
  },
  {
    id: "writeup",
    name: "Reproducible solution",
    requirement:
      "Save solve.py or solve.sage and a writeup with inputs, dependencies, commands, root cause, evidence, result and remaining limitations.",
  },
] as const

export type CryptoPhase = (typeof CRYPTO_PHASES)[number]["id"]
