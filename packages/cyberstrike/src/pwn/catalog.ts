export const PWN_SKILLS = [
  "ctf-pwn",
  "pwn-triage",
  "pwn-stack-rop",
  "pwn-format-string",
  "pwn-heap",
  "pwn-cross-arch",
  "pwn-kernel",
  "pwn-windows",
]

export const PWN_REFERENCES = [
  "advanced-exploits-2",
  "advanced-exploits-3",
  "advanced-exploits-4",
  "advanced-exploits-5",
  "advanced-exploits",
  "advanced",
  "attack-playbook",
  "field-notes",
  "format-string",
  "heap-fsop",
  "heap-techniques-2",
  "heap-techniques",
  "kernel-bypass",
  "kernel-techniques",
  "kernel",
  "overflow-basics",
  "rop-advanced",
  "rop-and-shellcode",
  "sandbox-escape",
  "upstream-index",
  "static-signals",
  "tools-mcp",
] as const

export const PWN_PHASES = [
  {
    id: "intake",
    name: "Scope and artifacts",
    requirement: "Record supplied binaries/source/libc/loader, hashes, CTF scope and remote query limits.",
  },
  {
    id: "classification",
    name: "ELF and runtime triage",
    requirement: "Record architecture, endian, ABI, mitigations, loader, libc and target environment.",
  },
  {
    id: "model",
    name: "Measured primitive",
    requirement: "Prove the exact corruption/read/write/control primitive and its preconditions.",
  },
  {
    id: "attack",
    name: "Bounded exploit plan",
    requirement: "Choose matching local references, leaks/gadgets and a feasible experiment budget.",
  },
  {
    id: "recovery",
    name: "Reproducible exploit",
    requirement: "Save exploit.py, exact payload bytes, launch settings and observed candidate result.",
  },
  {
    id: "verification",
    name: "Verify in a fresh process",
    requirement: "Validate against the original challenge/checker or a fresh target run, with local evidence.",
  },
  {
    id: "writeup",
    name: "Reproducible solution",
    requirement: "Record inputs, commands, dependencies, root cause, result and limitations.",
  },
] as const

export type PwnPhase = (typeof PWN_PHASES)[number]["id"]
