import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { DrawHelpers, MARKER_URLS, ROCKET_BACKDROP, StringHelpers } from '../../lib';

// frontend/src/assets/images/ is the SpriteInfo image root: the renderer resolves
// `assets/images/<textureName>.png` there, and the site's own UI art lives beside
// it. It is served whole by every build (and was, for years, a dumping ground for
// the retired atlas pipeline -- 2,700 files and 340 MB that nothing referenced).
// These tests pin both directions: everything the code or the database can ask
// for is on disk, and nothing is on disk that nothing asks for.
describe('Image assets (frontend/src/assets/images)', () => {
  const repoRoot = path.join(__dirname, '../..');
  const imagesRoot = path.join(repoRoot, 'frontend/src/assets/images');
  const URL_PREFIX = 'assets/images/';

  // Source trees whose string literals name image urls. Tests and specs are left
  // out: a fixture may name an image that is deliberately absent.
  const SOURCE_DIRS = ['frontend/src/app', 'frontend/src-admin', 'lib/src', 'app'];
  const SOURCE_EXTENSIONS = new Set(['.ts', '.html', '.scss', '.css']);
  const URL_LITERAL = /assets\/images\/[A-Za-z0-9_./-]+\.(?:png|svg|webp)/g;
  // StringHelpers.createUrl / DrawHelpers.createUrl called with a literal name.
  const CREATE_URL_LITERAL = /createUrl\(\s*['"]([A-Za-z0-9_-]+)['"]\s*,\s*(true|false)\s*\)/g;

  // Hand-made families whose members are chosen at runtime (a note's symbol, an
  // overlay button, the rocket backdrop layers) or that hold the source art the
  // PNGs were cut from (ui/manual). Kept whole; only their presence is asserted.
  const CURATED_DIRS = ['miniui', 'notes', 'rocket-interior', 'ui/manual'];

  const readDatabase = () =>
    JSON.parse(fs.readFileSync(path.join(repoRoot, 'assets/database/database-2024.json'), 'utf8'));

  function* walk(dir: string): Generator<string> {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) yield* walk(full);
      else yield full;
    }
  }

  const isSourceFile = (file: string) =>
    SOURCE_EXTENSIONS.has(path.extname(file)) &&
    !file.endsWith('.spec.ts') &&
    !file.endsWith('.d.ts');

  // Every url under assets/images/ the running site can produce, relative to
  // the images root (so `ui/icon_category_base.png`).
  function referencedImages(): Map<string, string> {
    const refs = new Map<string, string>(); // relative path -> where it came from
    const add = (url: string, origin: string) => {
      if (url.startsWith(URL_PREFIX)) refs.set(url.slice(URL_PREFIX.length), origin);
    };

    const database = readDatabase();
    // Overlay sprites: a spriteModifier names a uiSprite, whose textureName the
    // renderer resolves in this root (SpriteInfo.copyFrom).
    const spritesByName = new Map<string, any>(
      (database.uiSprites as any[]).map(sprite => [sprite.name, sprite])
    );
    for (const modifier of database.spriteModifiers as any[]) {
      const sprite = spritesByName.get(modifier.spriteInfoName);
      if (sprite) add(DrawHelpers.createUrl(sprite.textureName, false), 'spriteModifiers');
    }
    // Utility port indicators (ConnectionHelper resolves these by id).
    for (const sprite of database.uiSprites as any[]) {
      if (sprite.isInputOutput) add(DrawHelpers.createUrl(sprite.textureName, false), 'uiSprites');
    }
    // Build menu category icons (BuildMenuCategory.importFrom / init).
    for (const category of database.buildMenuCategories as any[]) {
      if (category.categoryIcon)
        add(StringHelpers.createUrl(category.categoryIcon, true), 'buildMenuCategories');
    }
    add(StringHelpers.createUrl('icon_category_base', true), 'BuildMenuCategory.init');

    // Note markers and the rocket-interior backdrop, from the lib's own tables.
    for (const url of Object.values(MARKER_URLS)) add(url, 'MARKER_URLS');
    for (const layer of ROCKET_BACKDROP.stars) add(layer.url, 'ROCKET_BACKDROP');
    add(ROCKET_BACKDROP.moon.url, 'ROCKET_BACKDROP');
    add(ROCKET_BACKDROP.vignette.url, 'ROCKET_BACKDROP');

    // Literal urls and literal createUrl names in the source.
    for (const dir of SOURCE_DIRS) {
      for (const file of walk(path.join(repoRoot, dir))) {
        if (!isSourceFile(file)) continue;
        const source = fs.readFileSync(file, 'utf8');
        const where = path.relative(repoRoot, file);
        for (const match of source.matchAll(URL_LITERAL)) add(match[0], where);
        for (const match of source.matchAll(CREATE_URL_LITERAL))
          add(StringHelpers.createUrl(match[1], match[2] === 'true'), where);
      }
    }
    return refs;
  }

  const inCuratedDir = (relative: string) =>
    CURATED_DIRS.some(dir => relative.startsWith(dir + '/'));

  it('ships every image the code and the database can ask for', () => {
    const missing: string[] = [];
    for (const [relative, origin] of referencedImages()) {
      if (!fs.existsSync(path.join(imagesRoot, relative))) missing.push(`${relative} (${origin})`);
    }
    expect(missing, `referenced but not in frontend/src/assets/images:\n  ${missing.join('\n  ')}`)
      .to.be.empty;
  });

  it('ships nothing that nothing asks for', () => {
    const referenced = referencedImages();
    const orphans: string[] = [];
    for (const file of walk(imagesRoot)) {
      const relative = path.relative(imagesRoot, file).split(path.sep).join('/');
      if (inCuratedDir(relative) || referenced.has(relative)) continue;
      orphans.push(relative);
    }
    const shown = orphans.slice(0, 20).join('\n  ');
    expect(
      orphans,
      `${orphans.length} file(s) under frontend/src/assets/images that no code or database entry ` +
        `references (every build ships them; delete them, or reference them):\n  ${shown}`
    ).to.be.empty;
  });

  it('keeps the curated families on disk', () => {
    for (const dir of CURATED_DIRS) {
      const full = path.join(imagesRoot, dir);
      expect(fs.existsSync(full), `missing ${dir}/`).to.equal(true);
      expect(fs.readdirSync(full), `${dir}/ is empty`).to.not.be.empty;
    }
  });
});
