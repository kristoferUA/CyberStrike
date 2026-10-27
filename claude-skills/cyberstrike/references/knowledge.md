# Local category knowledge

Use the resolved CyberStrike executable for these commands; they retrieve local material without asking another model:

```text
cyberstrike knowledge list
cyberstrike knowledge search "RSA shared prime" --category cryptography --limit 5
cyberstrike knowledge search "stack canary ROP" --category pwn --limit 5
cyberstrike knowledge read overflow-basics --category pwn --start-line 1 --lines 120
```

Choose search terms from the observed construction or primitive. Read the returned topic and line range, widening only when the attack preconditions are incomplete. Record the useful topic and its applicable version/assumptions alongside the experiment. The CLI currently indexes only `cryptography` and `pwn`; confirm a topic with `list` rather than inventing a read identifier.

If the matching MCP tools are already connected, `crypto_reference` or `pwn_reference` provide search/read access. Use the tool's advertised schema rather than guessing namespaced IDs or parameters. Native Read can open the category workflow and specialist skill from the checkout or packaged skill directory.

For other installed categories, list `.cyberstrike/skill` once, then open the matching `SKILL.md` and only the needed supporting files. Examples include `WEB`, `recon-methodology`, `attack-jwt` and `attack-ssrf`. An existing post-exploitation category does not expand the user's CTF scope.

If CLI retrieval is unavailable, read `.cyberstrike/skill/cryptography/ctf-crypto/references` or `.cyberstrike/skill/pwn/ctf-pwn/references` directly. Complete builds place these under `bin/skills/<category>`. Preserve the pinned `SOURCE.json`, licenses and reference bytes; do not rewrite the library while solving.

Report a missing category or dependency precisely and continue with available permitted tools. Do not install the upstream all-category tool bundle or search for writeups when the task forbids them.
