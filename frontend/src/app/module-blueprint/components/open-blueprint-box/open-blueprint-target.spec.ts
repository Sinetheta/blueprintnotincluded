import { resolveOpenBlueprintTarget } from "./open-blueprint-target";

describe("resolveOpenBlueprintTarget", () => {
  const id = "6ad640cb4fc40c07504b2725";

  it("ignores empty input", () => {
    expect(resolveOpenBlueprintTarget("")).toBeNull();
    expect(resolveOpenBlueprintTarget("   \n")).toBeNull();
  });

  it("takes a bare id", () => {
    expect(resolveOpenBlueprintTarget(` ${id} `)).toEqual({
      kind: "saved",
      id,
    });
    expect(resolveOpenBlueprintTarget(id.toUpperCase())).toEqual({
      kind: "saved",
      id,
    });
  });

  it("reads the id out of the site's own links and paths", () => {
    for (const link of [
      `https://blueprintnotincluded.org/b/${id}`,
      `https://blueprintnotincluded.org/blueprint/${id}#comments`,
      `http://localhost:4200/blueprint/${id}?x=1`,
      `blueprintnotincluded.org/b/${id}`,
      `/b/${id}`,
      `/b/${id}/hideui/800/600`,
    ]) {
      expect(resolveOpenBlueprintTarget(link), link).toEqual({
        kind: "saved",
        id,
      });
    }
  });

  it("reads the id out of a mirror's link, since the ids are ours", () => {
    expect(
      resolveOpenBlueprintTarget(
        `https://onimaxxing.com/blueprints/${id}/dreckbox-plastic-drecko-farm`,
      ),
    ).toEqual({ kind: "saved", id });
  });

  it("rejects a link that carries no id rather than treating it as a share string", () => {
    expect(
      resolveOpenBlueprintTarget("https://blueprintnotincluded.org/discover"),
    ).toBeNull();
    expect(resolveOpenBlueprintTarget("https://example.com/")).toBeNull();
  });

  it("hands anything else to the editor as an import", () => {
    const json = `{"friendlyname":"Kitchen","buildings":[]}`;
    expect(resolveOpenBlueprintTarget(json)).toEqual({
      kind: "import",
      text: json,
    });
    // A share string: base64 that may well contain a 24-hex run.
    const share = "H4sIAAAAAAAA/" + "6ad640cb4fc40c07504b2725" + "AAAABBBB==";
    expect(resolveOpenBlueprintTarget(share)).toEqual({
      kind: "import",
      text: share,
    });
  });
});
