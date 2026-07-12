// Pure inventory module — no Phaser, fully unit-testable.
export interface ItemStack {
  id: string;
  name: string;
  qty: number;
}

export class Inventory {
  private items = new Map<string, ItemStack>();

  add(id: string, name: string, qty = 1): void {
    const existing = this.items.get(id);
    if (existing) existing.qty += qty;
    else this.items.set(id, { id, name, qty });
  }

  remove(id: string, qty = 1): boolean {
    const existing = this.items.get(id);
    if (!existing || existing.qty < qty) return false;
    existing.qty -= qty;
    if (existing.qty === 0) this.items.delete(id);
    return true;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  count(id: string): number {
    return this.items.get(id)?.qty ?? 0;
  }

  list(): ItemStack[] {
    return [...this.items.values()].map((s) => ({ ...s }));
  }

  static from(stacks: ItemStack[]): Inventory {
    const inv = new Inventory();
    for (const s of stacks) inv.add(s.id, s.name, s.qty);
    return inv;
  }
}
