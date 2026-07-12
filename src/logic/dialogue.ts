// Dialogue FSM — pure module. UIScene owns the typewriter; this owns pages/branching.
export interface DialoguePage {
  speaker?: string;
  /** texture key of a portrait, e.g. "portrait-elder" */
  portrait?: string;
  text: string;
}

export type DialogueEffect =
  | { type: "set-flag"; flag: string }
  | { type: "give-item"; id: string; name: string; qty: number }
  | { type: "give-coins"; amount: number }
  | { type: "open-chest" }
  | { type: "save-heal" };

export interface DialogueResult {
  pages: DialoguePage[];
  /** applied by the caller when the dialogue closes */
  effects: DialogueEffect[];
}

export class DialogueRunner {
  private index = 0;
  constructor(readonly pages: DialoguePage[]) {
    if (pages.length === 0) throw new Error("dialogue needs at least one page");
  }

  current(): DialoguePage {
    return this.pages[this.index];
  }

  isLast(): boolean {
    return this.index === this.pages.length - 1;
  }

  /** advance; returns false when there is no next page */
  next(): boolean {
    if (this.isLast()) return false;
    this.index++;
    return true;
  }
}
