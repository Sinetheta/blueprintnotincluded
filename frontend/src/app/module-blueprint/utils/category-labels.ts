import { Category } from "../../../../../lib/index";

// Display names for the blueprint categories and subcategories
// (CATEGORIES / SUBCATEGORIES in lib). The ids are storage keys and query
// params ("oxygenGen", "greatHall"); these are what people read. Shared by the
// discover filters, blueprint card and detail chips, and the save dialog.
export const CATEGORY_LABELS: Record<Category, string> = {
  oxygenGen: $localize`:blueprint category:Oxygen`,
  power: $localize`:blueprint category:Power`,
  cooling: $localize`:blueprint category:Cooling`,
  food: $localize`:blueprint category:Food`,
  ranching: $localize`:blueprint category:Ranching`,
  automation: $localize`:blueprint category:Automation`,
  transit: $localize`:blueprint category:Transit`,
  refining: $localize`:blueprint category:Refining`,
  rooms: $localize`:blueprint category:Rooms`,
  decor: $localize`:blueprint category:Decor`,
  rocketInterior: $localize`:blueprint category:Rocket Interior`,
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  electrolyzer: $localize`:blueprint subcategory:Electrolyzer`,
  algae: $localize`:blueprint subcategory:Algae`,
  rust: $localize`:blueprint subcategory:Rust`,
  generator: $localize`:blueprint subcategory:Generators`,
  storage: $localize`:blueprint subcategory:Storage`,
  distribution: $localize`:blueprint subcategory:Distribution`,
  aquatuner: $localize`:blueprint subcategory:Aquatuner`,
  fan: $localize`:blueprint subcategory:Fans`,
  passive: $localize`:blueprint subcategory:Passive`,
  farm: $localize`:blueprint subcategory:Farms`,
  kitchen: $localize`:blueprint subcategory:Kitchen`,
  greatHall: $localize`:blueprint subcategory:Great Hall`,
  critter: $localize`:blueprint subcategory:Critters`,
  egg: $localize`:blueprint subcategory:Eggs`,
  grooming: $localize`:blueprint subcategory:Grooming`,
  logic: $localize`:blueprint subcategory:Logic`,
  sensor: $localize`:blueprint subcategory:Sensors`,
  switch: $localize`:blueprint subcategory:Switches`,
  rail: $localize`:blueprint subcategory:Rail`,
  conveyor: $localize`:blueprint subcategory:Conveyor`,
  pneumatic: $localize`:blueprint subcategory:Pneumatic`,
  ladder: $localize`:blueprint subcategory:Ladders`,
  oil: $localize`:blueprint subcategory:Oil`,
  metal: $localize`:blueprint subcategory:Metal`,
  foodProcessing: $localize`:blueprint subcategory:Food Processing`,
  barracks: $localize`:blueprint subcategory:Barracks`,
  hospital: $localize`:blueprint subcategory:Hospital`,
  recreation: $localize`:blueprint subcategory:Recreation`,
  sculpture: $localize`:blueprint subcategory:Sculpture`,
  plant: $localize`:blueprint subcategory:Plants`,
  lighting: $localize`:blueprint subcategory:Lighting`,
};

// Unknown values (a newer server list) fall back to the raw id rather than
// disappearing, as roomTypeLabel does.
export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as Category] ?? category;
}

export function subcategoryLabel(subcategory: string): string {
  return SUBCATEGORY_LABELS[subcategory] ?? subcategory;
}
