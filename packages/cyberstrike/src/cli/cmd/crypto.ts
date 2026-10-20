import path from "node:path"
import { cmd } from "./cmd"
import { CryptoRuntime } from "../../cryptography/runtime"
import { sagecell } from "../../cryptography/sagecell"

export const CryptoCommand = cmd({
  command: "crypto",
  describe: "set up and use the CTF cryptography toolchain",
  builder: (yargs) =>
    yargs
      .command(
        cmd({
          command: "setup",
          describe: "install the isolated Python crypto packages from the hash-locked manifest",
          handler: async () => {
            console.log(JSON.stringify(await CryptoRuntime.setup(), null, 2))
          },
        }),
      )
      .command(
        cmd({
          command: "status",
          describe: "show local crypto packages and the SageCell backend",
          handler: async () => {
            console.log(JSON.stringify(await CryptoRuntime.status(), null, 2))
          },
        }),
      )
      .command(
        cmd({
          command: "run <file>",
          describe: "run a local Python CTF solver; pass script arguments after --",
          builder: (yargs) => yargs.positional("file", { type: "string", demandOption: true }),
          handler: async (args) => {
            const result = await CryptoRuntime.execute("python", [path.resolve(args.file), ...(args["--"] ?? [])], {
              cwd: process.cwd(),
              timeout: 300000,
            })
            process.stdout.write(result.stdout)
            process.stderr.write(result.stderr)
            process.exitCode = result.exitCode
          },
        }),
      )
      .command(
        cmd({
          command: "probe <file>",
          describe: "inspect ciphertext bytes, hashes, entropy and repeated blocks offline",
          builder: (yargs) => yargs.positional("file", { type: "string", demandOption: true }),
          handler: async (args) => {
            const result = await CryptoRuntime.execute("probe", [path.resolve(args.file), ...(args["--"] ?? [])], {
              cwd: process.cwd(),
            })
            process.stdout.write(result.stdout)
            process.stderr.write(result.stderr)
            process.exitCode = result.exitCode
          },
        }),
      )
      .command(
        cmd({
          command: "math <operation> [values..]",
          describe: "exact gcd/inverse/root/crt/rsa/xor helpers",
          builder: (yargs) =>
            yargs
              .positional("operation", { type: "string", demandOption: true })
              .positional("values", { type: "string", array: true }),
          handler: async (args) => {
            const result = await CryptoRuntime.execute("math", [args.operation, ...(args.values ?? []).map(String)], {
              cwd: process.cwd(),
            })
            process.stdout.write(result.stdout)
            process.stderr.write(result.stderr)
            process.exitCode = result.exitCode
          },
        }),
      )
      .command(
        cmd({
          command: "sage <file>",
          describe: "send a self-contained Sage file to the public SageCell API",
          builder: (yargs) => yargs.positional("file", { type: "string", demandOption: true }),
          handler: async (args) => {
            const file = Bun.file(path.resolve(args.file))
            if (file.size > 45000) throw new Error("Sage input exceeds 45000 bytes.")
            const result = await sagecell(await file.text())
            console.log(JSON.stringify(result, null, 2))
            if (!result.success) process.exitCode = 1
          },
        }),
      )
      .demandCommand(1),
  handler() {},
})
