# CyberStrike for CTF

[Українська](ctf-fork.uk.md)

**[Complete Windows setup guide (Ukrainian)](windows-setup.uk.md)** includes prerequisite installation, PATH, ChatGPT sign-in, Chromium, updates and troubleshooting.

This fork is for **CTF (Capture The Flag) challenges and authorized training labs**. Supply the challenge's URL, host or files and its rules before starting. Keep all activity inside that scope.

## Windows build

Install Git and Bun; this fork was built on Windows x64 with Bun 1.4.3. From PowerShell:

```powershell
git clone --branch feat/chatgpt-plan-windows-startup https://github.com/kristoferUA/CyberStrike.git
Set-Location CyberStrike
powershell -NoProfile -ExecutionPolicy Bypass -File .\script\build-windows.ps1
.\bin\cyberstrike.cmd --version
```

While the changes are in a pull request, check out `feat/chatgpt-plan-windows-startup` before building. The script installs the locked dependencies, compiles a local executable into `packages/cyberstrike/dist-windows/cyberstrike-windows-x64/bin`, and installs Playwright Chromium for HackBrowser. It uses a CTF version suffix and does not publish a release. Close this executable before rebuilding. Use `-SkipInstall` only after dependencies are installed; `-SkipBrowserInstall` skips Chromium setup when it is already installed or you use CDP. `-ModelsPath <file>` accepts a local models.dev JSON snapshot. Otherwise the build downloads the public model metadata.

Run this fork's launcher from the cloned repository; installing the upstream npm package will select the upstream program. For updating this fork, pull its changes and rebuild. The upstream upgrade command is not the update path for this source checkout.

## Sign in with a ChatGPT plan

```powershell
.\bin\cyberstrike.cmd auth login
.\bin\cyberstrike.cmd models openai
```

Choose **OpenAI → ChatGPT plan (Sign in with ChatGPT)**. Open the displayed URL, sign in and approve CyberStrike's plan usage request. This path does not require an OpenAI API key. Availability, model access and usage limits depend on the account and the current preview. See [OpenAI sign-in documentation](https://developers.openai.com/siwc/token-sharing-open-source/sign-in) and [models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference).

Select an exact model ID from the returned list; example IDs may change. If OpenAI reports a legacy connection or missing plan grant, sign in again with the method above. This integration stores CyberStrike's own credentials in its user data directory outside the checkout. Keep that directory private.

## Run from a challenge directory

The `cryptography` CTF mode includes eight adapted skills, 19 pinned `ljagiello/ctf-skills` reference chapters, a managed Python toolchain and remote SageCell computations. CTF.5 defaults to a concise solve/verification workflow; a full seven-phase report is optional. Reference search ranks keywords/synonyms, exploratory runs have short configurable budgets, and the selected TUI effort survives context compaction. Run `cyberstrike crypto setup`, then `cyberstrike --agent cryptography`; native Claude supports `cyberstrike claude --agent cryptography --model sonnet`. Local Sage, WSL and Docker are unnecessary. Code and embedded parameters sent to SageCell are processed by a public third-party service. [Setup and usage guide (Ukrainian)](cryptography.uk.md).

CTF.6 prioritizes an authorized FactorDB lookup of public RSA moduli before local factoring and reuses unchanged experiment outcomes. It also fixes drive-letter truncation in Windows patch paths (the stray `F` file) and unused zero-valued reference line parameters.

Use the full path to `CyberStrike\bin\cyberstrike.cmd` after switching to the challenge folder. Replace the example paths and model with your actual values.

PowerShell:

```powershell
$cyberstrike = 'D:\Tools\CyberStrike\bin\cyberstrike.cmd'
Set-Location 'D:\CTF\challenge'
& $cyberstrike -m 'openai/<model-id-from-models-list>'
```

CMD:

```cmd
cd /d "D:\CTF\challenge"
"D:\Tools\CyberStrike\bin\cyberstrike.cmd" -m openai/gpt-6-luna
```

`cd /d` applies to CMD. Use `Set-Location` in PowerShell. The launcher preserves your current challenge directory. Adding the checkout's `bin` folder to your user PATH is optional.

Start with the challenge description, allowed target and desired flag format. Include rate limits or prohibited techniques from the event rules. Local tools may execute commands in your challenge folder.

## Codex skill

The reusable skill lives in [`codex-skills/cyberstrike/SKILL.md`](../codex-skills/cyberstrike/SKILL.md). Copy its `cyberstrike` folder into your Codex skills directory (normally `~/.codex/skills`), preserving or reviewing any skill already installed under that name. Start a new Codex chat after installation and invoke `$cyberstrike`.

## HackBrowser setup fix (CTF.2)

If CTF.1 reports `hackbrowser worker not found`, update this branch and rebuild:

```powershell
git pull --ff-only
powershell -NoProfile -ExecutionPolicy Bypass -File .\script\build-windows.ps1
.\bin\cyberstrike.cmd --version
```

The fix is included in `-ctf.2` and newer `-ctf.3` builds. The worker is resolved beside the executable first, and Playwright is resolved from that worker directory. Do not replace the fork with the upstream npm package to fix this error.

## Claude subscriptions (CTF.3)

Install official native Claude Code, run `cyberstrike claude --login`, then run `cyberstrike claude --model sonnet` in the challenge directory. This starts the unmodified Claude Code binary with CyberStrike CTF tools over MCP. Native Claude handles authentication, account billing, files, shell commands and tasks. No API key is needed for subscription sign-in; limits and any extra usage follow your Anthropic account settings. The CyberStrike TUI's `anthropic/...` provider still requires an API key. The old direct Claude OAuth adapter has been removed.

HackBrowser uses native `claude -p` for its planner. Captures are stored in CyberStrike and analyzed by Claude through the MCP web tools; API-backed background proxy agents do not run in this mode. Each MCP process creates a new CyberStrike data session. See the [complete Windows guide in Ukrainian](claude-subscription.uk.md). The native subscription and browser flow needs user login and separate end-to-end verification; a build does not establish that result.

For ChatGPT plan access, HackBrowser sends model requests through an authenticated loopback relay to the parent's existing provider connection. The parent keeps OAuth credentials and refresh logic. The child receives only a temporary local capability for one model. JSON callers such as the crawler's planner receive the completed Responses object after the required upstream event stream finishes. This change was compiled; a complete browser crawl through the relay still needs an end-to-end check.

## What changed

- The terminal waits for the Bun worker to install its RPC listener before sending its first request. Worker errors and readiness timeouts become errors instead of an indefinite blank screen.
- OpenAI sign-in uses CyberStrike's own dynamic client registration, loopback callback, PKCE, state and nonce, and signed ID token verification. Refreshes are serialized within one process.
- Models come from the account's OAuth model catalog. Plan requests use the public Responses endpoint, full input history, streaming and `store: false`. Preview-incompatible fields are omitted; system messages become developer messages and local tool definitions are supplied through `additional_tools`. See [the preview requirements](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations).
- The plugin SDK dependency follows the bundled SDK version, so custom CTF build versions do not request unpublished SDK releases from npm.
- Build output stays in a validated package-local directory; local binaries and account credentials are excluded from Git.

## Validation and limitations

The Windows TUI was observed rendering its logo, prompt and selected model through the CMD launcher. The three RPC regression tests passed during the startup fix. This preparation does **not** establish successful end-to-end model inference, tool execution or multi-process token refresh. Run a simple harmless prompt after login before starting a challenge. Avoid simultaneous CyberStrike processes using the same rotating OAuth connection until that behavior is verified.

The full package type check was blocked by existing dependency/type-resolution errors in this checkout; a focused RPC type check passed. This is a source fork, not an official OpenAI or CyberStrike release.

For a blank terminal, close that CyberStrike instance and run:

```powershell
& $cyberstrike --print-logs --log-level DEBUG -m 'openai/<model-id-from-models-list>'
```

Share the error and startup stages after removing credentials and challenge secrets. A worker readiness timeout now reports a specific startup error.

## Upstream and license

Based on [CyberStrikeus/CyberStrike](https://github.com/CyberStrikeus/CyberStrike), commit `ec4fe5c4252668f2acea7665e7c7c1edcd892c65`. The original copyright notices and [AGPL-3.0 license](../LICENSE) are retained.
