# Locate, diagnose and connect

## Windows command syntax

Use PowerShell when available:

```powershell
$cs = (Get-Command cyberstrike -ErrorAction Stop).Source
Set-Location -LiteralPath 'D:\Projects\ctf\challenge'
& $cs --version
& $cs knowledge list
```

Replace the example challenge path with the supplied directory. CMD uses `cd /d "D:\Projects\ctf\challenge"`; PowerShell uses `Set-Location`, not `cd /d`. If PATH lacks the command, use the located checkout's `bin\cyberstrike.cmd`. A Git Bash session can invoke the built `packages/cyberstrike/dist-windows/cyberstrike-windows-x64/bin/cyberstrike.exe` with a quoted absolute path; do not assume it can execute a `.cmd` launcher as a Unix script.

If no installation can be located in PATH, the current project or user-provided paths, ask for its location rather than recursively scanning the home directory. Keep solver paths intact, including Windows drive letters; check that the saved file exists before running it.

## Diagnostics and setup

Use `knowledge list`, the relevant `crypto status` / `pwn status`, and tool exit codes for readiness checks. Do not invent a challenge or require recovery/verification milestones during setup diagnostics. MCP marked Disabled describes a connection setting, not all native tool availability.

Windows CTF.9 fixes the bounded Glob/Ripgrep deadlock and adds Activity/pending-usage indicators. Usage remains unknown until reported; zero cost is not a subscription-quota measurement. The located checkout's `docs/windows-setup.uk.md` covers Git/Bun, PATH and rebuilds. Build only on an installation/update request and preserve local changes; replacing a running Windows executable may require the user to close it.

## Native Claude subscription and MCP

The personal skill works in an existing Claude Code session using local CLI tools. Installing it does not install CyberStrike, the knowledge library or an MCP server. Do not launch a nested Claude/model session just to execute a local command.

When the user wants a new Claude session with CyberStrike MCP, use the fork's native bridge from the challenge directory:

```text
cyberstrike claude --login
cyberstrike claude --status
cyberstrike claude --agent pwn
cyberstrike claude --agent cryptography
```

Login/status are separate from session launch. Claude Code owns sign-in and billing; the user completes browser login. Do not read/copy credential files or tokens. The bridge inherits the main session's Claude model setting when `--model` is omitted. An explicit user-selected model can be passed with `--model`; do not pin a model or effort in the skill. See `docs/claude-subscription.uk.md` in the checkout for planner-model details and authentication troubleshooting.

Check the actual connection with `/mcp`. Use native Claude tools for files and shell, and advertised CyberStrike MCP tools for methodology, scoped HTTP work and findings. HackBrowser is asynchronous: use `hackbrowser_status` and `hackbrowser_stop`, then inspect captures with `web_get_session_context` / `web_get_request_detail`. Its native planner can consume additional model usage. Avoid invoking it for local status/knowledge checks.

The `anthropic/...` provider inside CyberStrike's own TUI uses API billing; the native Claude bridge is the subscription path. Availability, limits and extra usage belong to the Anthropic account. Skills uploaded to claude.ai do not by themselves connect a chat to these local Windows/WSL tools.
