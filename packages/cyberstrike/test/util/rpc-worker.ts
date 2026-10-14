import { Rpc } from "../../src/util/rpc"

await Bun.sleep(100)

export const rpc = {
  echo(value: string) {
    return value
  },
  fail() {
    throw new Error("worker method failed")
  },
}

Rpc.listen(rpc)
