import { Injectable } from "@angular/core";
import { MdbBlueprint } from "../../../../../lib/index";

// One recovery slot for the editor's unsaved work, kept in localStorage so a
// closed tab, a reload, or the login round-trip does not throw away what the
// user drew. There is deliberately only one slot: the goal is "open a tab, do
// work, lose the tab, get it back", not a workshop of parallel drafts.
//
// The slot is never cleared implicitly. It goes away when the work is saved,
// when the user discards it, or when a resume carries it into a new editor
// (where it is rewritten as the work continues). Anything else that replaces
// the open blueprint either asks first (New, Upload, paste) or leaves the slot
// alone and offers it back (opening a saved blueprint in a tab that holds
// other unsaved work).
//
// Ownership: each tab keeps a random session id in sessionStorage, and only
// the tab whose id the slot carries may overwrite it. That is what makes the
// "open your unsaved work in a new tab" offer safe: the new tab claims the
// slot on resume, and the old tab, now showing a different blueprint, cannot
// clobber it. A tab that does not own the slot simply does not persist until
// the slot is resolved — the known limitation of a single slot.

export interface UnsavedWorkSnapshot {
  v: 1;
  sessionId: string;
  savedAt: number;
  // Server id of the blueprint being edited, null for a new one
  id: string | null;
  name: string;
  isPublished?: boolean;
  metadata: {
    category?: string | null;
    subcategory?: string | null;
    description?: string | null;
    modded?: boolean | null;
  };
  mdb: MdbBlueprint;
}

export type UnsavedWorkDraft = Omit<
  UnsavedWorkSnapshot,
  "v" | "sessionId" | "savedAt"
>;

export const UNSAVED_WORK_KEY = "bpni-unsaved-work-v1";
export const EDITOR_SESSION_KEY = "bpni-editor-session";

const DEBOUNCE_MS = 1000;

@Injectable({ providedIn: "root" })
export class UnsavedWorkService {
  private sessionId_: string | null = null;
  private pending: (() => UnsavedWorkDraft | null) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // The debounce must not outlive the page: pagehide is the one event
    // that fires reliably on tab close and navigation, mobile Safari
    // included (beforeunload does not).
    try {
      window.addEventListener("pagehide", () => this.flush());
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") this.flush();
      });
    } catch {
      // No window (tests without DOM): persistence is best effort.
    }
  }

  // This tab's identity for slot ownership. sessionStorage survives a reload
  // of the same tab but not closing it, which is exactly the distinction the
  // recovery flow needs ("same tab came back" vs "some other tab").
  get sessionId(): string {
    if (this.sessionId_ != null) return this.sessionId_;
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(EDITOR_SESSION_KEY);
    } catch {
      stored = null;
    }
    if (stored) this.sessionId_ = stored;
    else this.sessionId_ = this.newSessionId();
    return this.sessionId_;
  }

  // Give this tab a fresh identity so a slot it used to own is left behind
  // intact (and offered back) instead of being overwritten by whatever it
  // edits next.
  release(): void {
    // Whatever is still pending belongs to the work being left behind
    this.flush();
    this.sessionId_ = this.newSessionId();
  }

  private newSessionId(): string {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    try {
      sessionStorage.setItem(EDITOR_SESSION_KEY, id);
    } catch {
      // Private mode: ownership is then per page load, still coherent.
    }
    return id;
  }

  peek(): UnsavedWorkSnapshot | null {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(UNSAVED_WORK_KEY);
    } catch {
      return null;
    }
    if (raw == null) return null;
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    if (!isSnapshot(parsed)) {
      // Unreadable or from a format we no longer understand: nothing to
      // offer, and keeping it would nag forever.
      this.discard();
      return null;
    }
    return parsed;
  }

  owns(snapshot: UnsavedWorkSnapshot | null): boolean {
    return snapshot != null && snapshot.sessionId === this.sessionId;
  }

  // True when this tab may write the slot: it is empty or already ours.
  canWrite(): boolean {
    const current = this.peek();
    return current == null || this.owns(current);
  }

  // Take over whatever is in the slot (after resuming it into this editor).
  claim(): void {
    const current = this.peek();
    if (current == null) return;
    this.write({ ...current, sessionId: this.sessionId });
  }

  // Debounced store: `provide` is read at flush time so a burst of edits
  // serializes once, with the latest state.
  schedule(provide: () => UnsavedWorkDraft | null): void {
    this.pending = provide;
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), DEBOUNCE_MS);
  }

  // Write the pending draft now. Returns false when nothing was pending or
  // the slot belongs to another tab.
  flush(): boolean {
    const provide = this.pending;
    this.cancelPending();
    if (provide == null) return false;
    const draft = provide();
    if (draft == null) return false;
    return this.store(draft);
  }

  // Immediate store, honouring ownership. Returns false when refused or
  // when storage is unavailable.
  store(draft: UnsavedWorkDraft): boolean {
    if (!this.canWrite()) return false;
    return this.write({
      v: 1,
      sessionId: this.sessionId,
      savedAt: Date.now(),
      ...draft,
    });
  }

  discard(): void {
    this.cancelPending();
    try {
      localStorage.removeItem(UNSAVED_WORK_KEY);
    } catch {
      // Nothing to clear then.
    }
  }

  discardIfOwned(): void {
    if (this.owns(this.peek())) this.discard();
    else this.cancelPending();
  }

  private cancelPending(): void {
    this.pending = null;
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = null;
  }

  private write(snapshot: UnsavedWorkSnapshot): boolean {
    try {
      localStorage.setItem(UNSAVED_WORK_KEY, JSON.stringify(snapshot));
      return true;
    } catch {
      // Quota exceeded (a huge blueprint) or storage unavailable (private
      // mode). Deliberately silent: the editor keeps working, it just is
      // not protected against a lost tab.
      return false;
    }
  }
}

function isSnapshot(value: unknown): value is UnsavedWorkSnapshot {
  if (value == null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v["v"] === 1 &&
    typeof v["sessionId"] === "string" &&
    typeof v["savedAt"] === "number" &&
    (v["id"] === null || typeof v["id"] === "string") &&
    typeof v["name"] === "string" &&
    v["metadata"] != null &&
    typeof v["metadata"] === "object" &&
    v["mdb"] != null &&
    typeof v["mdb"] === "object" &&
    isItemList((v["mdb"] as Record<string, unknown>)["blueprintItems"])
  );
}

// importFromMdb dereferences each item's id, so a slot that would make it
// throw is treated as unreadable rather than resumed
function isItemList(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item != null &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>)["id"] === "string",
    )
  );
}

// "5 minutes ago" for the recovery toasts. Coarse on purpose.
export function describeAge(savedAt: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - savedAt) / 60000));
  if (minutes < 1) return $localize`:unsaved work age:just now`;
  if (minutes < 60)
    return $localize`:unsaved work age:${minutes}:count: minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return $localize`:unsaved work age:${hours}:count: hours ago`;
  const days = Math.round(hours / 24);
  return $localize`:unsaved work age:${days}:count: days ago`;
}
