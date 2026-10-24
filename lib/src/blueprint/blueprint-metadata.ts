// Order matters twice: it is the Discover facet order, and deriveCategory
// breaks a tied score by it — so the specific player-vocabulary categories
// (tamer, boiler, water, storage) sit before the broad "cooling" that most
// of them also score on (an aquatuner and a steam turbine are in nearly
// every tamer and boiler; a desalinator usually has an aquatuner on it).
export const CATEGORIES = ['oxygenGen', 'power', 'tamer', 'boiler', 'water', 'storage',
  'cooling', 'food', 'ranching', 'automation', 'transit', 'refining', 'rooms', 'decor',
  'rocketInterior'] as const;
export type Category = typeof CATEGORIES[number];

export const SUBCATEGORIES: Record<Category, readonly string[]> = {
  oxygenGen: ['electrolyzer', 'algae', 'rust'],
  power:     ['generator', 'storage', 'distribution'],
  tamer:     ['volcano', 'geyser', 'vent'],
  boiler:    ['petroleum', 'sourGas', 'steam'],
  cooling:   ['aquatuner', 'fan', 'passive'],
  water:     ['sieve', 'desalination'],
  storage:   ['infinite', 'locker', 'reservoir'],
  food:      ['farm', 'kitchen', 'greatHall'],
  ranching:  ['critter', 'egg', 'grooming'],
  automation: ['logic', 'sensor', 'switch'],
  transit:   ['rail', 'conveyor', 'pneumatic', 'ladder'],
  refining:  ['oil', 'metal', 'foodProcessing'],
  rooms:     ['barracks', 'hospital', 'recreation'],
  decor:     ['sculpture', 'plant', 'lighting'],
  rocketInterior: [],
};
export type Subcategory = string;

export const RESEARCH_TIERS = ['novice', 'advanced', 'interstellar', 'applied', 'dataAnalysis'] as const;
export type ResearchTier = typeof RESEARCH_TIERS[number];
