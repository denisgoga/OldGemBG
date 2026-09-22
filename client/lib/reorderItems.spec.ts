import { describe, expect, it } from "vitest";
import { moveItemInList } from "./reorderItems";

const list = [
  { id: "a", sort_order: -5, title: "A" },
  { id: "b", sort_order: -4, title: "B" },
  { id: "c", sort_order: 0, title: "C" },
];

describe("moveItemInList", () => {
  it("moves an item up and reindexes sort_order to match visual order", () => {
    const next = moveItemInList(list, "c", "up");
    expect(next?.map((item) => item.id)).toEqual(["a", "c", "b"]);
    expect(next?.map((item) => item.sort_order)).toEqual([0, 1, 2]);
  });

  it("moves an item down one step", () => {
    const next = moveItemInList(list, "a", "down");
    expect(next?.map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(next?.map((item) => item.sort_order)).toEqual([0, 1, 2]);
  });

  it("does not move the first item up", () => {
    expect(moveItemInList(list, "a", "up")).toBeNull();
  });

  it("does not move the last item down", () => {
    expect(moveItemInList(list, "c", "down")).toBeNull();
  });

  it("returns null for an unknown id", () => {
    expect(moveItemInList(list, "missing", "up")).toBeNull();
  });
});
