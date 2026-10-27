# Pwn with WSL, QEMU and GDB

Read the local `ctf-pwn` workflow, then select `pwn-triage`, `pwn-stack-rop`, `pwn-format-string`, `pwn-heap`, `pwn-cross-arch`, `pwn-kernel` or `pwn-windows` from the observed primitive. Read its matching chapters and validate libc/ABI/version preconditions.

For a fresh Windows setup request, use the located checkout's `script/setup-pwn-windows.ps1` and `docs/pwn.uk.md`. The installer prepares official WSL2/Ubuntu, QEMU user/system, GDB-multiarch, binutils and managed Python 3.12 with hash-locked pwntools/ROP tools. A Windows restart or first Linux account creation needs the user's interaction. Preserve existing distributions/default users; never request passwords in chat.

Use these direct commands from the challenge directory:

```text
cyberstrike pwn status
cyberstrike pwn inspect ./challenge
cyberstrike pwn run ./exploit.py --timeout 30 -- --local
cyberstrike pwn debug ./challenge --arch aarch64 --sysroot /usr/aarch64-linux-gnu --gdb-script ./trace.gdb --timeout 30
```

Select another named Ubuntu with the documented `--distribution` option when needed. Missing WSL/Ubuntu is an environment issue, not evidence that the challenge is broken. Inspect ELF metadata without executing it; use the exact supplied libc/loader and mitigations before developing a payload.

Save and review `trace.gdb` before passing it to the debugger. A minimal sequence is `break main`, `continue`, `info registers`, `x/12i $pc`, `bt`. Static binaries need no sysroot. Architecture can be detected from ELF; use explicit `--arch` when resolving ambiguity. Use `--stdin-file ./payload.bin` for exact binary input and pass program arguments after `--`.

`pwn debug` owns and cleans its QEMU/GDB children and saves evidence under `pwn-debug-<id>`. Modern QEMU uses a private Unix debugger socket; older QEMU needs a private network namespace. Do not replace a failed private transport with an externally exposed GDB stub.

The equivalent connected MCP tools are `pwn_environment`, `pwn_run`, `pwn_debug`, `pwn_reference` and `pwn_methodology`; use their advertised schemas. Setup and solver execution are separate actions.

QEMU user-mode runs Linux ELF, not PE or kernel images. Use the supplied disposable VM/launch assets for kernel CTFs and the matching Windows lab debugger for PE. Run reviewed challenge artifacts as the normal Linux user. Verify a real exploit in a fresh process: a crash or debugger-only address is insufficient.
