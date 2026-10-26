import { expect, test } from "bun:test"
import { reportedTokens } from "../../src/util/token-usage"

const empty = { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }

test("an unfinished or interrupted zero-initialized step has unknown usage", () => {
  expect(reportedTokens(empty)).toBeUndefined()
  expect(reportedTokens({ ...empty, total: 0 })).toBeUndefined()
})

test("context prefers reported total and never adds reasoning twice", () => {
  expect(reportedTokens({ ...empty, input: 100, output: 50, reasoning: 30 })).toBe(150)
  expect(reportedTokens({ ...empty, input: 100, output: 50, reasoning: 30, cache: { read: 20, write: 5 } })).toBe(175)
  expect(reportedTokens({ ...empty, input: 100, output: 50, reasoning: 30, total: 170 })).toBe(170)
})

test("input-only usage is visible even when output is zero", () => {
  expect(reportedTokens({ ...empty, input: 100 })).toBe(100)
})
