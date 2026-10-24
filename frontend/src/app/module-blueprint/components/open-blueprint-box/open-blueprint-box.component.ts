import { Component, ElementRef, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { PendingImportService } from "../../services/pending-import.service";
import { resolveOpenBlueprintTarget } from "./open-blueprint-target";

// "Open a blueprint": the paste-and-go box on Discover. A link or an id
// goes straight to that blueprint's page; a share string from the
// BlueprintsV2 mod, raw .blueprint text, or a dropped .blueprint file is
// parked for the editor (PendingImportService), which parses it once its
// game database is loaded. Nothing here needs an account — a visitor who
// arrives from the game with a file in hand should be looking at it in
// three seconds, not reading a login page.
@Component({
  selector: "app-open-blueprint-box",
  templateUrl: "./open-blueprint-box.component.html",
  styleUrls: ["./open-blueprint-box.component.css"],
  standalone: false,
})
export class OpenBlueprintBoxComponent {
  @ViewChild("fileInput") fileInput?: ElementRef<HTMLInputElement>;

  text = "";
  dragging = false;
  // Set only for input the box can tell is wrong (a link with no id in it);
  // a share string that turns out to be invalid is the editor's to report.
  error: string | null = null;

  constructor(
    private router: Router,
    private pendingImport: PendingImportService,
  ) {}

  open(): void {
    const target = resolveOpenBlueprintTarget(this.text);
    if (target == null) {
      this.error =
        this.text.trim().length > 0
          ? $localize`:openBox.noId:That link has no blueprint id in it.`
          : null;
      return;
    }
    this.error = null;
    if (target.kind === "saved") {
      this.router.navigate(["/blueprint", target.id]);
      return;
    }
    this.openImport(target.text);
  }

  // Paste-and-go: a paste is the whole gesture, no Enter needed. The
  // clipboard is read directly because a text input flattens the newlines
  // of a pasted .blueprint file, and the file is what should be parked.
  onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData("text") ?? "";
    if (pasted.trim().length === 0) return;
    event.preventDefault();
    this.text = pasted;
    this.open();
  }

  chooseFile(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.openFiles(input.files);
    input.value = "";
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging = true;
  }

  onDragLeave(): void {
    this.dragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    this.openFiles(event.dataTransfer?.files ?? null);
  }

  // The largest file this box will read. A whole-base .blueprint is a few
  // hundred KB; 16 MiB is far past anything the mod writes, and reading an
  // arbitrary dropped file into memory first is what this guards against.
  static readonly MAX_FILE_BYTES = 16 * 1024 * 1024;

  // The first file only. A .blueprint is JSON text; it is parked as text so
  // the editor runs it through the same tolerant import as a paste.
  private openFiles(files: FileList | null): void {
    const file = files?.[0];
    if (file == null) return;
    if (file.size > OpenBlueprintBoxComponent.MAX_FILE_BYTES) {
      this.error = $localize`:openBox.tooLarge:That file is too large to be a blueprint.`;
      return;
    }
    this.error = null;
    file.text().then(
      (content) => this.openImport(content),
      () => {
        this.error = $localize`:openBox.unreadable:That file could not be read.`;
      },
    );
  }

  private openImport(text: string): void {
    this.pendingImport.set(text);
    this.router.navigate(["/editor"]);
  }
}
