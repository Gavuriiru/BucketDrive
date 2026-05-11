import { describe, expect, it } from "vitest"
import { buildStorageTrend, parseAllowedMimeTypes } from "./dashboard.utils"

describe("buildStorageTrend", () => {
  it("tracks cumulative usage across create and delete boundaries", () => {
    const points = buildStorageTrend(
      [
        {
          sizeBytes: 100,
          createdAt: "2026-05-04T10:00:00.000Z",
          deletedAt: null,
        },
        {
          sizeBytes: 40,
          createdAt: "2026-05-06T10:00:00.000Z",
          deletedAt: "2026-05-08T12:00:00.000Z",
        },
      ],
      7,
      new Date("2026-05-10T12:00:00.000Z"),
    )

    expect(points.map((point) => point.usedBytes)).toEqual([100, 100, 140, 140, 100, 100, 100])
  })
})

describe("parseAllowedMimeTypes", () => {
  it("returns a parsed string array when valid JSON is stored", () => {
    expect(parseAllowedMimeTypes('["image/png","application/pdf"]')).toEqual([
      "image/png",
      "application/pdf",
    ])
  })

  it("returns an empty array for invalid values", () => {
    expect(parseAllowedMimeTypes("not-json")).toEqual([])
  })
})
