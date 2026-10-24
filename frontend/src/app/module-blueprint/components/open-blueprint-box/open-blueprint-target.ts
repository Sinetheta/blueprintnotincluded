// What a reader dropped into the "Open a blueprint" box. Three kinds of
// input arrive there, and only one can be acted on without the editor:
//
//  - a saved blueprint, as its id or any link that carries one
//    (blueprintnotincluded.org/b/<id>, /blueprint/<id>, or a mirror such as
//    onimaxxing.com/blueprints/<id>/<slug>, whose ids are ours);
//  - a BlueprintsV2 share string or raw .blueprint JSON, which the editor
//    parses once the game database is loaded;
//  - nothing (whitespace).
//
// Kept as a pure function so the detection is testable apart from the DOM.

export type OpenBlueprintTarget =
  { kind: "saved"; id: string } | { kind: "import"; text: string };

const OBJECT_ID = /^[0-9a-f]{24}$/i;
// A 24-hex id as its own path segment, anywhere in a URL or path. The
// segment rule is what keeps a share string (base64, often containing a
// 24-hex run) from being mistaken for a link.
const ID_IN_PATH = /(?:^|[/=])([0-9a-f]{24})(?=$|[/?#&])/i;

export function resolveOpenBlueprintTarget(
  raw: string,
): OpenBlueprintTarget | null {
  const text = raw.trim();
  if (text.length === 0) return null;
  if (OBJECT_ID.test(text)) return { kind: "saved", id: text.toLowerCase() };

  // A share string or a file is long and has no business matching a URL
  // shape; only something that looks like a link or a path is read for an
  // id, and a share string is never read for one.
  const looksLikeLink =
    /^(https?:\/\/|www\.|\/)/i.test(text) ||
    (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(text) && !text.includes(" "));
  if (looksLikeLink && !text.includes("{")) {
    const match = ID_IN_PATH.exec(text);
    if (match != null) return { kind: "saved", id: match[1].toLowerCase() };
    return null;
  }

  return { kind: "import", text };
}
