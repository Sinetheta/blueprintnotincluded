import { BlueprintService, BlueprintFileType } from "./blueprint-service";
import {
  Blueprint,
  BuildLocationRule,
  CameraService,
  OniItem,
  Vector2,
  decodeBniShareString,
  encodeBniShareString,
} from "../../../../../lib/index";
import { config, of, Subject, throwError } from "rxjs";

describe("BlueprintService", () => {
  let service: BlueprintService;
  let mockHttp: any;
  let mockAuth: any;
  let mockLocation: any;
  let mockContentLocale: any;
  let mockUnsavedWork: any;
  let savedCamera: CameraService;

  beforeEach(() => {
    savedCamera = CameraService.cameraService;
    mockHttp = { get: vi.fn(), post: vi.fn() };
    mockAuth = { isLoggedIn: vi.fn(() => false), getToken: vi.fn(() => "") };
    mockLocation = { replaceState: vi.fn() };
    // English reader: appendToUrl is the identity, which is the shape every
    // existing URL assertion below was written against.
    mockContentLocale = { appendToUrl: vi.fn((url: string) => url) };
    mockUnsavedWork = {
      schedule: vi.fn(),
      store: vi.fn(() => true),
      claim: vi.fn(),
      discard: vi.fn(),
      discardIfOwned: vi.fn(),
    };
    service = new BlueprintService(
      mockHttp,
      mockAuth,
      mockLocation,
      mockContentLocale,
      mockUnsavedWork,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    (CameraService as any).cameraService_ = savedCamera;
  });

  // One fake item is enough: the slot stores the undo snapshot, and an
  // empty snapshot is never worth keeping
  const oneItem = () =>
    ({
      blueprintItems: [{ id: "Ladder", position: { x: 0, y: 0 } }],
    }) as any;
  const edit = () => {
    vi.spyOn(service.blueprint, "toMdbBlueprint").mockReturnValue(oneItem());
    service.blueprintChanged();
  };
  const query = (url: string) =>
    Object.fromEntries(new URLSearchParams(url.split("?")[1]));

  describe("unsaved work", () => {
    it("is clean after a load and dirty after an edit", () => {
      expect(service.isDirty).toBe(false);
      edit();
      expect(service.isDirty).toBe(true);
      expect(mockUnsavedWork.schedule).toHaveBeenCalledTimes(1);
      const draft = mockUnsavedWork.schedule.mock.calls[0][0]();
      expect(draft.mdb.blueprintItems).toHaveLength(1);
      expect(draft.name).toBe("new blueprint");
      expect(draft.id).toBeNull();
    });

    it("opening a blueprint does not store it once the debounce fires", () => {
      // A load copies the items in (a change, so dirty and scheduled) and
      // only then resets the undo stack
      edit();
      service.resetUndoStates();
      const provide = mockUnsavedWork.schedule.mock.calls[0][0];
      expect(provide()).toBeNull();
    });

    it("undoing back to the loaded state is clean again", () => {
      edit();
      service.undo();
      expect(service.isDirty).toBe(false);
      service.redo();
      expect(service.isDirty).toBe(true);
    });

    it("a successful save makes the current state the clean one and drops the slot", () => {
      edit();
      mockHttp.post.mockReturnValue(of({ id: "bp-9" }));
      service.saveBlueprint(false).subscribe();
      expect(service.isDirty).toBe(false);
      expect(mockUnsavedWork.discardIfOwned).toHaveBeenCalled();
      edit();
      expect(service.isDirty).toBe(true);
    });

    it("edits made while the save is in flight stay unsaved", () => {
      edit();
      const response = new Subject<any>();
      mockHttp.post.mockReturnValue(response);
      service.saveBlueprint(false).subscribe();
      edit();
      response.next({ id: "bp-9" });
      expect(service.isDirty).toBe(true);
      expect(mockUnsavedWork.discardIfOwned).not.toHaveBeenCalled();
      // Undoing the in-flight edit lands on the saved state
      service.undo();
      expect(service.isDirty).toBe(false);
    });

    it("New asks before discarding edits and keeps the work on No", () => {
      edit();
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
      service.blueprint.blueprintItems.push({} as any);
      service.newBlueprint();
      expect(confirm).toHaveBeenCalled();
      expect(service.isDirty).toBe(true);
      expect(mockLocation.replaceState).not.toHaveBeenCalledWith("/editor");
      confirm.mockReturnValue(true);
      service.newBlueprint();
      expect(mockUnsavedWork.discardIfOwned).toHaveBeenCalled();
      expect(mockLocation.replaceState).toHaveBeenCalledWith("/editor");
    });

    it("New never asks when there is nothing to lose", () => {
      const confirm = vi.spyOn(window, "confirm");
      service.newBlueprint();
      expect(confirm).not.toHaveBeenCalled();
    });

    it("stashForLogin stores even an unedited blueprint", () => {
      vi.spyOn(service.blueprint, "toMdbBlueprint").mockReturnValue(oneItem());
      service.resetUndoStates();
      expect(service.isDirty).toBe(false);
      expect(service.stashForLogin()).toBe(true);
      expect(
        mockUnsavedWork.store.mock.calls[0][0].mdb.blueprintItems,
      ).toHaveLength(1);
    });

    it("resumeUnsavedWork loads the snapshot as unsaved work and claims the slot", () => {
      const observer = { blueprintChanged: vi.fn() };
      service.subscribeBlueprintChanged(observer);
      service.resumeUnsavedWork({
        v: 1,
        sessionId: "s",
        savedAt: 1,
        id: "bp-3",
        name: "resumed",
        isPublished: false,
        metadata: { category: "base" },
        mdb: { blueprintItems: [] },
      });
      expect(service.id).toBe("bp-3");
      expect(service.name).toBe("resumed");
      expect(service.isPublished).toBe(false);
      expect(service.metadata.category).toBe("base");
      expect(observer.blueprintChanged).toHaveBeenCalledTimes(1);
      expect(mockLocation.replaceState).toHaveBeenCalledWith("/b/bp-3");
      expect(service.isDirty).toBe(true);
      expect(mockUnsavedWork.claim).toHaveBeenCalled();
    });
  });

  describe("savedBlueprint getter", () => {
    it("returns false when id is null", () => {
      expect(service.savedBlueprint).toBe(false);
    });

    it("returns true when id is set", () => {
      service.id = "abc123";
      expect(service.savedBlueprint).toBe(true);
    });
  });

  describe("rocket interior origin", () => {
    // Plain records are all the alignment and the fitter read.
    const station = (x: number, y: number) => ({
      id: "RocketControlStation",
      position: { x, y },
    });
    const useItems = (items: any[]) => {
      (service.blueprint as any).blueprintItems = items;
    };

    // The medium hull's walls drawn around origin (10, 10).
    const mediumWalls = () => {
      const walls: any[] = [];
      for (let x = 5; x <= 16; x++)
        for (const y of [6, 15])
          walls.push({ id: "MetalTile", position: { x, y } });
      for (let y = 7; y <= 14; y++)
        for (const x of [5, 16])
          walls.push({ id: "MetalTile", position: { x, y } });
      return walls;
    };
    const tilesAreWalls = () => {
      (OniItem as any).oniItemsMap = new Map([
        ["MetalTile", { buildLocationRule: BuildLocationRule.Tile }],
      ]);
    };

    beforeEach(() => {
      // The undo snapshot would serialize the plain records
      vi.spyOn(service.blueprint, "toMdbBlueprint").mockReturnValue(oneItem());
    });

    afterEach(() => {
      (OniItem as any).oniItemsMap = undefined;
    });

    it("keeps a station-given origin on the station as the station moves, undo included", () => {
      useItems([station(0, 0)]);
      service.setRocketInterior("medium");
      // Medium template: station origin cell (0, -3).
      expect(service.metadata.rocketInteriorOrigin).toEqual({ x: 0, y: 3 });

      useItems([station(5, 2)]);
      service.blueprintChanged();
      expect(service.metadata.rocketInteriorOrigin).toEqual({ x: 5, y: 5 });

      (service as any).suppressChanges = true; // what undo does
      useItems([station(0, 0)]);
      service.blueprintChanged();
      expect(service.metadata.rocketInteriorOrigin).toEqual({ x: 0, y: 3 });
    });

    it("leaves an origin that did not come from the station where it is", () => {
      useItems([station(0, 0)]);
      service.setRocketInterior("medium", { x: 20, y: -7 });

      useItems([station(5, 2)]);
      service.blueprintChanged();
      expect(service.metadata.rocketInteriorOrigin).toEqual({ x: 20, y: -7 });
    });

    it("keeps a drawn hull on its walls when its station moves, even from the template's spot", () => {
      tilesAreWalls();
      // On the floor where the template puts it: station and walls agree.
      useItems([...mediumWalls(), station(10, 7)]);
      service.setRocketInterior("medium");
      expect(service.metadata.rocketInteriorOrigin).toEqual({ x: 10, y: 10 });

      useItems([...mediumWalls(), station(12, 7)]);
      service.blueprintChanged();
      expect(service.metadata.rocketInteriorOrigin).toEqual({ x: 10, y: 10 });
    });

    it("puts a picked module on a hull drawn out of tiles", () => {
      tilesAreWalls();
      // Station on the ceiling rather than the floor.
      useItems([...mediumWalls(), station(10, 14)]);

      service.setRocketInterior("medium");

      expect(service.metadata.rocketInteriorOrigin).toEqual({ x: 10, y: 10 });
    });
  });

  describe("reset()", () => {
    it("clears everything that belongs to the open blueprint", async () => {
      await service.openBlueprintFromShareString(
        JSON.stringify({ friendlyname: "Imported", buildings: [] }),
      );
      service.id = "some-id";
      service.myRating = 4;
      service.rating = 4.5;
      service.nbRatings = 7;
      service.metadata = { description: "existing" };
      service.serverHasRawSource = true;
      service.requiredDlcs = ["DLC2_ID"];

      service.reset();

      expect(service.id).toBeNull();
      expect(service.myRating).toBeNull();
      expect(service.rating).toBe(0);
      expect(service.nbRatings).toBe(0);
      expect(service.metadata).toEqual({});
      expect(service.requiredDlcs).toBeNull();
      expect(service.rawSource).toBeNull();
      expect(service.getValidRawSource()).toBeNull();
      expect(service.serverHasRawSource).toBe(false);
    });
  });

  describe("subscribeBlueprintChanged / unsubscribeBlueprintChanged", () => {
    it("stops notifying an observer once it unsubscribes", () => {
      const obs = { blueprintChanged: vi.fn() };
      service.subscribeBlueprintChanged(obs);
      service.unsubscribeBlueprintChanged(obs);
      service.newBlueprint();
      expect(obs.blueprintChanged).not.toHaveBeenCalled();
    });

    // indexOf is -1 for a stranger, and splice(-1, 1) would quietly drop the
    // last observer instead
    it("keeps the others subscribed when unsubscribing one that was never added", () => {
      const obs = { blueprintChanged: vi.fn() };
      service.subscribeBlueprintChanged(obs);
      service.unsubscribeBlueprintChanged({ blueprintChanged: vi.fn() });
      service.newBlueprint();
      expect(obs.blueprintChanged).toHaveBeenCalled();
    });
  });

  describe("blueprintChanged()", () => {
    it("starts with one undo state after construction", () => {
      expect(service.undoStates.length).toBe(1);
      expect(service.undoIndex).toBe(0);
    });

    it("pushes a new snapshot and moves undoIndex onto it", () => {
      service.blueprintChanged();
      expect(service.undoStates.length).toBe(2);
      expect(service.undoIndex).toBe(1);
    });

    it("does nothing when suppressChanges is true", () => {
      const before = service.undoStates.length;
      service.suppressChanges = true;
      service.blueprintChanged();
      expect(service.undoStates.length).toBe(before);
    });

    // Once the clean state falls off the stack, undoing all the way back no
    // longer lands on anything that matches the server
    it("caps history at 50 states, after which nothing on it is clean", () => {
      for (let i = 0; i < 60; i++) service.blueprintChanged();
      expect(service.undoStates.length).toBe(50);

      for (let i = 0; i < 49; i++) service.undo();
      expect(service.undoIndex).toBe(0);
      expect(service.isDirty).toBe(true);
    });
  });

  describe("undo()", () => {
    it("does nothing when undoIndex is already 0", () => {
      expect(service.undoIndex).toBe(0);
      service.undo();
      expect(service.undoIndex).toBe(0);
    });

    it("decrements undoIndex by 1", () => {
      service.blueprintChanged(); // [0, 1], index 1
      service.undo();
      expect(service.undoIndex).toBe(0);
    });

    it("an edit after an undo is recorded and scraps the redo states", () => {
      service.blueprintChanged(); // [0, 1], index 1
      service.blueprintChanged(); // [0, 1, 2], index 2
      service.undo(); // index 1
      service.blueprintChanged(); // splices state 2, pushes new: [0, 1, new]
      expect(service.undoStates.length).toBe(3);
      expect(service.undoIndex).toBe(2);
      service.redo();
      expect(service.undoIndex).toBe(2);
    });
  });

  describe("redo()", () => {
    it("does nothing when undoIndex is at the last state", () => {
      const before = service.undoIndex;
      service.redo();
      expect(service.undoIndex).toBe(before);
    });

    it("increments undoIndex by 1 after an undo", () => {
      service.blueprintChanged(); // [0, 1], index 1
      service.undo(); // index 0
      service.redo(); // index 1
      expect(service.undoIndex).toBe(1);
    });
  });

  describe("resetUndoStates()", () => {
    it("leaves exactly one clean state, recording changes again", () => {
      service.blueprintChanged();
      service.blueprintChanged();
      service.suppressChanges = true;
      service.resetUndoStates();
      expect(service.suppressChanges).toBe(false);
      expect(service.undoStates.length).toBe(1);
      expect(service.undoIndex).toBe(0);
      expect(service.isDirty).toBe(false);
    });
  });

  describe("setRocketInterior()", () => {
    it("centres an empty blueprint's hull on the viewport, not the world origin", () => {
      // The static camera maps world x = sx/zoom - offset.x and
      // y = offset.y + 1 - sy/zoom; the small hull's centre point is (1, 1),
      // so the origin is the screen centre's cell less (1, 1), rounded. On
      // jsdom's 1024x768 window the centre cell is (10, -4).
      const camera = new CameraService(null);
      camera.makeCurrent();
      camera.setHardZoom(32);
      camera.cameraOffset = new Vector2(6, 7);

      service.newBlueprint();
      service.setRocketInterior("small");
      expect(service.metadata.rocketInterior).toBe("small");
      expect(service.metadata.rocketInteriorOrigin).toEqual({ x: 9, y: -5 });

      service.setRocketInterior(null);
      expect(service.metadata.rocketInteriorOrigin).toBeNull();
    });
  });

  describe("newBlueprint()", () => {
    it("sets name to 'new blueprint'", () => {
      service.newBlueprint();
      expect(service.name).toBe("new blueprint");
    });

    it("moves the URL to /editor (a reload of / would land on discover)", () => {
      service.newBlueprint();
      expect(mockLocation.replaceState).toHaveBeenCalledWith("/editor");
    });

    it("notifies observers with a new Blueprint instance", () => {
      const obs = { blueprintChanged: vi.fn() };
      service.subscribeBlueprintChanged(obs);
      service.newBlueprint();
      expect(obs.blueprintChanged).toHaveBeenCalledWith(expect.any(Blueprint));
    });

    it("resets the undo stack to one state", () => {
      service.blueprintChanged();
      service.blueprintChanged();
      service.newBlueprint();
      expect(service.undoStates.length).toBe(1);
    });

    it("clears id via reset()", () => {
      service.id = "old-id";
      service.newBlueprint();
      expect(service.id).toBeNull();
    });
  });

  describe("handleGetBlueprint()", () => {
    it("does nothing when blueprint is undefined", () => {
      const obs = { blueprintChanged: vi.fn() };
      service.subscribeBlueprintChanged(obs);
      service.handleGetBlueprint(undefined);
      expect(obs.blueprintChanged).not.toHaveBeenCalled();
    });

    it("resets the undo stack to one state after loading", () => {
      service.blueprintChanged();
      service.blueprintChanged();
      service.handleGetBlueprint(new Blueprint());
      expect(service.undoStates.length).toBe(1);
    });
  });

  describe("getBlueprint()", () => {
    it("calls http.get with the correct URL", () => {
      mockHttp.get.mockReturnValue(of({ data: null }));
      service.getBlueprint("test-id").subscribe(() => {});
      expect(mockHttp.get).toHaveBeenCalledWith(
        "/api/getblueprint/test-id",
        {},
      );
    });

    it("sends the auth token when logged in, so owners can open their own drafts", () => {
      mockAuth.isLoggedIn.mockReturnValue(true);
      mockAuth.getToken.mockReturnValue("tok-123");
      mockHttp.get.mockReturnValue(of({ data: null }));
      service.getBlueprint("test-id").subscribe(() => {});
      expect(mockHttp.get).toHaveBeenCalledWith("/api/getblueprint/test-id", {
        headers: { Authorization: "Bearer tok-123" },
      });
    });

    it("maps response fields onto the service when data is present", () => {
      mockHttp.get.mockReturnValue(
        of({
          id: "bp-1",
          name: "My Blueprint",
          nbRatings: 7,
          rating: 4.5,
          myRating: 4,
          data: { blueprintItems: [] },
        }),
      );
      let result: any;
      service.getBlueprint("bp-1").subscribe((bp) => {
        result = bp;
      });
      expect(result).toBeDefined();
      expect(service.id).toBe("bp-1");
      expect(service.name).toBe("My Blueprint");
      expect(service.nbRatings).toBe(7);
      expect(service.rating).toBe(4.5);
      expect(service.myRating).toBe(4);
    });

    // `name` is what a save writes back, so a translated title held there
    // would rewrite the author's own
    it("shows the server's resolved title without ever saving it as the name", () => {
      mockHttp.get.mockReturnValue(
        of({
          id: "bp-1",
          name: "Authored",
          displayName: "Translated",
          data: { blueprintItems: [] },
        }),
      );
      service.getBlueprint("bp-1").subscribe();
      expect(service.name).toBe("Authored");
      expect(service.displayName).toBe("Translated");

      mockHttp.post.mockReturnValue(of({}));
      service.saveBlueprint(true).subscribe();
      expect(mockHttp.post.mock.calls[0][1].name).toBe("Authored");

      // A resolved title belongs to the blueprint it came from
      service.reset();
      expect(service.displayName).toBe("Authored");
    });

    it("returns undefined when response has no data", () => {
      mockHttp.get.mockReturnValue(of({ data: null }));
      let result: any = "sentinel";
      service.getBlueprint("bp-1").subscribe((bp) => {
        result = bp;
      });
      expect(result).toBeUndefined();
    });
  });

  describe("openBlueprintFromId()", () => {
    it("calls replaceState with /b/<id>", () => {
      mockHttp.get.mockReturnValue(
        of({
          id: "test-id",
          name: "Test",
          nbRatings: 0,
          rating: 0,
          myRating: null,
          data: { blueprintItems: [] },
        }),
      );
      service.openBlueprintFromId("test-id");
      expect(mockLocation.replaceState).toHaveBeenCalledWith("/b/test-id");
    });

    it("notifies observers with the loaded blueprint", () => {
      const obs = { blueprintChanged: vi.fn() };
      service.subscribeBlueprintChanged(obs);
      mockHttp.get.mockReturnValue(
        of({
          id: "test-id",
          name: "Test",
          nbRatings: 0,
          rating: 0,
          myRating: null,
          data: { blueprintItems: [] },
        }),
      );
      service.openBlueprintFromId("test-id");
      expect(obs.blueprintChanged).toHaveBeenCalledWith(expect.any(Blueprint));
    });

    it("leaves the open blueprint and its history alone when the fetch fails", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const obs = { blueprintChanged: vi.fn() };
      service.subscribeBlueprintChanged(obs);
      service.id = "open-id";
      service.blueprintChanged();
      mockHttp.get.mockReturnValue(
        throwError(() => new Error("network error")),
      );
      service.openBlueprintFromId("bad-id");
      expect(obs.blueprintChanged).not.toHaveBeenCalled();
      expect(service.id).toBe("open-id");
      expect(service.undoStates.length).toBe(2);
    });
  });

  describe("getBlueprints()", () => {
    beforeEach(() => {
      mockHttp.get.mockReturnValue(of([]));
    });

    it("includes olderthan in the query string", () => {
      const date = new Date(1_000_000);
      service.getBlueprints(date, null, null);
      const url: string = mockHttp.get.mock.calls[0][0];
      expect(url).toContain("olderthan=" + date.getTime());
    });

    it("omits olderthan on the first page (null cursor) so the URL is cacheable", () => {
      service.getBlueprints(null, null, null);
      const url: string = mockHttp.get.mock.calls[0][0];
      expect(url).not.toContain("olderthan");
      expect(url).not.toContain("collapse");
      expect(url).not.toContain("?&");
    });

    it("omits olderthan for count sorts, which paginate via skip", () => {
      service.getBlueprints(
        new Date(1_000_000),
        null,
        null,
        null,
        null,
        "popular",
        10,
      );
      const url: string = mockHttp.get.mock.calls[0][0];
      expect(url).not.toContain("olderthan");
      expect(url).toContain("sort=popular");
      expect(url).toContain("skip=10");
      expect(url).not.toContain("?&");
    });

    it("a name search paginates by skip and never sends the date cursor", () => {
      // Search results are relevance-ordered, so a createdAt cursor would
      // skip and repeat items; the offset is the only valid pagination.
      service.getBlueprints(
        new Date(1_000_000),
        null,
        "spom",
        null,
        null,
        undefined,
        12,
      );
      const url: string = mockHttp.get.mock.calls[0][0];
      expect(url).not.toContain("olderthan");
      expect(url).toContain("filterName=spom");
      expect(url).toContain("skip=12");
    });

    // The server collapses duplicates by default, so only the opt-out is sent
    it("sends its filters, sort and the collapse opt-out as query parameters", () => {
      service.getBlueprints(
        null,
        null,
        "spom",
        "base",
        null,
        "mostForked",
        undefined,
        false,
        null,
        null,
        null,
        null,
        "DLC2_ID",
        false,
      );
      expect(query(mockHttp.get.mock.calls[0][0])).toEqual({
        filterName: "spom",
        category: "base",
        modded: "false",
        excludeDlc: "DLC2_ID",
        sort: "mostForked",
        collapse: "false",
      });
    });

    // General browsing is viewer-independent, so it stays on the anonymous
    // endpoint (edge-cacheable) even for a logged-in reader; only a specific
    // user's list and rated-by-me depend on who is asking.
    it.each([
      { loggedIn: false, userId: null, ratedBy: null, secure: false },
      { loggedIn: true, userId: null, ratedBy: null, secure: false },
      { loggedIn: true, userId: "user123", ratedBy: null, secure: true },
      { loggedIn: true, userId: null, ratedBy: "user123", secure: true },
      { loggedIn: false, userId: "user123", ratedBy: null, secure: false },
      {
        loggedIn: true,
        userId: null,
        ratedBy: null,
        savedBy: "user123",
        secure: true,
      },
    ])(
      "loggedIn=$loggedIn userId=$userId ratedBy=$ratedBy uses the secure endpoint: $secure",
      ({ loggedIn, userId, ratedBy, savedBy, secure }: any) => {
        mockAuth.isLoggedIn.mockReturnValue(loggedIn);
        mockAuth.getToken.mockReturnValue("tok");
        service.getBlueprints(
          new Date(),
          userId,
          null,
          null,
          null,
          undefined,
          undefined,
          null,
          null,
          ratedBy,
          undefined,
          undefined,
          undefined,
          undefined,
          savedBy ?? null,
        );
        const [url, options] = mockHttp.get.mock.calls[0];
        if (savedBy != null) expect(url).toContain("savedBy=" + savedBy);
        if (secure) {
          expect(url.startsWith("/api/getblueprintsSecure?")).toBe(true);
          expect(options).toEqual({
            headers: { Authorization: "Bearer tok" },
          });
        } else {
          expect(url.startsWith("/api/getblueprints?")).toBe(true);
          expect(options).toBeUndefined();
        }
      },
    );
  });

  describe("getBlueprintFacets()", () => {
    beforeEach(() => {
      mockHttp.get.mockReturnValue(of({}));
    });

    // The filter-to-query mapping is the one getBlueprints shares
    it.each([
      [{ filterUserId: "u1" }, { filterUserId: "u1" }],
      [{ filterName: "spom" }, { filterName: "spom" }],
      [{ filterCategory: "base" }, { category: "base" }],
      [{ filterSubcategory: "farm" }, { subcategory: "farm" }],
      // false is a filter of its own (unmodded only), not an absent one
      [{ filterModded: false }, { modded: "false" }],
      [{ filterForkedFrom: "bp1" }, { forkedFrom: "bp1" }],
      [{ filterRatedBy: "u2" }, { ratedBy: "u2" }],
      [{ filterRooms: "Barracks" }, { rooms: "Barracks" }],
      [{ filterDlcs: "EXPANSION1_ID" }, { dlc: "EXPANSION1_ID" }],
      [{ filterExcludeDlcs: "DLC2_ID" }, { excludeDlc: "DLC2_ID" }],
      [
        { filterCategory: "base", filterModded: true },
        { category: "base", modded: "true" },
      ],
    ])("maps %o onto the query %o", (options, expected) => {
      service.getBlueprintFacets(options);
      expect(query(mockHttp.get.mock.calls[0][0])).toEqual(expected);
    });

    it.each([
      {
        loggedIn: true,
        options: { filterUserId: "u1" },
        endpoint: "/api/blueprintfacetsSecure?",
        request: { headers: { Authorization: "Bearer tok" } },
      },
      {
        loggedIn: true,
        options: { filterRatedBy: "u1" },
        endpoint: "/api/blueprintfacetsSecure?",
        request: { headers: { Authorization: "Bearer tok" } },
      },
      {
        loggedIn: true,
        options: { filterCategory: "base" },
        endpoint: "/api/blueprintfacets?",
        request: {},
      },
      {
        loggedIn: false,
        options: { filterUserId: "u1" },
        endpoint: "/api/blueprintfacets?",
        request: {},
      },
    ])(
      "loggedIn=$loggedIn $options goes to $endpoint",
      ({ loggedIn, options, endpoint, request }) => {
        mockAuth.isLoggedIn.mockReturnValue(loggedIn);
        mockAuth.getToken.mockReturnValue("tok");
        service.getBlueprintFacets(options);
        const [url, sent] = mockHttp.get.mock.calls[0];
        expect(url.startsWith(endpoint)).toBe(true);
        expect(sent).toEqual(request);
      },
    );
  });

  // Display reads carry the reader's content language; a file download
  // never does, its bytes are the same for everyone
  describe("content locale", () => {
    beforeEach(() => {
      mockContentLocale.appendToUrl.mockImplementation(
        (url: string) => url + (url.includes("?") ? "&" : "?") + "lang=vi",
      );
    });

    it("asks for the reader's language when opening and listing, not when downloading", () => {
      vi.spyOn(BlueprintService, "saveTextFile").mockImplementation(() => {});
      mockHttp.get.mockReturnValue(of({ data: null, hasRawSource: false }));

      service.getBlueprint("bp1").subscribe();
      service.getBlueprints(null, null, null);
      service.downloadBlueprintFile("bp1", "T").subscribe();

      const urls: string[] = mockHttp.get.mock.calls.map(
        (call: any[]) => call[0],
      );
      expect(urls[0]).toBe("/api/getblueprint/bp1?lang=vi");
      expect(urls[1]).toContain("lang=vi");
      expect(urls.slice(2)).toEqual([
        "/api/getblueprint/bp1",
        "/api/getblueprintmod/bp1",
      ]);
    });
  });

  describe("deleteBlueprint()", () => {
    it("calls http.post with the correct URL and body", () => {
      mockHttp.post.mockReturnValue(of({}));
      service.deleteBlueprint("bp-to-delete").subscribe(() => {});
      expect(mockHttp.post).toHaveBeenCalledWith(
        "/api/deleteblueprint",
        { blueprintId: "bp-to-delete" },
        expect.any(Object),
      );
    });

    it("never mutates service.id, even if the response carries one", () => {
      service.id = "original-id";
      mockHttp.post.mockReturnValue(of({ id: "deleted-id" }));
      service.deleteBlueprint("bp-1").subscribe(() => {});
      expect(service.id).toBe("original-id");
    });
  });

  describe("saveBlueprint()", () => {
    it("calls http.post with the uploadblueprint URL", () => {
      mockHttp.post.mockReturnValue(of({}));
      service.saveBlueprint(false).subscribe(() => {});
      expect(mockHttp.post).toHaveBeenCalledWith(
        "/api/uploadblueprint",
        expect.any(Object),
        expect.any(Object),
      );
    });

    it("sets service.id and calls replaceState when response has id", () => {
      mockHttp.post.mockReturnValue(of({ id: "new-saved-id" }));
      service.saveBlueprint(true).subscribe(() => {});
      expect(service.id).toBe("new-saved-id");
      expect(mockLocation.replaceState).toHaveBeenCalledWith("/b/new-saved-id");
    });

    it("passes overwrite flag in the request body", () => {
      mockHttp.post.mockReturnValue(of({}));
      service.saveBlueprint(true).subscribe(() => {});
      const body = mockHttp.post.mock.calls[0][1];
      expect(body.overwrite).toBe(true);
    });

    it("sends sourceBlueprintId when the editor started from an existing blueprint", () => {
      service.id = "source-bp-id";
      mockHttp.post.mockReturnValue(of({ id: "copy-id" }));
      service.saveBlueprint(false).subscribe(() => {});
      const body = mockHttp.post.mock.calls[0][1];
      expect(body.sourceBlueprintId).toBe("source-bp-id");
    });

    it("omits sourceBlueprintId for a brand-new blueprint", () => {
      service.id = null;
      mockHttp.post.mockReturnValue(of({}));
      service.saveBlueprint(false).subscribe(() => {});
      const body = mockHttp.post.mock.calls[0][1];
      expect(body.sourceBlueprintId).toBeUndefined();
    });

    it("sends the metadata and a publish request with the save", () => {
      service.metadata = {
        category: "base",
        description: "Feeds four generators.",
        rocketInterior: "small",
      };
      mockHttp.post.mockReturnValue(of({ id: "bp-1" }));
      service.saveBlueprint(false, true).subscribe();
      expect(mockHttp.post.mock.calls[0][1]).toMatchObject({
        category: "base",
        description: "Feeds four generators.",
        rocketInterior: "small",
        publish: true,
      });
      expect(service.isPublished).toBe(true);
    });

    // No publish flag keeps whatever the server has; a brand-new blueprint
    // starts there as a draft
    it("starts a first save as a draft and leaves a later save's publish state alone", () => {
      mockHttp.post.mockReturnValue(of({ id: "bp-1" }));
      service.saveBlueprint(false).subscribe();
      expect(mockHttp.post.mock.calls[0][1].publish).toBeUndefined();
      expect(service.isPublished).toBe(false);

      service.isPublished = true;
      service.saveBlueprint(true).subscribe();
      expect(service.isPublished).toBe(true);
    });
  });

  describe("rateBlueprint()", () => {
    beforeEach(() => {
      mockHttp.post.mockReturnValue(
        of({ nbRatings: 3, rating: 4, myRating: 5 }),
      );
    });

    it("calls http.post with the rateblueprint endpoint and correct body", () => {
      service.rateBlueprint("bp-1", 5).subscribe();
      expect(mockHttp.post).toHaveBeenCalledWith(
        "/api/rateblueprint",
        { blueprintId: "bp-1", rating: 5 },
        expect.any(Object),
      );
    });
  });

  describe("trackDownload()", () => {
    it("posts the download beacon anonymously when logged out", () => {
      mockHttp.post.mockReturnValue(of({}));
      service.trackDownload("bp-1");
      expect(mockHttp.post).toHaveBeenCalledWith(
        "/api/blueprints/bp-1/downloads",
        {},
        {},
      );
    });

    it("sends the auth token when logged in", () => {
      mockAuth.isLoggedIn.mockReturnValue(true);
      mockAuth.getToken.mockReturnValue("tok");
      mockHttp.post.mockReturnValue(of({}));
      service.trackDownload("bp-1");
      expect(mockHttp.post).toHaveBeenCalledWith(
        "/api/blueprints/bp-1/downloads",
        {},
        { headers: { Authorization: "Bearer tok" } },
      );
    });

    // An error nobody handles is rethrown by rxjs from a timer, not here
    it("swallows beacon errors silently", async () => {
      const previous = config.onUnhandledError;
      const onUnhandledError = vi.fn();
      config.onUnhandledError = onUnhandledError;
      try {
        mockHttp.post.mockReturnValue(throwError(() => new Error("boom")));
        service.trackDownload("bp-1");
        await new Promise((resolve) => setTimeout(resolve));
        expect(onUnhandledError).not.toHaveBeenCalled();
      } finally {
        config.onUnhandledError = previous;
      }
    });
  });

  describe("openBlueprintFromUpload()", () => {
    // The browser's FileReader, standing in for one; the test fires onloadend.
    const stubFileReader = (result: string | ArrayBuffer) => {
      const reader = {
        readAsText: vi.fn(),
        readAsArrayBuffer: vi.fn(),
        onloadend: null as null | (() => void),
        result,
      };
      const FileReaderStub = vi.fn(() => reader);
      vi.stubGlobal("FileReader", FileReaderStub);
      return { reader, FileReaderStub };
    };
    const upload = (fileType: BlueprintFileType) =>
      service.openBlueprintFromUpload(fileType, {
        length: 1,
        0: {} as File,
      } as any);

    const NAMED_FILES = [
      {
        format: "YAML",
        type: BlueprintFileType.YAML,
        result: "name: Uploaded\nbuildings: []\ncells: []",
      },
      {
        format: "JSON",
        type: BlueprintFileType.JSON,
        result: JSON.stringify({
          friendlyname: "Uploaded",
          buildings: [],
          digcommands: [],
        }),
      },
    ];

    it("does nothing when fileList is empty", () => {
      const { FileReaderStub } = stubFileReader("");
      service.openBlueprintFromUpload(BlueprintFileType.YAML, {
        length: 0,
      } as any);
      expect(FileReaderStub).not.toHaveBeenCalled();
    });

    it.each(NAMED_FILES)(
      "opens an uploaded $format file as the open blueprint",
      async ({ type, result }) => {
        const obs = { blueprintChanged: vi.fn() };
        service.subscribeBlueprintChanged(obs);
        const { reader } = stubFileReader(result);

        upload(type);
        reader.onloadend!();

        await vi.waitFor(() =>
          expect(obs.blueprintChanged).toHaveBeenCalledWith(
            expect.any(Blueprint),
          ),
        );
        expect(service.name).toBe("Uploaded");
      },
    );

    // The file arrives after the click, and the canvas taking it in is a
    // change of its own (component-canvas loadNewBlueprint ->
    // destroyAndCopyItems, wired up here since this spec has no canvas). The
    // undo stack must be reset once it is in, or Ctrl+Z steps back into
    // whatever was open before the upload.
    it.each([
      ...NAMED_FILES,
      {
        format: "BSON",
        type: BlueprintFileType.BSON,
        // An empty name and no buildings
        result: new Uint8Array([0, 0, 0, 0, 0]).buffer,
      },
    ])(
      "leaves nothing to undo once an uploaded $format file has loaded",
      async ({ type, result }) => {
        const loaded = vi.fn();
        service.subscribeBlueprintChanged({
          blueprintChanged: (blueprint) => {
            service.blueprint.destroyAndCopyItems(blueprint);
            loaded();
          },
        });
        const { reader } = stubFileReader(result);

        upload(type);
        reader.onloadend!();

        await vi.waitFor(() => expect(loaded).toHaveBeenCalled());
        await Promise.resolve();
        expect(service.undoStates).toHaveLength(1);
        expect(service.isDirty).toBe(false);
      },
    );

    it("asks before an upload or a paste replaces unsaved work, and keeps it on No", async () => {
      edit();
      service.blueprint.blueprintItems.push({} as any);
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
      const { FileReaderStub } = stubFileReader("");

      upload(BlueprintFileType.JSON);
      await service.openBlueprintFromShareString(
        JSON.stringify({ friendlyname: "Pasted", buildings: [] }),
      );

      expect(confirm).toHaveBeenCalledTimes(2);
      expect(FileReaderStub).not.toHaveBeenCalled();
      expect(service.rawSource).toBeNull();
      expect(service.isDirty).toBe(true);
    });
  });

  describe("BlueprintsV2 raw source round-trip", () => {
    const BNI_JSON = JSON.stringify({
      blueprintVersion: 3,
      friendlyname: "Imported",
      userdesc: "a description from the mod",
      buildings: [],
      digcommands: [],
    });

    it("keeps the verbatim import text and format after a JSON import", async () => {
      await service.openBlueprintFromShareString(BNI_JSON);
      expect(service.rawSource).toBe(BNI_JSON);
      expect(service.rawSourceFormat).toBe("bpv2-json");
    });

    it("prefills metadata.description from userdesc", async () => {
      await service.openBlueprintFromShareString(BNI_JSON);
      expect(service.metadata.description).toBe("a description from the mod");
    });

    it("leaves the current session state untouched when the paste is invalid", async () => {
      service.id = "open-blueprint";
      service.metadata = { description: "existing" };
      await expect(
        service.openBlueprintFromShareString("not a blueprint at all"),
      ).rejects.toThrow();
      expect(service.id).toBe("open-blueprint");
      expect(service.metadata.description).toBe("existing");
    });

    it("notifies import-error observers when a file upload fails to parse", async () => {
      const onError = vi.fn();
      service.subscribeImportError(onError);
      const reader = {
        readAsText: vi.fn(),
        onloadend: null as null | (() => void),
        result: "garbage that is not a blueprint",
      };
      vi.stubGlobal(
        "FileReader",
        vi.fn(() => reader),
      );
      service.openBlueprintFromUpload(BlueprintFileType.JSON, {
        length: 1,
        0: {} as File,
      } as any);
      reader.onloadend!();
      await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    });

    it("getValidRawSource returns the import while content is unedited", async () => {
      await service.openBlueprintFromShareString(BNI_JSON);
      expect(service.getValidRawSource()).toEqual({
        text: BNI_JSON,
        format: "bpv2-json",
      });
    });

    it("getValidRawSource returns null once the blueprint diverges", async () => {
      await service.openBlueprintFromShareString(BNI_JSON);
      vi.spyOn(service.blueprint, "toMdbBlueprint").mockReturnValue({
        blueprintItems: [{ id: "Tile" }],
      } as any);
      expect(service.getValidRawSource()).toBeNull();
    });

    it("getValidRawSource returns null when nothing was imported", () => {
      expect(service.getValidRawSource()).toBeNull();
    });

    // Regression for spec/element-notes.md §1.2 / blueprintsv2-followups.md
    // item 1: world notes now flow through toMdbBlueprint, so editing one
    // correctly detaches the byte-exact raw source (it previously did not).
    // The real app applies an import onto the live blueprint via
    // component-canvas's loadNewBlueprint -> destroyAndCopyItems; reproduce
    // that here since this spec has no canvas subscriber wired up.
    it("editing a world note invalidates the held raw source", async () => {
      service.subscribeBlueprintChanged({
        blueprintChanged: (blueprint) =>
          service.blueprint.destroyAndCopyItems(blueprint),
      });
      const bniWithNote = JSON.stringify({
        blueprintVersion: 3,
        friendlyname: "Imported",
        buildings: [],
        digcommands: [],
        worldNotes: [{ x: 0, y: 0, type: 1, id: 1, mass: 100, temp: 300 }],
      });
      await service.openBlueprintFromShareString(bniWithNote);
      expect(service.blueprint.worldNotes).toHaveLength(1);
      expect(service.getValidRawSource()).not.toBeNull();

      service.blueprint.worldNotes[0].mass = 200;
      expect(service.getValidRawSource()).toBeNull();
    });

    it("saveBlueprint sends rawSource only while the import is unedited", async () => {
      mockAuth.isLoggedIn.mockReturnValue(true);
      mockHttp.post.mockReturnValue(of({ id: "new-id" }));
      await service.openBlueprintFromShareString(BNI_JSON);

      service.saveBlueprint(false).subscribe();
      const body = mockHttp.post.mock.calls[0][1];
      expect(body.rawSource).toBe(BNI_JSON);
      expect(body.rawSourceFormat).toBe("bpv2-json");
      expect(service.serverHasRawSource).toBe(true);
    });

    it("saveBlueprint omits rawSource for edited content", async () => {
      mockAuth.isLoggedIn.mockReturnValue(true);
      mockHttp.post.mockReturnValue(of({ id: "new-id" }));
      await service.openBlueprintFromShareString(BNI_JSON);
      vi.spyOn(service.blueprint, "toMdbBlueprint").mockReturnValue({
        blueprintItems: [{ id: "Tile" }],
      } as any);

      service.saveBlueprint(false).subscribe();
      const body = mockHttp.post.mock.calls[0][1];
      expect(body.rawSource).toBeUndefined();
      expect(body.rawSourceFormat).toBeUndefined();
      expect(service.serverHasRawSource).toBe(false);
    });
  });

  describe("downloadBlueprintFile()", () => {
    it("serves the server's raw copy byte-exact when available", () => {
      const saveSpy = vi
        .spyOn(BlueprintService, "saveTextFile")
        .mockImplementation(() => {});
      mockHttp.get.mockImplementation((url: string) =>
        url.endsWith("/raw")
          ? of("RAW-TEXT")
          : of({ hasRawSource: true, rawSourceFormat: "bpv2-json" }),
      );

      service.downloadBlueprintFile("bp1", "My Blueprint").subscribe();

      expect(mockHttp.get).toHaveBeenCalledWith("/api/blueprints/bp1/raw", {
        responseType: "text",
      });
      expect(saveSpy).toHaveBeenCalledWith(
        "RAW-TEXT",
        "My Blueprint.blueprint",
      );
      // The raw endpoint records the download server-side — no beacon
      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it("uses a .txt extension for share-string raws", () => {
      const saveSpy = vi
        .spyOn(BlueprintService, "saveTextFile")
        .mockImplementation(() => {});
      mockHttp.get.mockImplementation((url: string) =>
        url.endsWith("/raw")
          ? of("SHARE-STRING")
          : of({ hasRawSource: true, rawSourceFormat: "bpv2-sharestring" }),
      );

      service.downloadBlueprintFile("bp1", "My Blueprint").subscribe();

      expect(saveSpy).toHaveBeenCalledWith("SHARE-STRING", "My Blueprint.txt");
    });

    it("falls back to the server-generated file when the raw fetch fails", () => {
      const saveSpy = vi
        .spyOn(BlueprintService, "saveTextFile")
        .mockImplementation(() => {});
      mockHttp.get.mockImplementation((url: string) => {
        if (url.endsWith("/raw")) return throwError(() => new Error("404"));
        if (url.startsWith("/api/getblueprintmod/")) return of("SERVER-FILE");
        return of({ hasRawSource: true, rawSourceFormat: "bpv2-json" });
      });

      service.downloadBlueprintFile("bp1", "My Blueprint").subscribe();

      expect(saveSpy).toHaveBeenCalledWith(
        "SERVER-FILE",
        "My Blueprint.blueprint",
      );
      // The mod endpoint records the download server-side — no beacon
      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    // The details page never loads the game database, so a file generated
    // there has every building skipped as unknown: it downloaded with an
    // empty `buildings` array. The stored data here has a building on
    // purpose — an empty fixture is what let that through.
    it("saves the server-generated file, never one built from the parsed data", () => {
      const saveSpy = vi
        .spyOn(BlueprintService, "saveTextFile")
        .mockImplementation(() => {});
      const serverFile = JSON.stringify({
        friendlyname: "My Blueprint",
        buildings: [{ buildingdef: "Tile", offset: { x: 0, y: 0 } }],
        digcommands: [],
      });
      mockHttp.get.mockImplementation((url: string) =>
        url.startsWith("/api/getblueprintmod/")
          ? of(serverFile)
          : of({
              hasRawSource: false,
              data: {
                blueprintItems: [{ id: "Tile", position: { x: 0, y: 0 } }],
              },
            }),
      );

      service.downloadBlueprintFile("bp1", "My Blueprint").subscribe();

      expect(mockHttp.get).toHaveBeenCalledWith("/api/getblueprintmod/bp1", {
        responseType: "text",
      });
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy).toHaveBeenCalledWith(
        serverFile,
        "My Blueprint.blueprint",
      );
      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it("sends the token to the server-generated download so an owner's draft resolves", () => {
      vi.spyOn(BlueprintService, "saveTextFile").mockImplementation(() => {});
      mockAuth.isLoggedIn.mockReturnValue(true);
      mockAuth.getToken.mockReturnValue("TOKEN");
      mockHttp.get.mockImplementation((url: string) =>
        url.startsWith("/api/getblueprintmod/")
          ? of("SERVER-FILE")
          : of({ hasRawSource: false }),
      );

      service.downloadBlueprintFile("bp1", "My Blueprint").subscribe();

      expect(mockHttp.get).toHaveBeenCalledWith("/api/getblueprintmod/bp1", {
        headers: { Authorization: "Bearer TOKEN" },
        responseType: "text",
      });
    });
  });

  describe("exportBlueprintFile()", () => {
    it("serves the held raw import when the blueprint is unedited", async () => {
      const saveSpy = vi
        .spyOn(BlueprintService, "saveTextFile")
        .mockImplementation(() => {});
      const json = JSON.stringify({ friendlyname: "T", buildings: [] });
      await service.openBlueprintFromShareString(json);

      service.exportBlueprintFile("T");

      expect(saveSpy).toHaveBeenCalledWith(json, "T.blueprint");
    });

    it("generates from the parsed model when there is no raw", () => {
      const saveSpy = vi
        .spyOn(BlueprintService, "saveTextFile")
        .mockImplementation(() => {});

      service.exportBlueprintFile("Fresh");

      expect(saveSpy).toHaveBeenCalledWith(
        expect.stringContaining("friendlyname"),
        "Fresh.blueprint",
      );
    });

    // The mod's blueprint list shows userdesc under the name.
    it("writes the site description into a generated file as userdesc", () => {
      const saveSpy = vi
        .spyOn(BlueprintService, "saveTextFile")
        .mockImplementation(() => {});
      service.metadata = { description: "Feeds four generators." };

      service.exportBlueprintFile("Described");

      const written = JSON.parse(saveSpy.mock.calls[0][0]);
      expect(written.userdesc).toBe("Feeds four generators.");
      expect(written.blueprintVersion).toBe(3);
    });

    it("writes no userdesc for a blueprint with no description", () => {
      const saveSpy = vi
        .spyOn(BlueprintService, "saveTextFile")
        .mockImplementation(() => {});

      service.exportBlueprintFile("Plain");

      expect(JSON.parse(saveSpy.mock.calls[0][0])).not.toHaveProperty(
        "userdesc",
      );
    });
  });

  describe("copyBlueprintShareString()", () => {
    let writeText: any;

    const setClipboard = (impl: any) => {
      writeText = impl;
      Object.defineProperty(navigator, "clipboard", {
        value: impl == null ? undefined : { writeText: impl },
        configurable: true,
      });
    };

    afterEach(() => {
      setClipboard(undefined);
    });

    it("writes a share string the import path can read back", async () => {
      setClipboard(vi.fn(async () => {}));

      await service.copyBlueprintShareString("Round Trip");

      const written = writeText.mock.calls[0][0];
      expect(typeof written).toBe("string");
      expect(JSON.parse(await decodeBniShareString(written)).friendlyname).toBe(
        "Round Trip",
      );
    });

    // Renaming does not invalidate rawSource (the freshness check compares
    // toMdbBlueprint(), which carries no name), so serving the held raw text
    // would paste the old name back into the game.
    it("regenerates rather than serving the held raw import", async () => {
      setClipboard(vi.fn(async () => {}));
      await service.openBlueprintFromShareString(
        JSON.stringify({ friendlyname: "Old Name", buildings: [] }),
      );

      await service.copyBlueprintShareString("New Name");

      const written = writeText.mock.calls[0][0];
      expect(JSON.parse(await decodeBniShareString(written)).friendlyname).toBe(
        "New Name",
      );
    });

    // Safari only honours a clipboard write started inside the user gesture,
    // so where write()/ClipboardItem exist the still-pending encode promise is
    // handed over rather than awaited first.
    it("hands write() a promise-backed ClipboardItem when supported", async () => {
      const captured: any[] = [];
      vi.stubGlobal(
        "ClipboardItem",
        class {
          constructor(public items: Record<string, Promise<Blob>>) {
            captured.push(items);
          }
        },
      );
      const write = vi.fn(async () => {});
      const writeTextSpy = vi.fn(async (_text: string) => {});
      Object.defineProperty(navigator, "clipboard", {
        value: { write, writeText: writeTextSpy },
        configurable: true,
      });

      await service.copyBlueprintShareString("Gesture");

      expect(write).toHaveBeenCalled();
      expect(writeTextSpy).not.toHaveBeenCalled();
      const blob = await captured[0]["text/plain"];
      const decoded = await decodeBniShareString(await blob.text());
      expect(JSON.parse(decoded).friendlyname).toBe("Gesture");
    });

    it("falls back to writeText when write() rejects", async () => {
      vi.stubGlobal(
        "ClipboardItem",
        class {
          constructor(public items: any) {}
        },
      );
      const write = vi.fn(async () => {
        throw new Error("promise-backed items unsupported");
      });
      const writeTextSpy = vi.fn(async (_text: string) => {});
      Object.defineProperty(navigator, "clipboard", {
        value: { write, writeText: writeTextSpy },
        configurable: true,
      });

      await service.copyBlueprintShareString("Fallback");

      expect(writeTextSpy).toHaveBeenCalled();
      const decoded = await decodeBniShareString(writeTextSpy.mock.calls[0][0]);
      expect(JSON.parse(decoded).friendlyname).toBe("Fallback");
    });

    // The beacon must credit the blueprint that was serialized, not whatever
    // is open by the time the async clipboard write resolves.
    it("counts the download against the blueprint that was copied", async () => {
      setClipboard(vi.fn(async () => {}));
      mockHttp.post.mockReturnValue(of({}));
      service.id = "original";

      const pending = service.copyBlueprintShareString("T");
      service.id = "opened-something-else";
      await pending;

      expect(mockHttp.post).toHaveBeenCalledWith(
        "/api/blueprints/original/downloads",
        {},
        expect.anything(),
      );
    });

    it("rejects when the clipboard API is unavailable", async () => {
      setClipboard(undefined);

      await expect(service.copyBlueprintShareString("T")).rejects.toThrow();
    });

    it("does not count a download when the blueprint is unsaved", async () => {
      setClipboard(vi.fn(async () => {}));

      await service.copyBlueprintShareString("T");

      expect(mockHttp.post).not.toHaveBeenCalled();
    });
  });
  // The details page's "Copy for game": a saved blueprint as a share-string,
  // without opening it in the editor.
  describe("copySavedBlueprintShareString()", () => {
    let writeText: any;

    const setClipboard = (impl: any) => {
      writeText = impl;
      Object.defineProperty(navigator, "clipboard", {
        value: impl == null ? undefined : { writeText: impl },
        configurable: true,
      });
    };

    afterEach(() => {
      setClipboard(undefined);
    });

    it("serves a stored share-string verbatim", async () => {
      setClipboard(vi.fn(async () => {}));
      mockHttp.get.mockImplementation((url: string) =>
        url.endsWith("/raw")
          ? of("STORED-SHARE-STRING")
          : of({ hasRawSource: true, rawSourceFormat: "bpv2-sharestring" }),
      );

      await service.copySavedBlueprintShareString("bp1");

      expect(writeText).toHaveBeenCalledWith("STORED-SHARE-STRING");
      // The raw endpoint records the download server-side -- no beacon
      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it("encodes a stored .blueprint file's exact text, not a regenerated one", async () => {
      setClipboard(vi.fn(async () => {}));
      // Contains a building the site would strip and formatting it would not keep.
      const rawFile =
        '{ "friendlyname": "In-game name",\n  "buildings": [{"buildingdef":"SomeModdedThing","offset":{"x":1,"y":2}}] }';
      mockHttp.get.mockImplementation((url: string) =>
        url.endsWith("/raw")
          ? of(rawFile)
          : of({ hasRawSource: true, rawSourceFormat: "bpv2-json" }),
      );

      await service.copySavedBlueprintShareString("bp1");

      const written = writeText.mock.calls[0][0];
      expect(await decodeBniShareString(written)).toBe(rawFile);
      expect(written).toBe(await encodeBniShareString(rawFile));
      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    // Same trap as downloadBlueprintFile: the details page has no game
    // database, so a string built there from the stored data holds no
    // buildings. The stored data has one on purpose.
    it("encodes the server-generated file when there is no raw copy, never one built from the parsed data", async () => {
      setClipboard(vi.fn(async () => {}));
      const serverFile = JSON.stringify({
        friendlyname: "Stored name",
        buildings: [{ buildingdef: "Tile", offset: { x: 0, y: 0 } }],
        digcommands: [],
      });
      mockHttp.get.mockImplementation((url: string) =>
        url.startsWith("/api/getblueprintmod/")
          ? of(serverFile)
          : of({
              hasRawSource: false,
              data: {
                blueprintItems: [{ id: "Tile", position: { x: 0, y: 0 } }],
              },
            }),
      );

      await service.copySavedBlueprintShareString("bp1");

      expect(mockHttp.get).toHaveBeenCalledWith("/api/getblueprintmod/bp1", {
        responseType: "text",
      });
      const written = writeText.mock.calls[0][0];
      expect(await decodeBniShareString(written)).toBe(serverFile);
      // The mod endpoint records the download server-side -- no beacon
      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it("falls back to the server-generated file when the raw copy has vanished", async () => {
      setClipboard(vi.fn(async () => {}));
      mockHttp.get.mockImplementation((url: string) => {
        if (url.endsWith("/raw")) return throwError(() => new Error("404"));
        if (url.startsWith("/api/getblueprintmod/")) return of("SERVER-FILE");
        return of({ hasRawSource: true, rawSourceFormat: "bpv2-json" });
      });

      await service.copySavedBlueprintShareString("bp1");

      const written = writeText.mock.calls[0][0];
      expect(await decodeBniShareString(written)).toBe("SERVER-FILE");
      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it("sends the auth token so an owner can copy their own draft", async () => {
      setClipboard(vi.fn(async () => {}));
      mockAuth.isLoggedIn.mockReturnValue(true);
      mockAuth.getToken.mockReturnValue("tok");
      mockHttp.get.mockImplementation((url: string) =>
        url.startsWith("/api/getblueprintmod/")
          ? of("SERVER-FILE")
          : of({ hasRawSource: false }),
      );

      await service.copySavedBlueprintShareString("bp1");

      expect(mockHttp.get).toHaveBeenCalledWith("/api/getblueprint/bp1", {
        headers: { Authorization: "Bearer tok" },
      });
      expect(mockHttp.get).toHaveBeenCalledWith("/api/getblueprintmod/bp1", {
        headers: { Authorization: "Bearer tok" },
        responseType: "text",
      });
    });

    it("rejects without fetching anything when the clipboard API is unavailable", async () => {
      setClipboard(undefined);

      await expect(
        service.copySavedBlueprintShareString("bp1"),
      ).rejects.toThrow();
      expect(mockHttp.get).not.toHaveBeenCalled();
    });

    it("rejects, and counts nothing, when the blueprint cannot be fetched", async () => {
      setClipboard(vi.fn(async () => {}));
      mockHttp.get.mockReturnValue(throwError(() => new Error("403")));

      await expect(
        service.copySavedBlueprintShareString("bp1"),
      ).rejects.toThrow();
      expect(writeText).not.toHaveBeenCalled();
      expect(mockHttp.post).not.toHaveBeenCalled();
    });
  });
});
