import path from "node:path"
import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { PwnRuntime } from "../../pwn/runtime"

export const PwnCommand = cmd({
  command: "pwn",
  describe: "set up and use the CTF pwn QEMU/GDB/Python toolchain (also usable from Codex)",
  builder: (yargs) =>
    yargs
      .option("distribution", { type: "string", describe: "WSL distribution; default from pwn config or Ubuntu" })
      .command(
        cmd({
          command: "status",
          describe: "inspect pwn packages and QEMU/GDB availability",
          handler: async (args) =>
            bootstrap(process.cwd(), async () => {
              console.log(
                JSON.stringify(
                  await PwnRuntime.status({
                    cwd: process.cwd(),
                    distribution: args.distribution as string | undefined,
                  }),
                  null,
                  2,
                ),
              )
            }),
        }),
      )
      .command(
        cmd({
          command: "setup",
          describe: "install Ubuntu tools and the hash-locked pwn Python environment",
          handler: async (args) =>
            bootstrap(process.cwd(), async () => {
              console.log(
                JSON.stringify(
                  await PwnRuntime.setup({ cwd: process.cwd(), distribution: args.distribution as string | undefined }),
                  null,
                  2,
                ),
              )
            }),
        }),
      )
      .command(
        cmd({
          command: "run <file>",
          describe: "run a reviewed Python solver in the pwn environment; args after --",
          builder: (yargs) =>
            yargs
              .positional("file", { type: "string", demandOption: true })
              .option("timeout", { type: "number", default: 120 }),
          handler: async (args) =>
            bootstrap(process.cwd(), async () => {
              const result = await PwnRuntime.execute(
                { command: "python", file: path.resolve(args.file), args: args["--"] ?? [], timeout: args.timeout },
                { cwd: process.cwd(), distribution: args.distribution as string | undefined },
              )
              console.log(JSON.stringify(result, null, 2))
              process.exitCode = result.exitCode ?? 1
            }),
        }),
      )
      .command(
        cmd({
          command: "inspect <file>",
          describe: "read ELF mitigations, symbols, PLT/GOT and hash without executing the file",
          builder: (yargs) => yargs.positional("file", { type: "string", demandOption: true }),
          handler: async (args) =>
            bootstrap(process.cwd(), async () => {
              const result = await PwnRuntime.execute(
                { command: "inspect", file: path.resolve(args.file) },
                { cwd: process.cwd(), distribution: args.distribution as string | undefined },
              )
              console.log(JSON.stringify(result, null, 2))
              process.exitCode = result.exitCode ?? 1
            }),
        }),
      )
      .command(
        cmd({
          command: "debug <file>",
          describe: "bounded QEMU user-mode + batch GDB, with saved logs and automatic child cleanup",
          builder: (yargs) =>
            yargs
              .positional("file", { type: "string", demandOption: true })
              .option("arch", { choices: PwnRuntime.ARCHES, type: "string" })
              .option("sysroot", { type: "string" })
              .option("gdb-script", { type: "string" })
              .option("stdin-file", { type: "string" })
              .option("timeout", { type: "number", default: 30 }),
          handler: async (args) =>
            bootstrap(process.cwd(), async () => {
              const result = await PwnRuntime.execute(
                {
                  command: "debug",
                  file: path.resolve(args.file),
                  arch: args.arch,
                  sysroot: args.sysroot,
                  gdb_script: args.gdbScript ? path.resolve(args.gdbScript) : undefined,
                  stdin_file: args.stdinFile ? path.resolve(args.stdinFile) : undefined,
                  args: args["--"] ?? [],
                  timeout: args.timeout,
                },
                { cwd: process.cwd(), distribution: args.distribution as string | undefined },
              )
              console.log(JSON.stringify(result, null, 2))
              process.exitCode = result.exitCode ?? 1
            }),
        }),
      )
      .demandCommand(1),
  handler() {},
})
