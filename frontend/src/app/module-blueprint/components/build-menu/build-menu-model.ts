// What the build menu lists and how its search ranks. Pure, so grouping and
// ranking are testable without Angular, the game database or a browser.

// One building as the build menu shows it. The text is display text, already
// resolved from the game strings (or the catalogue, for modded buildings that
// have none) and stripped of Klei markup.
export interface BuildMenuEntry {
  prefabId: string;
  name: string;
  effect: string;
  description: string;
  categoryId: number;
  categoryName: string;
  // The game's subcategory id ("ladders", "tiles", "pumps"); "" from a
  // database written before the field existed, which groups as uncategorized.
  subcategory: string;
  subcategoryTitle: string;
  // Position in the whole menu, category by category in plan order. The
  // search breaks ties on it, so equal matches read in the game's own order.
  order: number;
}

export interface BuildMenuGroup<T extends BuildMenuEntry = BuildMenuEntry> {
  // Category *and* subcategory: the same subcategory id appears under more
  // than one category ("pipes" under plumbing and ventilation).
  key: string;
  subcategory: string;
  title: string;
  entries: T[];
}

// The game's subcategory for a plan entry that names none. Its title string
// is empty, so the menu draws the group last, under a title of its own.
export const UNCATEGORIZED_SUBCATEGORY = "uncategorized";

// The site's own subcategory for the rocket modules (see the converter).
export const ROCKET_MODULE_SUBCATEGORY = "rocketmodules";

export function isUncategorized(subcategory: string): boolean {
  return subcategory === "" || subcategory === UNCATEGORIZED_SUBCATEGORY;
}

// A category's entries, in menu order, under their subcategories. Groups are
// in the order each subcategory first appears, which is how the game orders
// them, except that uncategorized always goes last.
export function groupBySubcategory<T extends BuildMenuEntry>(
  entries: T[],
): BuildMenuGroup<T>[] {
  const groups = new Map<string, BuildMenuGroup<T>>();
  for (const entry of entries) {
    const subcategory = isUncategorized(entry.subcategory)
      ? UNCATEGORIZED_SUBCATEGORY
      : entry.subcategory;
    const key = `${entry.categoryId}:${subcategory}`;
    let group = groups.get(key);
    if (group == null) {
      group = {
        key,
        subcategory,
        title: entry.subcategoryTitle,
        entries: [],
      };
      groups.set(key, group);
    }
    group.entries.push(entry);
  }

  const ordered = [...groups.values()];
  return [
    ...ordered.filter((group) => !isUncategorized(group.subcategory)),
    ...ordered.filter((group) => isUncategorized(group.subcategory)),
  ];
}

// ─── Search ────────────────────────────────────────────────────────────────

export interface BuildMenuSearchResult<
  T extends BuildMenuEntry = BuildMenuEntry,
> {
  entry: T;
  score: number;
}

// How much a query word is worth by where, and how, it matched. Each word
// scores its best match; the entry scores the mean over the query's words, so
// a two-word query sits in the same bands as a one-word one. The bands are
// strict: any whole-word or prefix match on the name beats any substring of
// the name, which beats the subcategory, which beats the effect line and the
// description. Typos and the prefab id are worth the least that still shows,
// and only show at all when nothing is named (searchBuildMenu).
const SCORE = {
  nameWord: 100,
  namePrefix: 90,
  nameSubstring: 60,
  subcategoryWord: 45,
  subcategorySubstring: 40,
  nameTypo: 35,
  effect: 20,
  prefabId: 15,
  description: 10,
} as const;

// On the name, as a whole: the query is the name, or the name starts with it.
// Only reachable when every word already matched the name.
const EXACT_NAME_BONUS = 20;
const NAME_STARTS_WITH_BONUS = 10;

// Below these lengths a query word only matches the start of a word: "co"
// finding every "colony" in every description is noise, not a result.
const MIN_SUBSTRING_LENGTH = 3;
const MIN_PROSE_LENGTH = 3;
const MIN_TYPO_LENGTH = 4;
const LONG_TYPO_LENGTH = 8;

interface SearchableText {
  words: string[];
  joined: string;
}

export interface SearchableEntry<T extends BuildMenuEntry = BuildMenuEntry> {
  entry: T;
  name: SearchableText;
  subcategory: SearchableText;
  effect: SearchableText;
  description: SearchableText;
  prefabId: SearchableText;
}

// Lower case, accents dropped, so "Ölfass" finds "olfass" and the reverse.
export function normalizeSearchText(text: string): string {
  return (text ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function searchable(text: string): SearchableText {
  const words = normalizeSearchText(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0);
  return { words, joined: words.join(" ") };
}

// The id's own words ("PeterHan_FilteredLiquidPump" -> peter, han,
// filtered, liquid, pump) and the id whole, so a pasted id finds itself.
function searchablePrefabId(prefabId: string): SearchableText {
  const split = searchable(
    prefabId
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2"),
  );
  const whole = normalizeSearchText(prefabId);
  return { words: [...split.words, whole], joined: `${whole} ${split.joined}` };
}

export function prepareSearch<T extends BuildMenuEntry>(
  entries: T[],
): SearchableEntry<T>[] {
  return entries.map((entry) => ({
    entry,
    name: searchable(entry.name),
    subcategory: searchable(entry.subcategoryTitle),
    effect: searchable(entry.effect),
    description: searchable(entry.description),
    prefabId: searchablePrefabId(entry.prefabId),
  }));
}

// "pumps" is meant to find "Pump".
function variants(token: string): string[] {
  if (token.length > MIN_SUBSTRING_LENGTH && token.endsWith("s"))
    return [token, token.slice(0, -1)];
  return [token];
}

function hasWord(text: SearchableText, token: string): boolean {
  return variants(token).some((variant) => text.words.includes(variant));
}

function hasWordPrefix(text: SearchableText, token: string): boolean {
  return text.words.some((word) => word.startsWith(token));
}

function hasSubstring(text: SearchableText, token: string): boolean {
  return token.length >= MIN_SUBSTRING_LENGTH && text.joined.includes(token);
}

function hasTypo(text: SearchableText, token: string): boolean {
  if (token.length < MIN_TYPO_LENGTH) return false;
  const allowed = token.length >= LONG_TYPO_LENGTH ? 2 : 1;
  return text.words.some(
    (word) =>
      editDistanceWithin(token, word, allowed) ||
      // Still typing: "refrigr" is one slip short of "refrige(rator)".
      (word.length > token.length &&
        editDistanceWithin(token, word.slice(0, token.length), allowed)),
  );
}

function tokenScore(item: SearchableEntry, token: string): number {
  if (hasWord(item.name, token)) return SCORE.nameWord;
  if (hasWordPrefix(item.name, token)) return SCORE.namePrefix;
  if (hasSubstring(item.name, token)) return SCORE.nameSubstring;
  if (
    hasWord(item.subcategory, token) ||
    hasWordPrefix(item.subcategory, token)
  )
    return SCORE.subcategoryWord;
  if (hasSubstring(item.subcategory, token)) return SCORE.subcategorySubstring;
  if (hasTypo(item.name, token)) return SCORE.nameTypo;
  if (token.length >= MIN_PROSE_LENGTH) {
    if (hasWord(item.effect, token) || hasWordPrefix(item.effect, token))
      return SCORE.effect;
    if (
      hasWordPrefix(item.prefabId, token) ||
      hasSubstring(item.prefabId, token)
    )
      return SCORE.prefabId;
    if (
      hasWord(item.description, token) ||
      hasWordPrefix(item.description, token)
    )
      return SCORE.description;
  } else if (hasWordPrefix(item.prefabId, token)) return SCORE.prefabId;
  return 0;
}

// A building whose every word matched its name or subcategory. Once any
// building does, the rest — typos, the effect line, the prefab id, the
// description — are noise: "oxygen diffuser" wants the Oxygen Diffuser, not
// every building whose description breathes. They are the fallback for a
// query that names nothing.
const NAMED_SCORE = SCORE.subcategorySubstring;

// Every building that matches every word of the query, best first: the named
// ones if there are any, otherwise the rest. Ties keep the menu's own order.
// An empty query matches nothing: the menu shows the open category instead.
export function searchBuildMenu<T extends BuildMenuEntry>(
  entries: SearchableEntry<T>[],
  query: string,
): BuildMenuSearchResult<T>[] {
  const tokens = searchable(query).words;
  if (tokens.length == 0) return [];
  const phrase = tokens.join(" ");

  const named: BuildMenuSearchResult<T>[] = [];
  const rest: BuildMenuSearchResult<T>[] = [];
  for (const item of entries) {
    let total = 0;
    let matchedAll = true;
    let weakest = Infinity;
    for (const token of tokens) {
      const score = tokenScore(item, token);
      if (score == 0) {
        matchedAll = false;
        break;
      }
      total += score;
      weakest = Math.min(weakest, score);
    }
    if (!matchedAll) continue;

    let score = total / tokens.length;
    if (item.name.joined == phrase) score += EXACT_NAME_BONUS;
    else if (item.name.joined.startsWith(phrase))
      score += NAME_STARTS_WITH_BONUS;
    (weakest >= NAMED_SCORE ? named : rest).push({ entry: item.entry, score });
  }

  const results = named.length > 0 ? named : rest;
  return results.sort(
    (a, b) => b.score - a.score || a.entry.order - b.entry.order,
  );
}

// Optimal string alignment distance (Levenshtein plus adjacent swaps, so
// "pupm" is one edit from "pump"), with an early exit once every cell of a
// row is past the limit.
export function editDistanceWithin(
  a: string,
  b: string,
  limit: number,
): boolean {
  if (Math.abs(a.length - b.length) > limit) return false;
  let previousPrevious: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] == b[j - 1] ? 0 : 1;
      let value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1])
        value = Math.min(value, previousPrevious[j - 2] + 1);
      current.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > limit) return false;
    previousPrevious = previous;
    previous = current;
  }
  return previous[b.length] <= limit;
}
