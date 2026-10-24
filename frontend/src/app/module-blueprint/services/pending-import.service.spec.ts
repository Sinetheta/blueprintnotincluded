import { PendingImportService } from "./pending-import.service";

describe("PendingImportService", () => {
  let service: PendingImportService;

  beforeEach(() => {
    sessionStorage.clear();
    service = new PendingImportService();
  });

  it("hands the parked text over exactly once", () => {
    service.set('{"friendlyname":"x"}');
    expect(service.peek()).toBe(true);
    expect(service.take()).toBe('{"friendlyname":"x"}');
    expect(service.peek()).toBe(false);
    expect(service.take()).toBeNull();
  });

  it("survives a reload: a fresh instance in the same tab still finds it", () => {
    service.set("share-string");
    expect(new PendingImportService().take()).toBe("share-string");
  });

  it("falls back to memory when sessionStorage is unavailable", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    try {
      service.set("in-memory");
      expect(service.peek()).toBe(true);
      expect(service.take()).toBe("in-memory");
      expect(service.take()).toBeNull();
    } finally {
      setItem.mockRestore();
      getItem.mockRestore();
    }
  });
});
