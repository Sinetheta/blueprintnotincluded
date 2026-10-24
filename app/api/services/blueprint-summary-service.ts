import {
  Blueprint,
  BlueprintSummaryResponse,
  BuildableElement,
  MdbBlueprint,
  OniItem,
  formatMassKg,
  stripKleiMarkup,
  summarizeBlueprint,
} from '../../../lib/index';

// The details page's spec sheet and the unfurl description, derived from the
// stored blueprint on request. Pure function of (data, game database), so it
// is cached per blueprint version: the key the controller passes is
// `${id}:${modifiedAt}`, which every save bumps.
//
// Cheap enough to compute uncached (an importFromMdb plus one pass over the
// items — the same work the search indexer does on save), the cache is there
// because the HTML shell for /blueprint/:id asks for it on every page view,
// crawlers included.

const CACHE_MAX_ENTRIES = 500;
const cache = new Map<string, BlueprintSummaryResponse>();

function remember(key: string, value: BlueprintSummaryResponse): BlueprintSummaryResponse {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
}

function displayName(raw: string | null | undefined, fallback: string): string {
  const name = stripKleiMarkup(raw ?? '').trim();
  return name.length > 0 ? name : fallback;
}

// Secondary costs are charged by material category tag; the game has no
// element for "BuildingFiber" so the editor already names it by hand.
const CATEGORY_NAMES: Record<string, string> = {
  BuildingFiber: 'Reed Fiber',
};

function materialName(id: string): { name: string; icon: string | null } {
  const element = BuildableElement.getElementById(id);
  if (element != null) {
    return { name: displayName(element.name, id), icon: element.thumbUrl || null };
  }
  return { name: CATEGORY_NAMES[id] ?? id, icon: null };
}

function buildingName(id: string): { name: string; icon: string | null } {
  const item = OniItem.oniItemsMap?.get(id);
  if (item == null) return { name: id, icon: null };
  return { name: displayName(item.name, id), icon: item.thumbUrl || null };
}

export function summarizeStoredBlueprint(
  data: MdbBlueprint | null | undefined,
  cacheKey: string | null = null
): BlueprintSummaryResponse {
  if (cacheKey != null) {
    const hit = cache.get(cacheKey);
    if (hit != null) return hit;
  }

  const blueprint = new Blueprint();
  const rawItems = data?.blueprintItems ?? [];
  blueprint.importFromMdb({ ...(data ?? {}), blueprintItems: rawItems } as MdbBlueprint);
  const summary = summarizeBlueprint(blueprint);

  // importFromMdb drops ids the database does not know (mod buildings); the
  // file still places them, so they are counted back in by raw id — without
  // a footprint or a cost, which nothing here can know.
  const unknownCounts = new Map<string, number>();
  for (const raw of rawItems) {
    const id = raw?.id != null ? String(raw.id) : null;
    if (id == null || id === OniItem.elementId || id === OniItem.infoId) continue;
    if (OniItem.oniItemsMap?.has(id)) continue;
    unknownCounts.set(id, (unknownCounts.get(id) ?? 0) + 1);
  }

  const buildings = summary.buildings.map(b => ({ ...b, ...buildingName(b.id) }));
  let buildingCount = summary.buildingCount;
  for (const [id, count] of unknownCounts) {
    buildings.push({ id, count, name: id, icon: null });
    buildingCount += count;
  }
  buildings.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

  const response: BlueprintSummaryResponse = {
    width: summary.width,
    height: summary.height,
    buildingCount,
    buildings,
    materials: summary.materials.map(m => ({ ...m, ...materialName(m.id) })),
  };
  return cacheKey != null ? remember(cacheKey, response) : response;
}

export function summaryCacheKey(id: string, modifiedAt: Date | null | undefined): string {
  return `${id}:${modifiedAt != null ? new Date(modifiedAt).getTime() : 0}`;
}

// One line for the unfurl: "21×14 tiles · 254 buildings · 76× Wood Tile,
// 58× Insulated Conductive Wire, 30× Automation Wire · 17.2 t Wood, 6.2 t
// Iron Ore". Empty parts are left out, so an empty blueprint describes
// itself as what it is rather than as "0×0 tiles".
export function describeSummary(summary: BlueprintSummaryResponse, maxNames = 3): string {
  const parts: string[] = [];
  if (summary.buildingCount > 0) {
    parts.push(`${summary.width}×${summary.height} tiles`);
    parts.push(`${summary.buildingCount} ${summary.buildingCount === 1 ? 'building' : 'buildings'}`);
  }
  const topBuildings = summary.buildings.slice(0, maxNames).map(b => `${b.count}× ${b.name}`);
  if (topBuildings.length > 0) parts.push(topBuildings.join(', '));
  const topMaterials = summary.materials
    .slice(0, maxNames)
    .map(m => `${formatMassKg(m.mass)} ${m.name}`);
  if (topMaterials.length > 0) parts.push(topMaterials.join(', '));
  return parts.join(' · ');
}

// Test seam: a summary cached for one version must not survive a rebuilt
// database between tests.
export function clearSummaryCache(): void {
  cache.clear();
}
