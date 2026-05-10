import { describe, expect, it } from "vitest"
import { buildFtsQuery, getMimePrefixesForCategory } from "./file-query"

describe("buildFtsQuery", () => {
  it("builds a prefix query for sanitized tokens", () => {
    expect(buildFtsQuery("budget 2025")).toBe("budget* AND 2025*")
  })

  it("removes unsafe characters before building the match expression", () => {
    expect(buildFtsQuery('report (draft) "q1"')).toBe("report* AND draft* AND q1*")
  })
})

describe("getMimePrefixesForCategory", () => {
  it("returns image prefixes for the images filter", () => {
    expect(getMimePrefixesForCategory("images")).toEqual(["image/"])
  })

  it("returns an empty list for all files", () => {
    expect(getMimePrefixesForCategory("all")).toEqual([])
  })
})
