#!/usr/bin/env node
// Regenerates lib/src/blueprint/rocket-interior-layouts.ts from the game's
// habitat-module interior templates in assets/manual/rocket-interior/.
//
// The YAML is Klei's TemplateContainer format, carried over by hand from the
// game install (see the handoff notes at the top of rocket-interior.ts). It
// changes only when Klei redraws the interiors, so the table is committed and
// this script is run by hand, not at build time:
//
//   node scripts/gen-rocket-interior-layouts.js
//
// The output is a glyph grid per module (one two-character glyph per cell,
// rows from the top of the template down) plus the door cell. Everything the
// renderer needs is derived from the grid by rocket-interior.ts; the grid is
// what makes a layout change readable in a diff.
//
// The YAML subset here is tiny (a map of scalars and lists of flat maps), so
// it is parsed inline rather than pulling js-yaml into the root package.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'assets/manual/rocket-interior');
const TARGET = path.join(ROOT, 'lib/src/blueprint/rocket-interior-layouts.ts');

const MODULES = [
  { module: 'small', prefabId: 'HabitatModuleSmall', file: 'habitat_small.yaml' },
  { module: 'medium', prefabId: 'HabitatModuleMedium', file: 'habitat_medium.yaml' },
];

// Prefab id -> glyph. The station glyph marks its *origin* cell only; the
// three other cells it covers are plain room cells in the template.
const GLYPHS = {
  RocketWallTile: '##',
  RocketEnvelopeWindowTile: '[]',
  RocketInteriorGasOutputPort: 'go',
  RocketInteriorGasInputPort: 'gi',
  RocketInteriorLiquidOutputPort: 'lo',
  RocketInteriorLiquidInputPort: 'li',
  RocketControlStation: 'CS',
};
const ROOM = '..';
const OUTSIDE = '  ';
const DOOR_ID = 'ClustercraftInteriorDoor';

// Minimal YAML reader for TemplateContainer files: top-level keys holding
// either a nested map of scalars (`info:`) or a list of flat maps.
function parseTemplateYaml(text) {
  const doc = {};
  let section = null;
  let current = null;
  let nested = null;
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '' || raw.trim().startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    if (line.startsWith('- ')) {
      // List item (the lists in these files sit at column 0 under their key).
      if (!Array.isArray(doc[section])) doc[section] = [];
      current = {};
      doc[section].push(current);
      const [k, v] = splitScalar(line.slice(2));
      current[k] = v;
      continue;
    }
    if (indent === 0) {
      section = line.replace(/:$/, '');
      doc[section] = null;
      current = null;
      nested = null;
      continue;
    }
    const [k, v] = splitScalar(line);
    if (current != null) {
      current[k] = v;
      continue;
    }
    // Scalar map section (`info:`), one level of nesting (`size:`).
    if (doc[section] == null) doc[section] = {};
    if (v === undefined) {
      nested = doc[section][k] = {};
    } else if (nested != null && indent > 2) {
      nested[k] = v;
    } else {
      nested = null;
      doc[section][k] = v;
    }
  }
  return doc;
}

function splitScalar(line) {
  const idx = line.indexOf(':');
  const key = line.slice(0, idx).trim();
  const rest = line.slice(idx + 1).trim();
  if (rest === '') return [key, undefined];
  const num = Number(rest);
  return [key, Number.isFinite(num) ? num : rest];
}

function cellOf(entry) {
  return { x: entry.location_x ?? 0, y: entry.location_y ?? 0 };
}

function buildLayout({ module, prefabId, file }) {
  const text = fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8');
  const doc = parseTemplateYaml(text);

  const cells = doc.cells.map(c => ({ ...cellOf(c), element: c.element }));
  const buildings = doc.buildings.map(b => ({ ...cellOf(b), id: b.id }));
  const doors = (doc.otherEntities ?? []).filter(e => e.id === DOOR_ID).map(cellOf);
  if (doors.length !== 1) throw new Error(`${file}: expected one ${DOOR_ID}, got ${doors.length}`);
  const stations = buildings.filter(b => b.id === 'RocketControlStation');
  if (stations.length !== 1)
    throw new Error(`${file}: expected one RocketControlStation, got ${stations.length}`);

  const xs = cells.map(c => c.x);
  const ys = cells.map(c => c.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const bottom = Math.min(...ys);
  const top = Math.max(...ys);
  if (right - left + 1 !== doc.info.size.X || top - bottom + 1 !== doc.info.size.Y)
    throw new Error(`${file}: cell extent disagrees with info.size`);

  const key = (x, y) => `${x},${y}`;
  const grid = new Map();
  for (const c of cells) grid.set(key(c.x, c.y), c.element === 'Vacuum' ? ROOM : null);
  for (const b of buildings) {
    const glyph = GLYPHS[b.id];
    if (glyph == null) throw new Error(`${file}: no glyph for ${b.id}`);
    const k = key(b.x, b.y);
    if (!grid.has(k)) throw new Error(`${file}: ${b.id} at ${k} is outside the template cells`);
    if (b.id === 'RocketControlStation') {
      if (grid.get(k) !== ROOM) throw new Error(`${file}: station origin is not a room cell`);
    } else if (grid.get(k) !== null) {
      throw new Error(`${file}: ${b.id} at ${k} is on a ${grid.get(k)} cell, expected a solid`);
    }
    grid.set(k, glyph);
  }
  for (const [k, v] of grid)
    if (v === null) throw new Error(`${file}: solid cell ${k} has no building on it`);

  const rows = [];
  for (let y = top; y >= bottom; y--) {
    let row = '';
    for (let x = left; x <= right; x++) row += grid.get(key(x, y)) ?? OUTSIDE;
    rows.push(row);
  }

  return {
    module,
    prefabId,
    left,
    top,
    rows,
    door: doors[0],
    station: stations[0],
  };
}

function render(layouts) {
  const lines = [];
  lines.push('// GENERATED by scripts/gen-rocket-interior-layouts.js from');
  lines.push('// assets/manual/rocket-interior/*.yaml — do not edit by hand.');
  lines.push('//');
  lines.push('// One glyph per cell, rows from the top of the template down, in template');
  lines.push('// coordinates (y up, origin at the template centre). `left`/`top` give the');
  lines.push('// cell of the first glyph. Glyph meanings: see ROCKET_INTERIOR_GLYPHS in');
  lines.push('// rocket-interior.ts.');
  lines.push('');
  lines.push("import { RocketInteriorLayoutSource } from './rocket-interior';");
  lines.push('');
  lines.push('export const ROCKET_INTERIOR_LAYOUT_SOURCES: RocketInteriorLayoutSource[] = [');
  for (const l of layouts) {
    lines.push('  {');
    lines.push(`    module: '${l.module}',`);
    lines.push(`    prefabId: '${l.prefabId}',`);
    lines.push(`    left: ${l.left},`);
    lines.push(`    top: ${l.top},`);
    lines.push('    rows: [');
    for (const row of l.rows) lines.push(`      '${row}',`);
    lines.push('    ],');
    lines.push(`    door: { x: ${l.door.x}, y: ${l.door.y} },`);
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  return lines.join('\n');
}

const layouts = MODULES.map(buildLayout);
fs.writeFileSync(TARGET, render(layouts));
for (const l of layouts) {
  console.log(
    `${l.module} (${l.prefabId}): ${l.rows[0].length / 2}x${l.rows.length}, station at (${l.station.x}, ${l.station.y}), door at (${l.door.x}, ${l.door.y})`
  );
  for (const row of l.rows) console.log('  |' + row + '|');
}
console.log(`wrote ${path.relative(ROOT, TARGET)}`);
