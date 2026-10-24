import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { AuthenticationService } from "./authentification-service";
import { ContentLocaleService } from "./content-locale.service";
import {
  UnsavedWorkDraft,
  UnsavedWorkService,
  UnsavedWorkSnapshot,
} from "./unsaved-work.service";
import { firstValueFrom, Subject } from "rxjs";
import { catchError, map, switchMap, tap } from "rxjs/operators";
import {
  decodeBniShareString,
  encodeBniShareString,
  RawSourceFormat,
  RocketInteriorCell,
  RocketInteriorFit,
  RocketInteriorModule,
  CameraService,
  fitRocketInterior,
  fitRocketInteriorModule,
  rocketInteriorOriginFromStation,
  OniItem,
  isBlueprintEmpty,
  placeRocketInterior,
  rocketInteriorLayout,
  rocketInteriorOriginCentredOnPoint,
  Blueprint,
  IObsBlueprintChange,
  BlueprintItem,
  Overlay,
  Display,
  BniBlueprint,
  MdbBlueprint,
  OniTemplate,
  BlueprintListItem,
  BlueprintRate,
  BlueprintRateResponse,
  BlueprintResponse,
  BlueprintDetailsResponse,
  RelatedBlueprintsResponse,
  BlueprintSummaryResponse,
  BlueprintDelete,
  BlueprintFacetsResponse,
} from "../../../../../lib/index";
import * as yaml from "js-yaml";
import sanitize from "sanitize-filename";

export type BlueprintSort =
  | "recent"
  | "trending"
  | "popular"
  | "mostForked"
  | "mostViewed"
  | "mostDownloaded";

@Injectable({ providedIn: "root" })
export class BlueprintService implements IObsBlueprintChange {
  static baseUrl: string = window.location.origin;

  id!: string | null;
  /** The AUTHORED title. Written back on save — never a translation. */
  name!: string;

  /** Server-resolved title for the open blueprint; null unless it has one. */
  private resolvedTitle: string | null = null;

  /**
   * The title to SHOW for the open blueprint, resolved for the reader's
   * content locale (spec/search-followups.md §2.5). Separate from `name`
   * precisely because `name` is a write-path value: the save dialog pre-fills
   * from it and an overwrite writes it straight back, so a translated value
   * there would rewrite the author's title. Falls back to the authored name,
   * which is also what every locally imported (never-saved) blueprint gets.
   */
  get displayName(): string {
    return this.resolvedTitle ?? this.name;
  }
  // TODO observable when modified, to be subscribed by the canvas
  // TODO not sure getter setters are useful
  blueprint_!: Blueprint;
  get blueprint() {
    return this.blueprint_;
  }
  set blueprint(value: Blueprint) {
    this.blueprint_ = value;
    //this.observersBlueprintChanged.map((observer) => { observer.blueprintChanged(this.blueprint_); })
  }
  thumbnail!: string;
  thumbnailStyle: Display;

  get savedBlueprint() {
    return this.id != null;
  }

  static blueprintService: BlueprintService;

  // TODO camera service does not need to be injected
  constructor(
    private http: HttpClient,
    private authService: AuthenticationService,
    private location: Location,
    private contentLocale: ContentLocaleService,
    private unsavedWork: UnsavedWorkService,
  ) {
    this.blueprint = new Blueprint();

    // Undo / Redo stuff
    this.blueprint.subscribeBlueprintChanged(this);
    this.resetUndoStates();

    this.observersBlueprintChanged = [];

    this.thumbnailStyle = Display.solid;

    BlueprintService.blueprintService = this;

    this.reset();
  }

  observersBlueprintChanged: IObsBlueprintChanged[];
  subscribeBlueprintChanged(observer: IObsBlueprintChanged) {
    this.observersBlueprintChanged.push(observer);
  }
  unsubscribeBlueprintChanged(observer: IObsBlueprintChanged) {
    const index = this.observersBlueprintChanged.indexOf(observer);
    if (index !== -1) this.observersBlueprintChanged.splice(index, 1);
  }

  // File-upload import failures happen in a FileReader callback where no
  // caller can catch them — surface them so the UI can toast (the paste
  // dialog handles its own errors via the returned promise)
  private importErrorObservers: ((error: unknown) => void)[] = [];
  subscribeImportError(observer: (error: unknown) => void) {
    this.importErrorObservers.push(observer);
  }
  unsubscribeImportError(observer: (error: unknown) => void) {
    const index = this.importErrorObservers.indexOf(observer);
    if (index !== -1) this.importErrorObservers.splice(index, 1);
  }
  private emitImportError(error: unknown) {
    this.importErrorObservers.map((observer) => observer(error));
  }

  openBlueprintFromUpload(fileType: BlueprintFileType, fileList: FileList) {
    if (fileList.length > 0) {
      if (!this.confirmDiscardUnsavedWork()) return;
      this.reset();

      if (fileType == BlueprintFileType.YAML)
        this.openYamlBlueprint(fileList[0]);
      else if (fileType == BlueprintFileType.JSON)
        this.openJsonBlueprint(fileList[0]);
      else if (fileType == BlueprintFileType.BSON)
        this.openBsonBlueprint(fileList[0]);
      // Each reader resets the undo stack once its file has loaded, not
      // here: the canvas taking the file in is itself a change, and a reset
      // before it would let undo step back into the previous blueprint
    }
  }

  private openYamlBlueprint(file: File) {
    const reader = new FileReader();
    reader.onloadend = () => {
      this.loadYamlBlueprint(reader.result as string);
      this.resetUndoStates();
    };
    reader.readAsText(file);
  }

  private loadYamlBlueprint(yamlString: string) {
    const templateYaml: OniTemplate = yaml.load(yamlString) as OniTemplate;

    const newBlueprint = new Blueprint();
    this.name = templateYaml.name;
    newBlueprint.importFromOni(templateYaml);

    this.observersBlueprintChanged.map((observer) => {
      observer.blueprintChanged(newBlueprint);
    });
  }

  private openJsonBlueprint(file: File) {
    const reader = new FileReader();
    reader.onloadend = () => {
      this.loadJsonBlueprint(reader.result as string).then(
        () => this.resetUndoStates(),
        (error) => {
          console.error("Blueprint import failed", error);
          this.emitImportError(error);
        },
      );
    };
    reader.readAsText(file);
  }

  // Parses either BlueprintsV2 transport: .blueprint JSON file text, or the
  // mod's clipboard share-string (base64 + 4-byte length header + gzip).
  // Throws when the text is neither.
  private static async parseBniText(
    text: string,
  ): Promise<{ bni: BniBlueprint; format: RawSourceFormat }> {
    try {
      return { bni: JSON.parse(text), format: "bpv2-json" };
    } catch {
      return {
        bni: JSON.parse(await decodeBniShareString(text)),
        format: "bpv2-sharestring",
      };
    }
  }

  // The original text is kept verbatim (rawSource) so a save can offer the
  // byte-exact file back to downloaders.
  private async loadJsonBlueprint(template: string) {
    const { bni: templateJson, format } =
      await BlueprintService.parseBniText(template);

    const newBlueprint = new Blueprint();
    this.name = templateJson.friendlyname;
    newBlueprint.importFromBni(templateJson);

    this.rawSource = template;
    this.rawSourceFormat = format;
    // Canonical serialization of the imported content: the raw text is only
    // sent with a save while the blueprint still serializes to exactly this
    // (edits invalidate the original file, which must never disagree with
    // the stored data).
    this.rawSourceMdbJson = JSON.stringify(newBlueprint.toMdbBlueprint());

    // The mod's user description maps onto our description metadata
    if (templateJson.userdesc && !this.metadata.description)
      this.metadata.description = String(templateJson.userdesc).slice(0, 500);

    this.observersBlueprintChanged.map((observer) => {
      observer.blueprintChanged(newBlueprint);
    });
  }

  // Paste-import of the mod's copy-to-clipboard share-string (also tolerates
  // raw .blueprint JSON, mirroring the mod's own tolerant import)
  async openBlueprintFromShareString(text: string) {
    // Validate before touching any state: an invalid paste must leave the
    // currently open blueprint and its metadata untouched
    await BlueprintService.parseBniText(text);
    if (!this.confirmDiscardUnsavedWork()) return;
    this.reset();
    await this.loadJsonBlueprint(text);
    this.resetUndoStates();
  }

  private openBsonBlueprint(file: File) {
    const reader = new FileReader();
    reader.onloadend = () => {
      this.loadBsonBlueprint(reader.result as ArrayBuffer);
      this.resetUndoStates();
    };
    reader.readAsArrayBuffer(file);
  }

  private loadBsonBlueprint(template: ArrayBuffer) {
    const newBlueprint = new Blueprint();
    newBlueprint.importFromBinary(template);

    this.observersBlueprintChanged.map((observer) => {
      observer.blueprintChanged(newBlueprint);
    });
  }

  public loadUrlBlueprint(url: string) {
    this.http.get(url).subscribe((value) => {
      console.warn(value);
    });
  }

  newBlueprint() {
    if (!this.confirmDiscardUnsavedWork()) return;
    this.name = "new blueprint";
    this.reset();
    const newBlueprint = new Blueprint();
    // "/editor", not "/": a reload of "/" lands on the discover page, which
    // would strand the recovery slot behind a page that never offers it.
    this.location.replaceState("/editor");
    this.observersBlueprintChanged.map((observer) => {
      observer.blueprintChanged(newBlueprint);
    });
    this.resetUndoStates();
    // TODO firing the observable and then restting the states is duplicated. fix this
  }

  // ─── Unsaved work (recovery slot) ───────────────────────────────────────

  // Edits since the open blueprint last matched the server (or the file it
  // was imported from): the undo index has moved away from the clean mark.
  // -1 means "never clean" — resumed work is unsaved by definition.
  private cleanUndoIndex = 0;
  get isDirty(): boolean {
    return this.undoIndex !== this.cleanUndoIndex;
  }

  // The one explicit "are you sure" in the editor: New, Upload and paste
  // replace what is on the canvas in place, so the user is asked before
  // unsaved work goes. Confirming also releases the recovery slot, which
  // otherwise would offer the discarded work back on the next load.
  private confirmDiscardUnsavedWork(): boolean {
    if (!this.isDirty || this.blueprint.blueprintItems.length === 0)
      return true;
    const confirmed = window.confirm(
      $localize`Discard your unsaved work? This blueprint has changes that have not been saved.`,
    );
    if (confirmed) this.unsavedWork.discardIfOwned();
    return confirmed;
  }

  private unsavedWorkDraft(): UnsavedWorkDraft | null {
    const mdb = this.undoStates[this.undoIndex];
    if (mdb == null || mdb.blueprintItems.length === 0) return null;
    return {
      id: this.id,
      name: this.name ?? "new blueprint",
      isPublished: this.isPublished,
      metadata: { ...this.metadata },
      mdb,
    };
  }

  // Called on every change: the undo snapshot just taken is what gets
  // stored, so persistence costs one JSON.stringify per debounce window.
  // Dirtiness is checked again when the debounce fires: opening a blueprint
  // emits changes (dirty) and only then resets the undo stack (clean), and
  // the write scheduled in between would otherwise park every blueprint that
  // was merely viewed in the slot.
  private persistUnsavedWork() {
    if (!this.isDirty) return;
    this.unsavedWork.schedule(() =>
      this.isDirty ? this.unsavedWorkDraft() : null,
    );
  }

  // Store the open blueprint right now regardless of dirtiness — before the
  // editor hands off to the login page, an unedited import or fork is just
  // as lost as an edited one. Honours slot ownership like any other write.
  stashForLogin(): boolean {
    const draft = this.unsavedWorkDraft();
    if (draft == null) return false;
    return this.unsavedWork.store(draft);
  }

  // Load a recovery snapshot as the open blueprint. It is unsaved from the
  // start (clean mark -1) so it keeps being persisted and the save dialog
  // treats it as the edit it is.
  resumeUnsavedWork(snapshot: UnsavedWorkSnapshot) {
    this.reset();
    this.id = snapshot.id;
    this.name = snapshot.name;
    this.isPublished = snapshot.isPublished;
    this.metadata = { ...snapshot.metadata };
    const blueprint = new Blueprint();
    blueprint.importFromMdb(snapshot.mdb);
    this.location.replaceState(this.id != null ? `/b/${this.id}` : "/editor");
    this.observersBlueprintChanged.map((observer) => {
      observer.blueprintChanged(blueprint);
    });
    this.resetUndoStates();
    this.cleanUndoIndex = -1;
    this.unsavedWork.claim();
  }

  reset() {
    this.id = null;
    // A resolved title belongs to the blueprint it came from — leaving it set
    // would title the next one with the previous one's translation.
    this.resolvedTitle = null;
    this.myRating = null;
    this.rating = 0;
    this.nbRatings = 0;
    this.metadata = {};
    this.stationOrigin = null;
    this.requiredDlcs = null;
    this.clearRawSource();
  }

  // Verbatim BlueprintsV2 import text (file or share-string) held for the
  // next save; see loadJsonBlueprint. serverHasRawSource mirrors whether the
  // currently open saved blueprint has a stored raw on the server.
  rawSource: string | null = null;
  rawSourceFormat: RawSourceFormat | null = null;
  private rawSourceMdbJson: string | null = null;
  serverHasRawSource = false;
  private serverRawSourceFormat: string | null = null;
  private serverRawSourceMdbJson: string | null = null;

  private clearRawSource() {
    this.rawSource = null;
    this.rawSourceFormat = null;
    this.rawSourceMdbJson = null;
    this.serverHasRawSource = false;
    this.serverRawSourceFormat = null;
    this.serverRawSourceMdbJson = null;
  }

  // The held raw text, provided the open blueprint still serializes to
  // exactly the import it came from — null once the user edits anything.
  // Exact string equality, not a hash: a collision must never let a stale
  // original ship with edited data.
  getValidRawSource(): { text: string; format: RawSourceFormat } | null {
    if (this.rawSource == null || this.rawSourceFormat == null) return null;
    if (
      this.rawSourceMdbJson !== JSON.stringify(this.blueprint.toMdbBlueprint())
    )
      return null;
    return { text: this.rawSource, format: this.rawSourceFormat };
  }

  // Download filename extension for a stored raw-source format
  static rawSourceExtension(format: string | null | undefined): string {
    return format === "bpv2-sharestring" ? ".txt" : ".blueprint";
  }

  suppressChanges!: boolean;
  undoStates!: MdbBlueprint[];
  undoIndex!: number;
  undo() {
    const tempUndoIndex = this.undoIndex - 1;

    if (tempUndoIndex < 0 || tempUndoIndex >= this.undoStates.length) return;

    this.undoIndex = tempUndoIndex;
    this.reloadUndoIndex();
  }

  redo() {
    const tempUndoIndex = this.undoIndex + 1;

    if (tempUndoIndex >= this.undoStates.length) return;

    this.undoIndex = tempUndoIndex;
    this.reloadUndoIndex();
  }

  reloadUndoIndex() {
    const newBlueprint = new Blueprint();
    newBlueprint.importFromMdb(this.undoStates[this.undoIndex]);

    this.suppressChanges = true;
    this.blueprint.destroyAndCopyItems(newBlueprint);
    this.blueprint.refreshOverlayInfo();
    this.suppressChanges = false;
    // Undo/redo moves the open state without a change event
    this.persistUnsavedWork();
  }

  resetUndoStates() {
    this.suppressChanges = false;
    this.undoStates = [];
    this.undoIndex = 0;
    this.cleanUndoIndex = 0;

    this.blueprintChanged();
  }

  itemDestroyed() {}
  itemAdded(_blueprintItem: BlueprintItem) {}
  blueprintChanged() {
    // Before the undo/redo early return: undoing a station move moves the hull back too
    this.followStation();

    // We don't want to add a state if the changes come from the undo / redo action
    if (this.suppressChanges) return;

    // If we are in the middle of the states, doing anythings scraps the further redos
    if (this.undoIndex < this.undoStates.length - 1)
      this.undoStates.splice(this.undoIndex + 1);

    this.undoStates.push(this.blueprint.toMdbBlueprint());

    while (this.undoStates.length > 50) {
      this.undoStates.splice(0, 1);
      // The clean state fell off the stack: nothing on it is clean any more
      this.cleanUndoIndex =
        this.cleanUndoIndex > 0 ? this.cleanUndoIndex - 1 : -1;
    }

    this.undoIndex = this.undoStates.length - 1;
    this.persistUnsavedWork();
  }

  // TODO return observable here so we can close the browse window on success?
  openBlueprintFromId(id: string) {
    this.location.replaceState(`/b/${id}`);
    this.getBlueprint(id).subscribe({
      next: this.handleGetBlueprint.bind(this),
      error: this.handleGetBlueprintError.bind(this),
    });
  }

  handleGetBlueprint(blueprint: Blueprint | undefined) {
    if (!blueprint) return;
    this.observersBlueprintChanged.map((observer) => {
      observer.blueprintChanged(blueprint);
    });
    this.resetUndoStates();
  }

  handleGetBlueprintError(error: any) {
    // TODO toast here
    console.error(error);
  }

  getBlueprint(id: string) {
    // Token is optional but required to open your own drafts — the backend
    // 404s draft blueprints for anonymous viewers
    const request = this.http
      .get<BlueprintResponse>(
        this.contentLocale.appendToUrl(`/api/getblueprint/${id}`),
        this.authService.isLoggedIn()
          ? {
              headers: {
                Authorization: `Bearer ${this.authService.getToken()}`,
              },
            }
          : {},
      )
      .pipe(
        map((response: BlueprintResponse) => {
          if (response.data) {
            const blueprint = new Blueprint();

            this.id = response.id;
            this.name = response.name;
            this.resolvedTitle = response.displayName ?? null;
            this.nbRatings = response.nbRatings;
            this.rating = response.rating;
            this.myRating = response.myRating;
            this.isPublished = response.isPublished;
            this.clearRawSource();
            this.serverHasRawSource = response.hasRawSource === true;
            this.serverRawSourceFormat = response.rawSourceFormat ?? null;
            this.metadata = {
              category: response.category ?? null,
              subcategory: response.subcategory ?? null,
              description: response.description ?? null,
              modded: response.modded ?? null,
              rocketInterior: response.rocketInterior ?? null,
              rocketInteriorOrigin: response.rocketInteriorOrigin ?? null,
            };
            // Measured afresh against this blueprint on its first change event
            this.stationOrigin = null;
            this.requiredDlcs = response.requiredDlcs ?? [];
            blueprint.importFromMdb(response.data);
            // Serialize the opened content through the same serializer the
            // editor uses, so the Download menu can tell "unedited since
            // open" and serve the server's byte-exact raw copy
            if (this.serverHasRawSource)
              this.serverRawSourceMdbJson = JSON.stringify(
                blueprint.toMdbBlueprint(),
              );
            return blueprint;
          }
          return undefined;
        }),
      );

    return request;
  }

  // Downloads the game-ready .blueprint (json) file for a saved blueprint
  // without disturbing the editor's currently-open blueprint state — used by
  // the details page, which never opens the blueprint into the editor.
  // When the server holds the verbatim uploaded file it is served byte-exact
  // (spec/blueprintsv2-import-spec.md §8); otherwise the server generates it.
  //
  // Never generated here: only the editor loads the game database, so a
  // Blueprint built on the details page resolves no building id, skips every
  // building as unknown and exports an empty `buildings` array — a file that
  // downloads fine and holds nothing but its notes.
  downloadBlueprintFile(id: string, friendlyName: string) {
    const auth = this.authService.isLoggedIn()
      ? {
          headers: {
            Authorization: `Bearer ${this.authService.getToken()}`,
          },
        }
      : {};

    return this.http
      .get<BlueprintResponse>(
        // No `lang=`: this fetch produces a file, not a display surface, and
        // the filename comes from the caller's authored name either way.
        `/api/getblueprint/${id}`,
        auth,
      )
      .pipe(
        switchMap((response: BlueprintResponse) => {
          // The endpoint the in-game mod fetches by id. It honours the token
          // (an owner's draft) and records the download server-side.
          const generate = () =>
            this.http
              .get(`/api/getblueprintmod/${id}`, {
                ...auth,
                responseType: "text",
              })
              .pipe(
                tap((file: string) => {
                  BlueprintService.saveTextFile(
                    file,
                    sanitize(friendlyName) + ".blueprint",
                  );
                }),
              );

          if (response.hasRawSource)
            return this.http
              .get(`/api/blueprints/${id}/raw`, { responseType: "text" })
              .pipe(
                tap((raw: string) => {
                  BlueprintService.saveTextFile(
                    raw,
                    sanitize(friendlyName) +
                      BlueprintService.rawSourceExtension(
                        response.rawSourceFormat,
                      ),
                  );
                  // The raw endpoint records the download server-side —
                  // no beacon needed
                }),
                // The raw copy may have vanished (e.g. concurrent edit) —
                // still deliver a generated file rather than failing
                catchError(() => generate()),
              );

          return generate();
        }),
      );
  }

  // Editor "Download → Blueprint (json)": serve byte-exact raw when the open
  // blueprint is an unedited import (local raw text, or the server's stored
  // raw for a blueprint opened by id); otherwise generate from the parsed
  // model as before.
  exportBlueprintFile(friendlyName: string) {
    const localRaw = this.getValidRawSource();
    if (localRaw != null) {
      BlueprintService.saveTextFile(
        localRaw.text,
        sanitize(friendlyName) +
          BlueprintService.rawSourceExtension(localRaw.format),
      );
      if (this.id != null) this.trackDownload(this.id);
      return;
    }

    const generate = () => {
      const bniBlueprint = this.blueprint.toBniBlueprint(
        friendlyName,
        this.metadata.description,
      );
      BlueprintService.saveTextFile(
        JSON.stringify(bniBlueprint),
        sanitize(friendlyName) + ".blueprint",
      );
      if (this.id != null) this.trackDownload(this.id);
    };

    if (
      this.id != null &&
      this.serverHasRawSource &&
      this.serverRawSourceMdbJson != null &&
      this.serverRawSourceMdbJson ===
        JSON.stringify(this.blueprint.toMdbBlueprint())
    ) {
      const extension = BlueprintService.rawSourceExtension(
        this.serverRawSourceFormat,
      );
      this.http
        .get(`/api/blueprints/${this.id}/raw`, { responseType: "text" })
        .subscribe({
          next: (raw) => {
            // Raw endpoint records the download server-side
            BlueprintService.saveTextFile(
              raw,
              sanitize(friendlyName) + extension,
            );
          },
          // The raw copy may have vanished (e.g. concurrent edit) — fall
          // back to the generated file rather than failing the download
          error: () => generate(),
        });
      return;
    }

    generate();
  }

  // Editor "Download → Blueprint (copy text)": the inverse of the paste-import
  // above — the mod's clipboard share-string, written to the system clipboard.
  //
  // Unlike exportBlueprintFile this never serves the held raw source, even for
  // an unedited import. Renaming a blueprint does not invalidate rawSource (the
  // freshness check compares toMdbBlueprint(), which carries no name), so the
  // verbatim text can hold a stale friendlyname — and a share-string has no
  // filename to correct it with, so the old name would follow the blueprint
  // back into the game. Always generating keeps the pasted name truthful.
  async copyBlueprintShareString(friendlyName: string) {
    // Checked before encoding: absent outside a secure context, and there is
    // no point gzipping a blueprint we cannot deliver.
    const clipboard = navigator.clipboard;
    if (!clipboard) throw new Error("Clipboard API unavailable");

    // Snapshotted before the awaits below: the beacon must credit the
    // blueprint we serialized, not whatever happens to be open by the time
    // the clipboard write resolves.
    const exportedBlueprintId = this.id;
    const json = JSON.stringify(
      this.blueprint.toBniBlueprint(friendlyName, this.metadata.description),
    );
    const encoded = encodeBniShareString(json);

    await BlueprintService.writeClipboardText(clipboard, encoded);

    // Same accounting as a file download — both are the user taking a copy.
    if (exportedBlueprintId != null) this.trackDownload(exportedBlueprintId);
  }

  // Details page "Copy for game": the share-string for a saved blueprint, without
  // opening it in the editor. With Ctrl+V paste in the Blueprints mod this is the
  // shortest path from the site into a running game.
  //
  // Serves the stored raw upload when the server has one -- a share-string verbatim,
  // a .blueprint file as the share-string encoding of its exact text -- and a
  // generated export otherwise, the same preference downloadBlueprintFile applies
  // to the file. The raw copy is worth preferring: it still holds everything the
  // parsed model drops, most of all buildings from mods the site does not know.
  //
  // That is the opposite call from copyBlueprintShareString above, deliberately.
  // The editor always generates because its blueprint may have been renamed in
  // this very session; here the reader is taking a copy of a stored blueprint as
  // its author uploaded it, and the cost of a raw copy is only that a blueprint
  // renamed on the site pastes into the game under its original in-game name.
  //
  // The generated export comes from the server, like the file download.
  async copySavedBlueprintShareString(id: string) {
    const clipboard = navigator.clipboard;
    if (!clipboard) throw new Error("Clipboard API unavailable");

    await BlueprintService.writeClipboardText(
      clipboard,
      this.savedBlueprintShareString(id),
    );
    // Both endpoints behind the string record the download server-side
  }

  private async savedBlueprintShareString(id: string): Promise<string> {
    const auth = this.authService.isLoggedIn()
      ? {
          headers: {
            Authorization: `Bearer ${this.authService.getToken()}`,
          },
        }
      : {};
    const response = await firstValueFrom(
      this.http.get<BlueprintResponse>(`/api/getblueprint/${id}`, auth),
    );

    if (response.hasRawSource) {
      try {
        const raw = await firstValueFrom(
          this.http.get(`/api/blueprints/${id}/raw`, { responseType: "text" }),
        );
        return response.rawSourceFormat === "bpv2-sharestring"
          ? raw
          : await encodeBniShareString(raw);
      } catch {
        // The raw copy may have vanished (e.g. concurrent edit) -- still
        // deliver a generated string rather than failing the copy.
      }
    }

    // Server-generated, for the reason downloadBlueprintFile gives: built
    // here, without the game database, it would hold no buildings.
    return encodeBniShareString(
      await firstValueFrom(
        this.http.get(`/api/getblueprintmod/${id}`, {
          ...auth,
          responseType: "text",
        }),
      ),
    );
  }

  // Safari only honours a clipboard write that *starts* inside the user
  // gesture, and gzipping is async — so where write() and ClipboardItem exist
  // we hand over the still-pending promise, keeping the write itself within
  // the gesture. Firefox shipped both long after the other engines, so
  // writeText stays as a fallback rather than being replaced outright.
  private static async writeClipboardText(
    clipboard: Clipboard,
    text: Promise<string>,
  ) {
    const type = "text/plain";

    if (typeof ClipboardItem !== "undefined" && clipboard.write) {
      try {
        await clipboard.write([
          new ClipboardItem({
            [type]: text.then((t) => new Blob([t], { type })),
          }),
        ]);
        return;
      } catch {
        // A browser that has ClipboardItem but rejects a promise-backed one
        // still gets a working copy through writeText below. If the encode
        // itself failed, awaiting it again rethrows rather than silently
        // writing nothing.
      }
    }

    if (!clipboard.writeText) throw new Error("Clipboard API unavailable");
    await clipboard.writeText(await text);
  }

  static saveTextFile(text: string, filename: string) {
    const url = URL.createObjectURL(new Blob([text], {}));
    const a = document.createElement("a");
    document.body.append(a);
    a.download = filename;
    a.href = url;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Meta only (no blueprint data) — for the details page. Token is optional;
  // the backend uses it to personalize myRating/ownedByMe.
  getBlueprintDetails(id: string) {
    return this.http.get<BlueprintDetailsResponse>(
      this.contentLocale.appendToUrl(`/api/blueprints/${id}`),
      this.authService.isLoggedIn()
        ? {
            headers: {
              Authorization: `Bearer ${this.authService.getToken()}`,
            },
          }
        : {},
    );
  }

  // The spec sheet (footprint, per-building counts, material totals) for the
  // details page. Token is optional; it is what lets an owner see a draft's.
  getBlueprintSummary(id: string) {
    return this.http.get<BlueprintSummaryResponse>(
      `/api/blueprints/${id}/summary`,
      this.authService.isLoggedIn()
        ? {
            headers: {
              Authorization: `Bearer ${this.authService.getToken()}`,
            },
          }
        : {},
    );
  }

  // "You might also like" shelf for the details page. Token is optional; the
  // backend uses it to personalize myRating/ownedByMe on the returned cards.
  getRelatedBlueprints(id: string) {
    return this.http.get<RelatedBlueprintsResponse>(
      this.contentLocale.appendToUrl(`/api/blueprints/${id}/related`),
      this.authService.isLoggedIn()
        ? {
            headers: {
              Authorization: `Bearer ${this.authService.getToken()}`,
            },
          }
        : {},
    );
  }

  // Shared by getBlueprints and getBlueprintFacets: both endpoints accept the
  // same filter params and validate them identically server-side, so the
  // query-string mapping lives in one place rather than two.
  private buildFilterQueryParams(filters: {
    filterUserId?: string | null;
    filterName?: string | null;
    filterCategory?: string | null;
    filterSubcategory?: string | null;
    filterModded?: boolean | null;
    filterForkedFrom?: string | null;
    filterRatedBy?: string | null;
    filterRooms?: string | null;
    filterDlcs?: string | null;
    filterExcludeDlcs?: string | null;
  }): string {
    const parts: string[] = [];
    if (filters.filterUserId != null)
      parts.push("filterUserId=" + filters.filterUserId);
    if (filters.filterName != null)
      parts.push("filterName=" + filters.filterName);
    if (filters.filterCategory != null)
      parts.push("category=" + filters.filterCategory);
    if (filters.filterSubcategory != null)
      parts.push("subcategory=" + filters.filterSubcategory);
    if (filters.filterModded != null)
      parts.push("modded=" + filters.filterModded);
    if (filters.filterForkedFrom != null)
      parts.push("forkedFrom=" + filters.filterForkedFrom);
    if (filters.filterRatedBy != null)
      parts.push("ratedBy=" + filters.filterRatedBy);
    if (filters.filterRooms != null) parts.push("rooms=" + filters.filterRooms);
    if (filters.filterDlcs != null) parts.push("dlc=" + filters.filterDlcs);
    if (filters.filterExcludeDlcs != null)
      parts.push("excludeDlc=" + filters.filterExcludeDlcs);
    return parts.join("&");
  }

  getBlueprints(
    olderThan: Date | null,
    filterUserId: string | null,
    filterName: string | null,
    filterCategory?: string | null,
    filterSubcategory?: string | null,
    sort?: BlueprintSort,
    skip?: number,
    filterModded?: boolean | null,
    filterForkedFrom?: string | null,
    filterRatedBy?: string | null,
    filterRooms?: string | null,
    filterDlcs?: string | null,
    filterExcludeDlcs?: string | null,
    // Duplicate collapse in search results — server default is ON, so only
    // an opt-out is sent (keeps the common URL stable for the CDN).
    collapse?: boolean,
  ) {
    // olderthan is a cache-buster when it isn't doing real work, so send it
    // only where it is the pagination cursor: the recent sort past page 1
    // (null = first page = "older than now", the server default). Count
    // sorts paginate via skip and ignore it entirely — and so does a name
    // search, whose results are relevance-ordered (a createdAt cursor over a
    // non-chronological order would skip and repeat items). Stable URLs let
    // the CDN actually serve anonymous browse requests from the edge.
    const searching = filterName != null && filterName !== "";
    const usesCursor = (sort == null || sort === "recent") && !searching;
    const parameterOlderThan =
      usesCursor && olderThan != null
        ? "olderthan=" + olderThan.getTime().toString()
        : "";

    let parameterSort = "";
    if (sort != null && sort !== "recent") parameterSort = "&sort=" + sort;
    if (!usesCursor && skip != null) parameterSort += "&skip=" + skip;

    const filterParams = this.buildFilterQueryParams({
      filterUserId,
      filterName,
      filterCategory,
      filterSubcategory,
      filterModded,
      filterForkedFrom,
      filterRatedBy,
      filterRooms,
      filterDlcs,
      filterExcludeDlcs,
    });

    const parameterCollapse = collapse === false ? "&collapse=false" : "";

    const parameters = (
      parameterOlderThan +
      (filterParams.length > 0 ? "&" + filterParams : "") +
      parameterSort +
      parameterCollapse
    ).replace(/^&/, "");

    // General browsing is a public, viewer-independent feed — always hit the
    // anonymous endpoint (no token) so Cloudflare serves it from the edge for
    // logged-in users too. The secure endpoint is only for lists that depend
    // on who is asking: a specific user's list (own/admin view includes
    // drafts) and the private rated-by-me list.
    const needsAuth = filterUserId != null || filterRatedBy != null;
    const request =
      needsAuth && this.authService.isLoggedIn()
        ? this.http.get(
            this.contentLocale.appendToUrl(
              "/api/getblueprintsSecure?" + parameters,
            ),
            {
              headers: {
                Authorization: `Bearer ${this.authService.getToken()}`,
              },
            },
          )
        : this.http.get(
            this.contentLocale.appendToUrl("/api/getblueprints?" + parameters),
          );

    request.pipe(
      map((response: any) => {
        const blueprintListItems = response as BlueprintListItem[];
        return blueprintListItems;
      }),
    );

    return request;
  }

  // Self-excluding ("drill-down") facet counts for the Discover sidebar —
  // GET /api/blueprintfacets(Secure), same params/validation as getBlueprints.
  // Takes an options object rather than positional args: getBlueprints'
  // thirteen-and-counting positional params are past the point a breaking
  // shift (see the step-4 gameVersion removal) is tolerable, so this new
  // method starts clean instead of adding a fourteenth position.
  getBlueprintFacets(options: {
    filterUserId?: string | null;
    filterName?: string | null;
    filterCategory?: string | null;
    filterSubcategory?: string | null;
    filterModded?: boolean | null;
    filterForkedFrom?: string | null;
    filterRatedBy?: string | null;
    filterRooms?: string | null;
    filterDlcs?: string | null;
    filterExcludeDlcs?: string | null;
  }) {
    const parameters = this.buildFilterQueryParams(options);

    // Same viewer-dependence rule as getBlueprints: a specific user's list
    // (own/admin view includes drafts) or the private rated-by-me list needs
    // the secure endpoint; general browsing stays anonymous/edge-cacheable.
    const needsAuth =
      options.filterUserId != null || options.filterRatedBy != null;
    const url =
      needsAuth && this.authService.isLoggedIn()
        ? "/api/blueprintfacetsSecure?" + parameters
        : "/api/blueprintfacets?" + parameters;

    return this.http.get<BlueprintFacetsResponse>(
      url,
      needsAuth && this.authService.isLoggedIn()
        ? {
            headers: { Authorization: `Bearer ${this.authService.getToken()}` },
          }
        : {},
    );
  }

  deleteBlueprint(id: string) {
    const body: BlueprintDelete = { blueprintId: id };

    return this.http.post("/api/deleteblueprint", body, {
      headers: { Authorization: `Bearer ${this.authService.getToken()}` },
    });
  }

  metadata: Partial<
    Pick<
      SaveBlueprintMessage,
      | "category"
      | "subcategory"
      | "description"
      | "modded"
      | "rocketInterior"
      | "rocketInteriorOrigin"
    >
  > = {};

  // The rocket-interior choice is the one piece of metadata with a live
  // rendering, so it has a setter that announces the change: the editor menu
  // and the save dialog both offer it, and whichever one changed it, the
  // other's state has to follow. Emits the new value (null = none).
  //
  // The hull's origin is resolved HERE, once, and stored with the choice: a
  // blueprint with one control station is aligned on it either way, but one
  // without would otherwise be re-centred on its bounding box every frame,
  // and the hull would hop each time a brick was placed. Resolved from the
  // blueprint as it is when the module is picked; the origin a station gives
  // is stored too, so the hull stays put even if the station is later removed.
  // A stored origin outranks the station when drawing (placeRocketInterior),
  // so followStation keeps a station-given origin moving with its station.
  // `origin` is for a caller that already knows it (the fitter's suggestion).
  readonly rocketInteriorChanged$ = new Subject<RocketInteriorModule | null>();
  setRocketInterior(
    module: RocketInteriorModule | null,
    origin?: RocketInteriorCell,
  ) {
    this.metadata.rocketInterior = module;
    this.metadata.rocketInteriorOrigin =
      module == null
        ? null
        : origin != null
          ? { x: origin.x, y: origin.y }
          : this.resolveRocketInteriorOrigin(module);
    this.stationOrigin = this.currentStationOrigin();
    this.rocketInteriorChanged$.next(module);
  }

  // The module and hull origin the blueprint itself makes plain (a capture, a
  // hand-drawn hull, or a station with everything around it), or null. Offered
  // on a blueprint's first save; never applied over a choice already made.
  suggestRocketInterior(): RocketInteriorFit | null {
    if (this.blueprint == null || OniItem.oniItemsMap == null) return null;
    return fitRocketInterior(
      this.blueprint.blueprintItems,
      this.blueprint.digCommands,
    );
  }

  // Where the station put the hull at the last change, for followStation.
  private stationOrigin: RocketInteriorCell | null = null;

  private currentStationOrigin(): RocketInteriorCell | null {
    const module = this.metadata.rocketInterior;
    if (module == null || this.blueprint == null) return null;
    return rocketInteriorOriginFromStation(
      rocketInteriorLayout(module),
      this.blueprint.blueprintItems,
    );
  }

  // The stored origin wins over the station when the hull is drawn, which is
  // what keeps a hand-drawn hull put while its station sits wherever the
  // author left it. But a stored origin that the station gave should keep
  // following the station, as it did when the station won outright: moving a
  // capture's station (or undoing a move) takes the hull with it.
  //
  // "The station gave it" is read off the blueprint, not remembered: the
  // stored origin sat on the station, and no hull drawn out of tiles holds it
  // there. A hand-drawn hull whose station happens to be in the template's
  // spot stays on its walls when the station moves — and that holds after a
  // reload too, where no record of how the origin was chosen survives.
  private followStation() {
    const previous = this.stationOrigin;
    const current = this.currentStationOrigin();
    this.stationOrigin = current;
    const stored = this.metadata.rocketInteriorOrigin;
    const module = this.metadata.rocketInterior;
    if (previous == null || current == null || stored == null) return;
    if (module == null) return;
    if (stored.x !== previous.x || stored.y !== previous.y) return;
    if (current.x === previous.x && current.y === previous.y) return;
    if (OniItem.oniItemsMap != null) {
      const drawn = fitRocketInteriorModule(
        module,
        this.blueprint.blueprintItems,
      );
      if (drawn != null && drawn.x === stored.x && drawn.y === stored.y) return;
    }
    this.metadata.rocketInteriorOrigin = { x: current.x, y: current.y };
  }

  private resolveRocketInteriorOrigin(
    module: RocketInteriorModule,
  ): RocketInteriorCell | null {
    if (this.blueprint == null) return null;
    // A hull the author drew out of tiles: put the template on it. Most rocket
    // blueprints stored before the facade existed are drawn like this, with
    // the station wherever the author liked.
    if (OniItem.oniItemsMap != null) {
      const drawn = fitRocketInteriorModule(
        module,
        this.blueprint.blueprintItems,
      );
      if (drawn != null) return drawn;
    }
    // An empty blueprint has nothing to centre on, so the hull goes in the
    // middle of the view the author is looking at — not the world origin,
    // which, with the hull spanning negative cells, lands wherever the camera
    // happens to be and read as "stuck in the top-left corner".
    if (isBlueprintEmpty(this.blueprint)) {
      const centre = BlueprintService.viewportCentreCell();
      if (centre != null)
        return rocketInteriorOriginCentredOnPoint(
          rocketInteriorLayout(module),
          centre,
        );
    }
    const fromStation = rocketInteriorOriginFromStation(
      rocketInteriorLayout(module),
      this.blueprint.blueprintItems,
    );
    if (fromStation != null) return fromStation;
    const placement = placeRocketInterior(
      module,
      this.blueprint,
      this.metadata.rocketInteriorOrigin ?? null,
    );
    return { x: placement.origin.x, y: placement.origin.y };
  }

  // The world point (cell units) at the middle of the editor canvas, or null
  // without a live camera or window (unit tests, server). Inverts the
  // drawPixi mapping: sx = (px + offset.x) * zoom, sy = (offset.y + 1 - py) * zoom.
  private static viewportCentreCell(): { x: number; y: number } | null {
    const camera = CameraService.cameraService;
    if (camera == null || typeof window === "undefined") return null;
    const zoom = camera.currentZoom;
    if (!(zoom > 0)) return null;
    return {
      x: window.innerWidth / 2 / zoom - camera.cameraOffset.x,
      y: camera.cameraOffset.y + 1 - window.innerHeight / 2 / zoom,
    };
  }

  // The server-derived `requiredDlcs` of the blueprint last opened from the
  // site, as the editor-open response reported it. null for anything that did
  // not come through that response — a new blueprint, a file or share-string
  // import — so a stale value from a previous open can never describe the
  // current content. Read by the editor's hidden-pack notice; never written
  // back anywhere.
  requiredDlcs: string[] | null = null;

  saveBlueprint(overwrite: boolean, publish?: boolean | null) {
    const saveBlueprint = this.blueprint.toMdbBlueprint();
    // The undo state being saved: the user can keep editing while the
    // request is in flight, and only this state becomes clean, not theirs
    const savedState = this.undoStates[this.undoIndex];

    const body = new SaveBlueprintMessage();
    body.overwrite = overwrite;
    body.name = this.name;
    body.blueprint = saveBlueprint;
    body.thumbnail = this.thumbnail;
    // publish: true publishes in the same save; null/undefined keeps the
    // current state (new blueprints start as drafts server-side)
    if (publish != null) body.publish = publish;
    // Copy-as-fork attribution: when the editor started from an existing
    // blueprint, name it as the source — the server records forkedFrom when
    // the save creates a copy because the requester isn't the owner
    if (this.id != null) body.sourceBlueprintId = this.id;
    // Byte-exact round-trip: send the verbatim imported file only while the
    // saved content still matches it; an edited blueprint saves without raw
    // (the server clears any previously stored raw on such saves)
    const validRaw = this.getValidRawSource();
    if (validRaw != null) {
      body.rawSource = validRaw.text;
      body.rawSourceFormat = validRaw.format;
    }
    Object.assign(body, this.metadata);
    const request = this.http
      .post("/api/uploadblueprint", body, {
        headers: { Authorization: `Bearer ${this.authService.getToken()}` },
      })
      .pipe(
        map((response: any) => {
          if (response.id) {
            const isNewBlueprint = this.id == null;
            this.id = response.id;
            this.location.replaceState(`/b/${this.id}`);
            if (publish === true) this.isPublished = true;
            else if (isNewBlueprint) this.isPublished = false;
            // The save either stored the raw import verbatim or cleared any
            // previously stored raw (edited content)
            this.serverHasRawSource = validRaw != null;
            this.serverRawSourceFormat = validRaw?.format ?? null;
            this.serverRawSourceMdbJson =
              validRaw != null ? this.rawSourceMdbJson : null;
            // The server has the saved state now. If nothing changed
            // meanwhile there is nothing left to recover; otherwise the
            // newer edits stay unsaved (and persisted)
            const savedIndex = this.undoStates.indexOf(savedState);
            this.cleanUndoIndex = savedIndex;
            if (savedIndex === this.undoIndex)
              this.unsavedWork.discardIfOwned();
          }
          return response;
        }),
      );

    return request;
  }

  // Publish state of the currently loaded blueprint (undefined until loaded)
  isPublished?: boolean;

  // Returns the observable: callers need success/error to update their UI
  // (rateBlueprint does the same)
  setPublished(blueprintId: string, publish: boolean) {
    const action = publish ? "publish" : "unpublish";
    return this.http
      .post<{ isPublished: boolean }>(
        `/api/blueprints/${blueprintId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${this.authService.getToken()}` } },
      )
      .pipe(
        map((response) => {
          if (blueprintId === this.id) this.isPublished = response.isPublished;
          return response;
        }),
      );
  }

  // Fire-and-forget beacon: the .blueprint file export is client-side only,
  // so the server can't see it — report it for the download counter. Works
  // logged out (the endpoint is anonymous) and must never bother the user
  // on failure.
  trackDownload(blueprintId: string) {
    this.http
      .post(
        `/api/blueprints/${blueprintId}/downloads`,
        {},
        this.authService.isLoggedIn()
          ? {
              headers: {
                Authorization: `Bearer ${this.authService.getToken()}`,
              },
            }
          : {},
      )
      .subscribe({ error: () => {} });
  }

  nbRatings!: number;
  rating!: number;
  myRating!: number | null;
  rateBlueprint(blueprintId: string, rating: number) {
    const body: BlueprintRate = {
      blueprintId: blueprintId,
      rating: rating,
    };

    // Response carries the fresh aggregate so widgets can update in place
    return this.http.post<BlueprintRateResponse>("/api/rateblueprint", body, {
      headers: { Authorization: `Bearer ${this.authService.getToken()}` },
    });
  }
}

export class SaveBlueprintMessage {
  overwrite!: boolean;
  name!: string;
  blueprint!: MdbBlueprint;
  thumbnail!: string;
  // true = publish with this save; omitted = keep current publish state
  publish?: boolean;
  // id of the blueprint the editor was opened from; the server records
  // forkedFrom when the save creates a copy (requester isn't the owner)
  sourceBlueprintId?: string;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  modded?: boolean | null;
  // The habitat module the blueprint was built in, for the rocket-interior
  // facade (lib rocket-interior.ts); null = none. Lives on the site's record,
  // not in the blueprint data, so it rides with the other metadata.
  rocketInterior?: RocketInteriorModule | null;
  // The hull's template origin cell as resolved when the module was chosen
  // (BlueprintService.setRocketInterior); null with no module.
  rocketInteriorOrigin?: RocketInteriorCell | null;
  // Verbatim BlueprintsV2 import text, present only when the saved data still
  // equals the imported content (byte-exact round-trip, §8)
  rawSource?: string;
  rawSourceFormat?: RawSourceFormat;
}

export enum BlueprintFileType {
  YAML,
  JSON,
  BSON,
}

export interface IObsBlueprintChanged {
  blueprintChanged(blueprint: Blueprint): void;
}

export interface ExportImageOptions {
  gridLines: boolean;
  selectedOverlays: Overlay[];
  pixelsPerTile: number;
}
