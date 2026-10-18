import { TestBed } from "@angular/core/testing";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";

import { GameStringService } from "./game-string-service";

const STRINGS_FILE = "assets/strings/strings.json";

describe("GameStringService", () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        GameStringService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    const service = TestBed.inject(GameStringService);
    httpMock = TestBed.inject(HttpTestingController);
    return service;
  }

  afterEach(() => {
    httpMock?.verify();
  });

  describe("getStr", () => {
    it("returns the value for a known key", async () => {
      const service = setup();
      httpMock.expectOne(STRINGS_FILE).flush({ GREETING: "Hi" });
      expect(await service.getStr("GREETING")).toBe("Hi");
    });

    it("returns undefined for an unknown key", async () => {
      const service = setup();
      httpMock.expectOne(STRINGS_FILE).flush({ KNOWN: "Hi" });
      expect(await service.getStr("MISSING")).toBeUndefined();
    });

    it("populates the public dict after the file loads", async () => {
      const service = setup();
      httpMock.expectOne(STRINGS_FILE).flush({ KEY: "Hi" });
      await service.getStr("KEY");
      expect(service.dict["KEY"]).toBe("Hi");
    });
  });

  describe("getStrOr", () => {
    it("prefers the game string when the key resolves", async () => {
      const service = setup();
      httpMock.expectOne(STRINGS_FILE).flush({ GREETING: "Hi" });
      expect(await service.getStrOr("GREETING", "fallback")).toBe("Hi");
    });

    // The modded-building case. strings.json comes from Klei's po_string.json, which no
    // mod writes into, so every modded prefab misses its key. Without a fallback the
    // caller assigned `undefined` over a perfectly good catalogue name.
    it("falls back to the catalogue name when the key is missing", async () => {
      const service = setup();
      httpMock.expectOne(STRINGS_FILE).flush({ KNOWN: "Hi" });
      expect(await service.getStrOr("ABSENT", "SolidSplitter Mk.II")).toBe(
        "SolidSplitter Mk.II",
      );
    });

    // Catalogue names keep their Klei rich-text wrappers, so an unstripped fallback
    // would put the raw markup on screen.
    it("strips markup from the fallback", async () => {
      const service = setup();
      httpMock.expectOne(STRINGS_FILE).flush({});
      expect(
        await service.getStrOr(
          "STRINGS.BUILDINGS.PREFABS.MJSPLITTERMKIISOLID.NAME",
          '<link="MJSPLITTERMKIISOLID">SolidSplitter Mk.II</link>',
        ),
      ).toBe("SolidSplitter Mk.II");
    });

    it("falls back when the key resolves to an empty string", async () => {
      const service = setup();
      httpMock.expectOne(STRINGS_FILE).flush({ EMPTY: "" });
      expect(await service.getStrOr("EMPTY", "Drain")).toBe("Drain");
    });
  });

  describe("markup stripping", () => {
    async function strip(rawValue: string): Promise<string> {
      const service = setup();
      httpMock.expectOne(STRINGS_FILE).flush({ K: rawValue });
      return service.getStr("K");
    }

    it.each([
      ["<color=#FF0000>Red</color>", "Red"],
      ["<size=20>Big</size>", "Big"],
      ["<style=KExpBld>Styled</style>", "Styled"],
      ["<smallcaps>caps</smallcaps>", "caps"],
      ['<link="x">Linked</link>', "Linked"],
      ["<alpha=#80>Faint</color>", "Faint"],
      ["<indent=#5>Indented</indent>", "Indented"],
      ["Has <b>bold</b> and <i>italic</i> words", "Has bold and italic words"],
      ["Plain text", "Plain text"],
    ])("strips %s to %s", async (raw, expected) => {
      expect(await strip(raw)).toBe(expected);
    });

    // Room criteria list several linked buildings in one string
    it("strips every occurrence of a tag, not just the first", async () => {
      expect(
        await strip(
          'Two or more <link="POWER">Power Buildings</link> and a <link="WIRE">Wire</link>',
        ),
      ).toBe("Two or more Power Buildings and a Wire");
    });
  });
});
