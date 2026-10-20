---
name: cyberstrike
description: Set up and use the CyberStrike CTF fork with ChatGPT plan sign-in or native Claude Code subscription mode for challenge-provided targets and authorized training labs.
---

# CyberStrike for CTF

Use this skill for CyberStrike setup, operation and interpretation of CTF results.

## Setup

- Locate the user's CyberStrike checkout or installed launcher. Read its `docs/ctf-fork.md` or `docs/ctf-fork.uk.md` and run `--help` before relying on command syntax.
- On Windows, the fork builds with `script/build-windows.ps1` and runs with `bin/cyberstrike.cmd`. Use a full launcher path when changing to the challenge directory; the launcher preserves that directory. Use `Set-Location` in PowerShell and `cd /d` in CMD.
- Use `auth login`, choose OpenAI, then **ChatGPT plan (Sign in with ChatGPT)**. The user signs in and approves CyberStrike's plan usage request in the browser. This flow does not require an API key. Choose an exact available model ID from `models openai`.
- For Claude subscriptions, read `docs/claude-subscription.uk.md`. Install official native Claude Code, use `cyberstrike claude --login` and `--status`, then `cyberstrike claude --model sonnet` in the challenge directory. This opens native Claude Code with CyberStrike MCP tools; it does not select a subscription model inside CyberStrike's TUI. The `anthropic/...` TUI provider requires an API key.
- Never read or copy Claude Code credential files, paste OAuth tokens, spoof Claude Code identity headers, or promise that usage is included/unlimited. Native authentication, plan availability and billing remain with Anthropic. CyberStrike's old direct Claude OAuth flow is removed.
- In Claude mode, use native tools for shell/files/tasks. Use CyberStrike MCP tools for CTF methodology, HTTP work and findings. HackBrowser uses native `claude -p` for its planner; inspect `hackbrowser_status`, `web_get_session_context` and `web_get_request_detail`, and analyze captures in the current Claude session. No API-backed CyberStrike subagents run in this mode. A new MCP process creates a new CyberStrike data session.
- Plan access and usage limits depend on the account. Do not claim unlimited access or alter account usage settings. Do not reuse Codex credentials or another application's tokens.
- For a blank TUI, capture `--print-logs --log-level DEBUG` startup stages and redact credentials. A readiness timeout indicates the worker did not finish startup. Rebuild from the fork after closing its executable; the upstream npm installer does not include fork changes.

## Cryptography CTF profile

- Read `docs/cryptography.uk.md`. Use `cyberstrike crypto setup` for the isolated, hash-locked Python 3.12 environment, then `cyberstrike crypto status`. Do not install local Sage, WSL or Docker for this profile.
- Select `cyberstrike --agent cryptography` for the TUI, or `cyberstrike claude --agent cryptography --model sonnet` for native Claude Code. CTF.5 defaults to solve mode: return the verified result and solver promptly; full seven-phase report/writeup is optional on request. Batch recovery/verification evidence with crypto_methodology; it hashes artifacts itself. Keep the user's selected TUI effort unchanged, including across compaction.
- crypto_reference searches separate keywords and synonyms, with ranked excerpts. For custom SPN/Feistel constructions, inspect degree, affine sets and integral/rank invariants before generic SAT. Prefer a small discriminating experiment and avoid repeating timed-out hypotheses without new evidence.
- For RSA in CTF.6, check FactorDB before local factoring when disclosure of the public modulus is authorized. Use one webfetch to https://factordb.com/api?query=<decimal-N> (text, 10s), validate factors/multiplicities/product/primality locally, and cache the result. Honor offline restrictions. Do not repeat unchanged RSA checks after editing XOR/decoding or attempt unbounded generic factoring of a large balanced modulus without a concrete weakness/work estimate.
- CTF.6 fixes drive-letter truncation in apply_patch for add/update/delete/move operations. If an older build creates a file named F or C from an absolute path, update and rebuild; the model's full Windows path may have been correct.
- crypto_run requires a saved script path, e.g. `{"program":"python","script":"solve.py","args":[],"purpose":"experiment"}`. Initial experiments default to 30s; established solve/verify runs to 120s. Higher requested limits require a work/progress justification. Configure workflow, timeouts and a crypto context target under `cryptography` in the application config; never override effort silently.
- Use `crypto_run` for reviewed local solvers and bounded byte/exact-arithmetic helpers. Keep file access, oracle collection and final verification local. Optional OpenSSL/Hashcat/John are used only if separately installed on PATH.
- Use `crypto_sage` or `cyberstrike crypto sage file.sage` for short self-contained mathematical steps through the public SageCell API. Code and embedded values leave the machine; send public CTF parameters, not credentials, recovered private keys or flags. Calls are stateless, currently limited to 30 seconds, and cannot access local files/network oracles. Print small results; respect limits and do not automatically retry or accept terms for the user.
- Save solver/checker evidence and verify candidates against original equations, re-encryption or the challenge checker. Recorded phase completion is a claim, not automatic proof of correctness. The reference library retains its pinned source commit and MIT license.

## CTF scope

- A supplied challenge target is authorized only within the challenge's published scope and rules. If the target or rules are missing or ambiguous, clarify them before sending network traffic.
- Follow rate limits and permitted techniques. A discovered host, redirect or DNS result does not expand the allowed targets.
- Use local files and challenge-specific reconnaissance or exploitation to solve the supplied objective. Retrieve flags and relevant challenge artifacts. Do not target the competition infrastructure, other teams, unrelated services or real accounts, or use techniques prohibited by the event.
- Keep reports local unless the user asks to share them. Report confirmed findings separately from hypotheses, describe actions actually executed, and omit credentials or unrelated personal data.

## References

- [CyberStrike CTF fork](https://github.com/kristoferUA/CyberStrike)
- [OpenAI registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- [Plan inference requirements](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- [Claude Code embedding and authentication](https://code.claude.com/docs/en/legal-and-compliance)
