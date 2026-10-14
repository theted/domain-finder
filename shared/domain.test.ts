import { describe, expect, it } from "vitest";
import { toLabel } from "./domain.ts";

describe("toLabel", () => {
  it.each([
    ["Mugkin", "mugkin"],
    ["Sip Nest", "sipnest"],
    ["kilnfolk.com", "kilnfolk"],
    ["Smörvik", "smorvik"],
    ["-dash-name-", "dash-name"],
    ["x", null],
    ["!!!", null],
    ["a".repeat(64), null],
  ])("%s → %s", (input, expected) => {
    expect(toLabel(input)).toBe(expected);
  });
});
