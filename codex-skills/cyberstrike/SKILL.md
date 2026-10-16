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
