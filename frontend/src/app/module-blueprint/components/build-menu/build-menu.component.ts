import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { Subscription } from "rxjs";
import { formatChord } from "../../keybindings/key-chord";
import {
  ShortcutAction,
  ShortcutActionId,
  getShortcutActionsByCategory,
} from "../../keybindings/shortcut-actions";
import {
  BuildMenuCategoryView,
  BuildMenuItemEntry,
  BuildMenuService,
  BuildMenuViewMode,
} from "../../services/build-menu.service";
import { KeybindingService } from "../../services/keybinding.service";
import { KeyboardShortcutService } from "../../services/keyboard-shortcut.service";
import { BuildMenuLayout, EDGE_GAP, NAV_GAP } from "./build-menu-layout";

const PANEL_WIDTH = 344;
const PANEL_GAP = 6;
const TIP_WIDTH = 280;

interface BuildMenuTip {
  title: string;
  // Hotkey, for a category.
  hotkey?: string;
  lines: string[];
  meta: string[];
  left: number;
  top?: number;
  bottom?: number;
}

@Component({
  selector: "app-build-menu",
  templateUrl: "./build-menu.component.html",
  styleUrls: ["./build-menu.component.css"],
  // Sample Board tokens: the editor is still stock PrimeNG, and new work on
  // it converges on the skin (DESIGN.md, "unmigrated surfaces").
  host: { class: "bni-skin" },
  standalone: false,
})
export class BuildMenuComponent implements OnInit, OnDestroy {
  @ViewChild("searchInput") searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild("panel") panel?: ElementRef<HTMLElement>;

  // Search results the arrow keys have moved to; Enter picks it.
  highlight = 0;
  tip: BuildMenuTip | null = null;
  // Where the pointer was when the keyboard last moved the highlight. The
  // scroll that follows slides rows under a resting pointer, and the browser
  // then fires mouseenter on the row that lands there — from the same spot,
  // which is how such an event is told apart from the pointer moving.
  private pointerAtKeyMove: { x: number; y: number } | null = null;
  private lastPointer: { x: number; y: number } | null = null;

  readonly isApple =
    typeof navigator != "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform);
  readonly paintElementLabel = $localize`:build menu:Paint Element`;
  readonly paintElementDescription = $localize`:build menu:Paint gas, liquid or solid element cells.`;

  private unregisters: (() => void)[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    public menu: BuildMenuService,
    private shortcutService: KeyboardShortcutService,
    private keybindingService: KeybindingService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.registerShortcuts();
    this.subscriptions.push(
      this.menu.focusSearchRequests.subscribe(() => this.focusSearchBox()),
      this.menu.dismissed.subscribe(() => {
        this.tip = null;
        this.highlight = 0;
      }),
    );
  }

  ngOnDestroy() {
    for (const unregister of this.unregisters) unregister();
    this.unregisters = [];
    for (const subscription of this.subscriptions) subscription.unsubscribe();
    this.subscriptions = [];
    this.menu.close();
  }

  get categories(): BuildMenuCategoryView[] {
    return this.menu.categories;
  }

  get isOpen(): boolean {
    return this.menu.isOpen;
  }

  get title(): string {
    return this.menu.isSearching
      ? $localize`:build menu:SEARCH RESULTS`
      : (this.menu.openCategory?.name ?? "");
  }

  get viewMode(): BuildMenuViewMode {
    return this.menu.viewMode;
  }

  // Bottom-left, beside the column: as tall as its content, never past the nav.
  get panelMaxHeight(): number {
    return Math.max(
      120,
      window.innerHeight - this.menu.navBottom - NAV_GAP - EDGE_GAP,
    );
  }

  // The phone sheet leaves the top of the canvas showing, for context.
  get sheetMaxHeight(): number {
    return Math.min(this.panelMaxHeight, Math.round(window.innerHeight * 0.7));
  }

  get panelLeft(): number {
    return this.layout.columnWidth + PANEL_GAP;
  }

  get panelWidth(): number {
    return Math.min(PANEL_WIDTH, window.innerWidth - this.panelLeft - EDGE_GAP);
  }

  get layout(): BuildMenuLayout {
    return this.menu.layout;
  }

  // A resize moves whatever the tooltip was beside.
  @HostListener("window:resize")
  onResize() {
    this.tip = null;
  }

  // ─── Categories ────────────────────────────────────────────────────────

  isActive(category: BuildMenuCategoryView): boolean {
    return this.menu.openCategoryId == category.id && !this.menu.isSearching;
  }

  toggleCategory(category: BuildMenuCategoryView) {
    this.tip = null;
    this.menu.toggleCategory(category.id);
    this.highlight = 0;
  }

  hotkey(category: BuildMenuCategoryView): string {
    if (category.actionId == null) return "";
    const chord = this.keybindingService.getChords(category.actionId)[0];
    return chord == null ? "" : formatChord(chord, this.isApple);
  }

  paintElement() {
    this.menu.paintElement();
    if (this.layout.compact) this.menu.close();
  }

  // The phone layout's one button.
  toggleSheet() {
    if (this.menu.isOpen) this.menu.close();
    else this.menu.openForItem(this.menu.currentPrefabId);
  }

  // ─── Buildings ─────────────────────────────────────────────────────────

  setViewMode(mode: BuildMenuViewMode) {
    this.menu.setViewMode(mode);
  }

  isCurrent(entry: BuildMenuItemEntry): boolean {
    return entry.prefabId == this.menu.currentPrefabId;
  }

  choose(entry: BuildMenuItemEntry) {
    this.menu.choose(entry);
    // On a phone the sheet covers the canvas the building goes on, so it gets
    // out of the way; it opens again on this building's category.
    if (this.layout.compact) this.menu.close();
  }

  trackGroup(_index: number, group: { key: string }) {
    return group.key;
  }

  trackEntry(_index: number, entry: BuildMenuItemEntry) {
    return entry.prefabId;
  }

  trackResult(_index: number, result: { entry: BuildMenuItemEntry }) {
    return result.entry.prefabId;
  }

  // ─── Search ────────────────────────────────────────────────────────────

  get query(): string {
    return this.menu.query;
  }
  set query(query: string) {
    this.menu.query = query;
    this.highlight = 0;
    this.tip = null;
    this.pointerAtKeyMove = null;
  }

  // A result the pointer came to rest on, unless it was the list that moved.
  onResultEnter(index: number, entry: BuildMenuItemEntry, event: MouseEvent) {
    const at = this.pointerAtKeyMove;
    if (at != null && event.clientX == at.x && event.clientY == at.y) return;
    this.pointerAtKeyMove = null;
    this.highlight = index;
    this.showEntryTip(entry, event.currentTarget);
  }

  // Over the results list only: the whole window would run change detection
  // on every pointer move.
  trackPointer(event: MouseEvent) {
    this.lastPointer = { x: event.clientX, y: event.clientY };
  }

  clearQuery() {
    this.query = "";
    this.searchInput?.nativeElement.focus();
  }

  // The box is a text field, so the editor's shortcuts never see these keys
  // (KeyboardShortcutService skips editable targets); the box handles the
  // few it needs itself.
  onSearchKeydown(event: KeyboardEvent) {
    const results = this.menu.results;
    switch (event.key) {
      case "ArrowDown":
        if (results.length == 0) return;
        this.moveHighlight(Math.min(this.highlight + 1, results.length - 1));
        break;
      case "ArrowUp":
        if (results.length == 0) return;
        this.moveHighlight(Math.max(this.highlight - 1, 0));
        break;
      case "Enter":
        if (results[this.highlight] == null) return;
        this.choose(results[this.highlight].entry);
        break;
      case "Escape":
        // Clears the query first, closes the menu second.
        if (this.query != "") this.query = "";
        else {
          this.menu.close();
          this.searchInput?.nativeElement.blur();
        }
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  private moveHighlight(index: number) {
    this.highlight = index;
    this.pointerAtKeyMove = this.lastPointer;
    // Rendered on the next check; then bring the row into view and say what
    // it is, as hovering it would.
    setTimeout(() => {
      const row = this.panel?.nativeElement.querySelector<HTMLElement>(
        `[data-result-index="${index}"]`,
      );
      if (row == null) return;
      row.scrollIntoView?.({ block: "nearest" });
      const result = this.menu.results[index];
      if (result != null) this.showEntryTip(result.entry, row);
    });
  }

  private focusSearchBox() {
    // The panel may only just have opened: wait for it to render.
    this.changeDetector.detectChanges();
    setTimeout(() => {
      const input = this.searchInput?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  // ─── Tooltip ───────────────────────────────────────────────────────────

  showCategoryTip(category: BuildMenuCategoryView, target: EventTarget | null) {
    this.showTip(target, {
      title: category.name,
      hotkey: this.hotkey(category),
      lines: category.description ? [category.description] : [],
      meta: [],
    });
  }

  showPaintTip(target: EventTarget | null) {
    this.showTip(target, {
      title: this.paintElementLabel,
      lines: [this.paintElementDescription],
      meta: [],
    });
  }

  showEntryTip(entry: BuildMenuItemEntry, target: EventTarget | null) {
    const item = entry.item;
    const meta = [
      `${item.size.x}×${item.size.y}`,
      ...this.menu.materials(item),
    ];
    this.showTip(
      target,
      {
        title: entry.tooltip,
        lines: entry.effect ? [entry.effect] : [],
        meta,
      },
      true,
    );
  }

  hideTip() {
    this.tip = null;
  }

  // Beside what it describes: right of the column for a category, right of
  // the panel for a building. Anchored to the element's top, or to its bottom
  // in the lower part of the screen, so it never runs off the bottom.
  private showTip(
    target: EventTarget | null,
    content: Omit<BuildMenuTip, "left" | "top" | "bottom">,
    besidePanel = false,
  ) {
    const element = target as HTMLElement | null;
    if (this.layout.compact || element?.getBoundingClientRect == null) return;
    const rect = element.getBoundingClientRect();
    const panelRect = this.panel?.nativeElement.getBoundingClientRect();
    const right =
      besidePanel && panelRect != null ? panelRect.right : rect.right;
    const left = Math.max(
      EDGE_GAP,
      Math.min(right + PANEL_GAP, window.innerWidth - TIP_WIDTH - EDGE_GAP),
    );
    const lowHalf = rect.top > window.innerHeight * 0.55;
    this.tip = {
      ...content,
      left,
      top: lowHalf ? undefined : Math.max(this.menu.navBottom, rect.top),
      bottom: lowHalf ? window.innerHeight - rect.bottom : undefined,
    };
  }

  // ─── Shortcuts ─────────────────────────────────────────────────────────

  private registerShortcuts() {
    const register = (
      action: ShortcutActionId,
      handler: () => boolean | void,
    ) => this.unregisters.push(this.shortcutService.register(action, handler));

    register(ShortcutAction.buildMenuSearch, () => {
      if (!this.menu.loaded) return false;
      this.menu.focusSearch();
      return true;
    });

    // One handler per category action, resolved when the key arrives: the
    // categories load after this component starts.
    for (const { id } of getShortcutActionsByCategory("buildMenu"))
      if (id != ShortcutAction.buildMenuSearch)
        register(id, () => {
          const category = this.menu.categories.find((c) => c.actionId == id);
          if (category == null) return false;
          this.toggleCategory(category);
          return true;
        });
  }
}
