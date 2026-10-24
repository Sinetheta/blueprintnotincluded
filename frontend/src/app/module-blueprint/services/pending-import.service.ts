import { Injectable } from "@angular/core";

// A blueprint handed to the editor from somewhere that cannot open it
// itself. The Discover page's "Open a blueprint" box takes a pasted share
// string or a dropped .blueprint file, but parsing one needs the game
// database, which only the editor loads — so the text is parked here and the
// editor takes it the moment its database is ready (startEditor).
//
// sessionStorage, not a field: the editor is reached by router navigation
// and the user may reload it before the import ran (or open it in a new
// tab from the box's own link). Per tab, and consumed on read, so a parked
// paste can never resurface in a later, unrelated editor session.
const STORAGE_KEY = "bpni-pending-import";

@Injectable({ providedIn: "root" })
export class PendingImportService {
  // In-memory copy for a browser whose sessionStorage throws (private
  // windows, blocked storage): the same-tab navigation still works.
  private fallback: string | null = null;

  set(text: string): void {
    this.fallback = text;
    try {
      sessionStorage.setItem(STORAGE_KEY, text);
    } catch {
      // storage unavailable — the in-memory copy carries it
    }
  }

  /** The parked text, if any, and it is gone once read. */
  take(): string | null {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored != null) sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // fall through to the in-memory copy
    }
    const text = stored ?? this.fallback;
    this.fallback = null;
    return text;
  }

  peek(): boolean {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) != null) return true;
    } catch {
      // storage unavailable
    }
    return this.fallback != null;
  }
}
