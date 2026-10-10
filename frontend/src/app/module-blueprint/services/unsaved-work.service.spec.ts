import {
  describeAge,
  EDITOR_SESSION_KEY,
  UNSAVED_WORK_KEY,
  UnsavedWorkDraft,
  UnsavedWorkService,
} from "./unsaved-work.service";

const draft = (over: Partial<UnsavedWorkDraft> = {}): UnsavedWorkDraft => ({
  id: null,
  name: "my build",
  metadata: {},
  mdb: { blueprintItems: [{ id: "Ladder", position: { x: 0, y: 0 } } as any] },
  ...over,
});

const stored = () =>
  JSON.parse(localStorage.getItem(UNSAVED_WORK_KEY) ?? "null");

describe("UnsavedWorkService", () => {
  let service: UnsavedWorkService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers();
    service = new UnsavedWorkService();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("session identity", () => {
    it("keeps the same id across instances in one tab (sessionStorage)", () => {
      const first = service.sessionId;
      expect(sessionStorage.getItem(EDITOR_SESSION_KEY)).toBe(first);
      expect(new UnsavedWorkService().sessionId).toBe(first);
    });

    it("release() flushes what is pending, then gives the tab a new id so the slot is no longer owned", () => {
      service.store(draft());
      expect(service.owns(service.peek())).toBe(true);
      service.schedule(() => draft({ name: "last edit" }));
      service.release();
      expect(stored().name).toBe("last edit");
      expect(service.owns(service.peek())).toBe(false);
      expect(sessionStorage.getItem(EDITOR_SESSION_KEY)).toBe(
        service.sessionId,
      );
    });
  });

  describe("store / peek", () => {
    it("writes a versioned, stamped snapshot owned by this tab", () => {
      vi.setSystemTime(new Date(1_700_000_000_000));
      expect(service.store(draft({ id: "bp-1", name: "n" }))).toBe(true);
      const snapshot = stored();
      expect(snapshot.v).toBe(1);
      expect(snapshot.sessionId).toBe(service.sessionId);
      expect(snapshot.savedAt).toBe(1_700_000_000_000);
      expect(snapshot.id).toBe("bp-1");
      expect(snapshot.name).toBe("n");
      expect(service.peek()).toEqual(snapshot);
    });

    it("refuses to overwrite a slot another tab owns", () => {
      service.store(draft({ name: "theirs" }));
      sessionStorage.clear();
      const other = new UnsavedWorkService();
      expect(other.sessionId).not.toBe(service.sessionId);
      expect(other.canWrite()).toBe(false);
      expect(other.store(draft({ name: "mine" }))).toBe(false);
      expect(stored().name).toBe("theirs");
    });

    it("claim() takes over the slot for this tab", () => {
      service.store(draft({ name: "theirs" }));
      sessionStorage.clear();
      const other = new UnsavedWorkService();
      other.claim();
      expect(other.owns(other.peek())).toBe(true);
      expect(stored().name).toBe("theirs");
    });

    it("drops an unreadable or foreign-format slot instead of offering it", () => {
      localStorage.setItem(UNSAVED_WORK_KEY, "{not json");
      expect(service.peek()).toBeNull();
      expect(localStorage.getItem(UNSAVED_WORK_KEY)).toBeNull();

      localStorage.setItem(UNSAVED_WORK_KEY, JSON.stringify({ v: 2, mdb: {} }));
      expect(service.peek()).toBeNull();
      expect(localStorage.getItem(UNSAVED_WORK_KEY)).toBeNull();

      // An item the importer would choke on is as good as unreadable
      service.store(draft({ mdb: { blueprintItems: [null] } as any }));
      expect(service.peek()).toBeNull();
      expect(localStorage.getItem(UNSAVED_WORK_KEY)).toBeNull();
    });

    it("is silent when storage refuses the write (quota, private mode)", () => {
      const setItem = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("QuotaExceeded");
        });
      expect(() => service.store(draft())).not.toThrow();
      expect(service.store(draft())).toBe(false);
      setItem.mockRestore();
    });
  });

  describe("schedule / flush", () => {
    it("debounces and serializes the latest state once", () => {
      const provide = vi.fn(() => draft({ name: "latest" }));
      service.schedule(() => draft({ name: "stale" }));
      service.schedule(provide);
      expect(localStorage.getItem(UNSAVED_WORK_KEY)).toBeNull();
      vi.advanceTimersByTime(1000);
      expect(provide).toHaveBeenCalledTimes(1);
      expect(stored().name).toBe("latest");
    });

    it("flush() writes a pending draft immediately, once", () => {
      service.schedule(() => draft({ name: "now" }));
      expect(service.flush()).toBe(true);
      expect(stored().name).toBe("now");
      expect(service.flush()).toBe(false);
      vi.advanceTimersByTime(2000);
      expect(stored().name).toBe("now");
    });

    it("pagehide flushes whatever is pending", () => {
      service.schedule(() => draft({ name: "leaving" }));
      window.dispatchEvent(new Event("pagehide"));
      expect(stored().name).toBe("leaving");
    });

    it("a null draft at flush time stores nothing", () => {
      service.schedule(() => null);
      expect(service.flush()).toBe(false);
      expect(localStorage.getItem(UNSAVED_WORK_KEY)).toBeNull();
    });
  });

  describe("discard", () => {
    it("discard() clears the slot and any pending write", () => {
      service.store(draft());
      service.schedule(() => draft({ name: "pending" }));
      service.discard();
      vi.advanceTimersByTime(2000);
      expect(localStorage.getItem(UNSAVED_WORK_KEY)).toBeNull();
    });

    it("discardIfOwned() leaves another tab's slot alone", () => {
      service.store(draft({ name: "theirs" }));
      sessionStorage.clear();
      const other = new UnsavedWorkService();
      other.schedule(() => draft({ name: "pending" }));
      other.discardIfOwned();
      vi.advanceTimersByTime(2000);
      expect(stored().name).toBe("theirs");
      service.discardIfOwned();
      expect(localStorage.getItem(UNSAVED_WORK_KEY)).toBeNull();
    });
  });

  describe("describeAge", () => {
    it("is coarse", () => {
      const now = 10_000_000_000;
      expect(describeAge(now - 10_000, now)).toBe("just now");
      expect(describeAge(now - 5 * 60_000, now)).toBe("5 minutes ago");
      expect(describeAge(now - 3 * 3_600_000, now)).toBe("3 hours ago");
      expect(describeAge(now - 2 * 86_400_000, now)).toBe("2 days ago");
    });
  });
});
