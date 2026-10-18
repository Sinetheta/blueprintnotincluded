import { Injectable } from "@angular/core";
import { Observable, Subject, Subscription } from "rxjs";
import {
  BlueprintHelpers,
  BlueprintItemElement,
  BuildMenuCategory,
  BuildMenuItem,
  OniItem,
} from "../../../../../lib/index";
import { ToolType } from "../common/tools/tool";
import {
  BuildMenuEntry,
  BuildMenuGroup,
  BuildMenuSearchResult,
  ROCKET_MODULE_SUBCATEGORY,
  SearchableEntry,
  groupBySubcategory,
  isUncategorized,
  prepareSearch,
  searchBuildMenu,
} from "../components/build-menu/build-menu-model";
import {
  ShortcutAction,
  ShortcutActionId,
  buildMenuCategoryAction,
} from "../keybindings/shortcut-actions";
import {
  BuildMenuLayout,
  buildMenuLayout,
} from "../components/build-menu/build-menu-layout";
import { AddMassUnitPipe } from "../pipes/add-mass-unit.pipe";
import { GameStringService } from "./game-string-service";
import { KeyboardShortcutService } from "./keyboard-shortcut.service";
import { ToolService } from "./tool-service";

export interface BuildMenuItemEntry extends BuildMenuEntry {
  item: OniItem;
}

export interface BuildMenuCategoryView {
  id: number;
  // The database's categoryName ("base", "hvac"), which names its action.
  categoryName: string;
  name: string;
  // The game's one-line tooltip for the category.
  description: string;
  iconUrl: string;
  actionId?: ShortcutActionId;
  groups: BuildMenuGroup<BuildMenuItemEntry>[];
}

export type BuildMenuViewMode = "grid" | "list";

// Per-viewer convenience: the grid/list choice survives a reload.
const VIEW_MODE_KEY = "bpni-build-menu-view-v1";

const massPipe = new AddMassUnitPipe();

/**
 * The build menu's state: which category is open, what the search says and
 * how the panel lays out, plus picking a building from it. The menu component
 * draws this; the Build Tool card opens it on its current building.
 */
@Injectable({ providedIn: "root" })
export class BuildMenuService {
  categories: BuildMenuCategoryView[] = [];
  openCategoryId: number | null = null;
  viewMode: BuildMenuViewMode = readViewMode();

  private searchIndex: SearchableEntry<BuildMenuItemEntry>[] = [];
  private categoryByPrefab = new Map<string, number>();
  private queryText = "";
  private lastResultsQuery: string | null = null;
  private lastResults: BuildMenuSearchResult<BuildMenuItemEntry>[] = [];
  private unregisterCancel: (() => void) | null = null;
  private rightClicks: Subscription | null = null;

  // Where the editor's nav ends, in viewport pixels (the editor measures
  // it): the column fits under it and the panel never grows past it.
  navBottom = 56;
  private layoutKey = "";
  private layoutCache!: BuildMenuLayout;

  private focusSearchSubject = new Subject<void>();
  // The menu component focuses its search box when this fires.
  get focusSearchRequests(): Observable<void> {
    return this.focusSearchSubject.asObservable();
  }

  constructor(
    private toolService: ToolService,
    private gameStringService: GameStringService,
    private shortcutService: KeyboardShortcutService,
  ) {}

  // Column or sheet, and how big the column's buttons are, for this window.
  // The editor reads columnWidth to keep its top-left panel clear of the
  // column, and compact to keep its toolbar clear of the sheet's button.
  get layout(): BuildMenuLayout {
    const buttons = this.categories.length + 1; // and Paint Element
    const key = `${window.innerWidth}x${window.innerHeight}:${this.navBottom}:${buttons}`;
    if (key != this.layoutKey) {
      this.layoutKey = key;
      this.layoutCache = buildMenuLayout(
        { width: window.innerWidth, height: window.innerHeight },
        this.navBottom,
        buttons,
      );
    }
    return this.layoutCache;
  }

  get loaded(): boolean {
    return this.categories.length > 0;
  }

  get isOpen(): boolean {
    return this.openCategoryId != null;
  }

  get openCategory(): BuildMenuCategoryView | undefined {
    return this.categories.find((c) => c.id == this.openCategoryId);
  }

  get query(): string {
    return this.queryText;
  }
  set query(query: string) {
    this.queryText = query;
  }

  get isSearching(): boolean {
    return this.queryText.trim().length > 0;
  }

  get results(): BuildMenuSearchResult<BuildMenuItemEntry>[] {
    if (this.lastResultsQuery !== this.queryText) {
      this.lastResults = searchBuildMenu(this.searchIndex, this.queryText);
      this.lastResultsQuery = this.queryText;
    }
    return this.lastResults;
  }

  // The building the build tool holds, for the menu's highlight.
  get currentPrefabId(): string | undefined {
    return this.toolService.buildTool.templateItemToBuild?.oniItem?.id;
  }

  get buildToolActive(): boolean {
    return this.toolService.currentToolType == ToolType.build;
  }

  // Called once the game database is loaded: the categories, items and
  // names are all in place by then, and so are the game strings.
  load() {
    const entriesByCategory = new Map<number, BuildMenuItemEntry[]>();
    const all: BuildMenuItemEntry[] = [];
    this.categoryByPrefab.clear();

    for (const menuItem of BuildMenuItem.buildMenuItems ?? []) {
      const item = OniItem.getOniItem(menuItem.buildingId);
      if (item == null) continue;
      let category: BuildMenuCategory;
      try {
        category = BuildMenuCategory.getCategory(menuItem.category);
      } catch {
        continue;
      }
      const id = item.id.toUpperCase();
      const entry: BuildMenuItemEntry = {
        prefabId: item.id,
        name: item.name,
        effect: this.text(`STRINGS.BUILDINGS.PREFABS.${id}.EFFECT`),
        description: this.text(`STRINGS.BUILDINGS.PREFABS.${id}.DESC`),
        categoryId: category.category,
        categoryName: category.categoryShowName || category.categoryName,
        subcategory: menuItem.subcategory,
        subcategoryTitle: this.subcategoryTitle(menuItem.subcategory),
        order: all.length,
        item,
      };
      all.push(entry);
      if (!entriesByCategory.has(entry.categoryId))
        entriesByCategory.set(entry.categoryId, []);
      entriesByCategory.get(entry.categoryId)!.push(entry);
      if (!this.categoryByPrefab.has(item.id))
        this.categoryByPrefab.set(item.id, entry.categoryId);
    }

    this.categories = (BuildMenuCategory.buildMenuCategories ?? []).map(
      (category) => ({
        id: category.category,
        categoryName: category.categoryName,
        name: category.categoryShowName || category.categoryName,
        description: this.text(
          `STRINGS.UI.BUILDCATEGORIES.${category.categoryName.toUpperCase()}.TOOLTIP`,
        )
          .replace("{Hotkey}", "")
          .trim(),
        iconUrl: category.categoryIconUrl,
        actionId: buildMenuCategoryAction(category.categoryName),
        groups: groupBySubcategory(
          entriesByCategory.get(category.category) ?? [],
        ),
      }),
    );
    this.searchIndex = prepareSearch(all);
    this.lastResultsQuery = null;
  }

  // ─── Opening and closing ───────────────────────────────────────────────

  toggleCategory(categoryId: number) {
    if (this.openCategoryId == categoryId && !this.isSearching) this.close();
    else this.openCategoryById(categoryId);
  }

  // Picking a category is leaving the search for it.
  openCategoryById(categoryId: number) {
    this.queryText = "";
    this.openCategoryId = categoryId;
    this.listenWhileOpen();
  }

  // The Build Tool card's button: the menu, open on its building's category.
  openForItem(prefabId: string | undefined) {
    const categoryId =
      (prefabId != null ? this.categoryByPrefab.get(prefabId) : undefined) ??
      this.categories[0]?.id;
    if (categoryId != null) this.openCategoryById(categoryId);
  }

  close() {
    if (this.openCategoryId == null && this.queryText == "") return;
    this.openCategoryId = null;
    this.queryText = "";
    this.unregisterCancel?.();
    this.unregisterCancel = null;
    this.rightClicks?.unsubscribe();
    this.rightClicks = null;
  }

  // Ctrl+F: the search, opening the first category if nothing is open.
  focusSearch() {
    if (!this.loaded) return;
    if (!this.isOpen) this.openCategoryById(this.categories[0].id);
    this.focusSearchSubject.next();
  }

  // While the menu is open:
  //  - Escape. The search box clears itself first (see the component); with
  //    the box empty, or focus elsewhere, Escape closes the menu. Registered
  //    last, it shadows the editor-wide Escape (leave the build tool,
  //    deselect) until the menu closes.
  //  - The game's right-click: the first drops the building in hand (the
  //    build tool already does that, by going back to Select), the next one,
  //    with nothing in hand, closes the menu. Other tools keep theirs.
  private listenWhileOpen() {
    if (this.unregisterCancel == null)
      this.unregisterCancel = this.shortcutService.register(
        ShortcutAction.interfaceCancel,
        () => {
          if (this.queryText != "") this.queryText = "";
          else this.close();
        },
      );
    if (this.rightClicks == null)
      this.rightClicks = this.toolService.rightClicked.subscribe((toolType) => {
        if (toolType == ToolType.select) this.close();
      });
  }

  setViewMode(mode: BuildMenuViewMode) {
    this.viewMode = mode;
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // Not saved, still applied.
    }
  }

  // ─── Picking ───────────────────────────────────────────────────────────

  // The same path the Build Tool card's picker took: the build tool, then a
  // fresh instance of the building as its brush. The menu stays open.
  choose(entry: BuildMenuItemEntry) {
    const instance = BlueprintHelpers.createInstance(entry.prefabId);
    if (instance == null) return;
    if (!this.buildToolActive) this.toolService.changeTool(ToolType.build);
    this.toolService.buildTool.changeItem(instance);
  }

  paintElement() {
    const element = new BlueprintItemElement(OniItem.elementId);
    element.setElement("Water", 0);
    if (!this.buildToolActive) this.toolService.changeTool(ToolType.build);
    this.toolService.buildTool.changeItem(element);
  }

  // ─── Text ──────────────────────────────────────────────────────────────

  // "Metal Ore 400 Kg", one per construction material.
  materials(item: OniItem): string[] {
    return (item.materialCategory ?? []).map((tag, index) => {
      const label = tag
        .split("&")
        .map(
          (part) =>
            this.gameStringService.dict?.[
              `STRINGS.MISC.TAGS.${part.toUpperCase()}`
            ] || part,
        )
        .join(" / ");
      const mass = item.materialMass?.[index];
      return mass != null ? `${label} ${massPipe.transform(mass)}` : label;
    });
  }

  private subcategoryTitle(subcategory: string): string {
    if (isUncategorized(subcategory))
      return $localize`:build menu subcategory:Other`;
    if (subcategory == ROCKET_MODULE_SUBCATEGORY)
      return $localize`:build menu subcategory:Rocket Modules`;
    return (
      this.text(
        `STRINGS.UI.NEWBUILDCATEGORIES.${subcategory.toUpperCase()}.BUILDMENUTITLE`,
      ) || subcategory.charAt(0).toUpperCase() + subcategory.slice(1)
    );
  }

  private text(key: string): string {
    return this.gameStringService.dict?.[key] ?? "";
  }
}

function readViewMode(): BuildMenuViewMode {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) == "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}
