import { describe, expect, it } from "vitest";
import { Inventory } from "./inventory";

describe("Inventory", () => {
  it("adds and stacks items", () => {
    const inv = new Inventory();
    inv.add("potion", "Potion", 2);
    inv.add("potion", "Potion", 1);
    expect(inv.count("potion")).toBe(3);
    expect(inv.list()).toEqual([{ id: "potion", name: "Potion", qty: 3 }]);
  });

  it("removes items and drops empty stacks", () => {
    const inv = new Inventory();
    inv.add("potion", "Potion", 2);
    expect(inv.remove("potion")).toBe(true);
    expect(inv.count("potion")).toBe(1);
    expect(inv.remove("potion")).toBe(true);
    expect(inv.has("potion")).toBe(false);
    expect(inv.remove("potion")).toBe(false);
  });

  it("refuses to remove more than held", () => {
    const inv = new Inventory();
    inv.add("coin", "Coin", 1);
    expect(inv.remove("coin", 5)).toBe(false);
    expect(inv.count("coin")).toBe(1);
  });

  it("round-trips through from()/list()", () => {
    const inv = new Inventory();
    inv.add("sword", "Rusty Sword");
    inv.add("potion", "Potion", 2);
    const copy = Inventory.from(inv.list());
    expect(copy.list()).toEqual(inv.list());
  });
});
