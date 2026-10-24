import { Blueprint } from './blueprint';
import { BlueprintItemElement } from './blueprint-item-element';
import { OniItem } from '../oni-item';

// --- Blueprint summary ---------------------------------------------------
//
// What a blueprint is made of, as numbers: its footprint, how many of each
// building it places, and the construction materials those buildings add up
// to. This is the "spec sheet" the details page shows beside the preview and
// the text an unfurl carries, so a reader can judge a build before opening
// the editor — the way a Factorio or Dyson Sphere Program blueprint page
// lists its entities and required items.
//
// Derived, never stored: it is a pure function of the blueprint content and
// the loaded game database, computed on request (the server caches it per
// modifiedAt). The material math mirrors the editor's element report
// (frontend ElementReport): each selectable slot costs materialMass[slot] of
// the element chosen for that slot, and every non-selectable secondary cost
// (BuildingFiber for a bed, say) is added under its own category id.
// Editor annotations (Element / Info) are not construction and are skipped.

export interface BlueprintSummaryBuilding {
  // prefab id, e.g. "Electrolyzer"
  id: string;
  count: number;
}

export interface BlueprintSummaryMaterial {
  // A BuildableElement id ("IronOre"), or for a secondary cost the material
  // category tag the game charges ("BuildingFiber").
  id: string;
  // kg
  mass: number;
}

export interface BlueprintSummary {
  // Footprint in cells. 0×0 for a blueprint with nothing placed.
  width: number;
  height: number;
  // Every placed building, utilities and tiles included (one per cell).
  buildingCount: number;
  // Most numerous first; ties broken by id so the order is stable.
  buildings: BlueprintSummaryBuilding[];
  // Heaviest first; ties broken by id.
  materials: BlueprintSummaryMaterial[];
}

const ANNOTATION_IDS = new Set([OniItem.elementId, OniItem.infoId]);

export function summarizeBlueprint(blueprint: Blueprint): BlueprintSummary {
  const buildingCounts = new Map<string, number>();
  const materialMass = new Map<string, number>();
  const addMass = (id: string, mass: number) => {
    if (!(mass > 0)) return;
    materialMass.set(id, (materialMass.get(id) ?? 0) + mass);
  };

  let buildingCount = 0;
  for (const item of blueprint.blueprintItems) {
    const oniItem = item.oniItem;
    if (oniItem == null || ANNOTATION_IDS.has(oniItem.id) || item instanceof BlueprintItemElement)
      continue;

    buildingCount++;
    buildingCounts.set(oniItem.id, (buildingCounts.get(oniItem.id) ?? 0) + 1);

    const slots = oniItem.buildableElementsArray?.length ?? 0;
    for (let slot = 0; slot < slots; slot++) {
      const element = item.buildableElements?.[slot] ?? oniItem.defaultElement?.[slot];
      if (element == null) continue;
      addMass(element.id, oniItem.materialMass?.[slot] ?? 0);
    }
    for (const secondary of oniItem.secondaryMaterialCosts ?? []) {
      addMass(secondary.category ?? secondary.element.id, secondary.mass);
    }
  }

  let width = 0;
  let height = 0;
  if (buildingCount > 0) {
    const [topLeft, bottomRight] = blueprint.getBoundingBox();
    width = bottomRight.x - topLeft.x + 1;
    height = bottomRight.y - topLeft.y + 1;
  }

  const buildings = [...buildingCounts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  const materials = [...materialMass.entries()]
    .map(([id, mass]) => ({ id, mass }))
    .sort((a, b) => b.mass - a.mass || a.id.localeCompare(b.id));

  return { width, height, buildingCount, buildings, materials };
}

// "17.2 t", "800 kg": the game's own convention, tonnes from one tonne up,
// one decimal, no trailing ".0".
export function formatMassKg(kg: number): string {
  if (kg >= 1000) {
    const tonnes = Math.round(kg / 100) / 10;
    return `${Number.isInteger(tonnes) ? tonnes.toFixed(0) : tonnes.toFixed(1)} t`;
  }
  return `${Math.round(kg)} kg`;
}
