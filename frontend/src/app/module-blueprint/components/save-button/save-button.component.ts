import { Component, EventEmitter, Input, Output } from "@angular/core";
import { MessageService } from "primeng/api";
import { BlueprintService } from "../../services/blueprint-service";

// "Save" — a bookmark, the zero-cost engagement signal: no stars to decide
// on, no comment to write, just "I want to find this again". Toggles
// optimistically and rolls back on error, like the rating widget. The saved
// list lives on the viewer's own profile ("Saved" tab).
@Component({
  selector: "app-save-button",
  templateUrl: "./save-button.component.html",
  styleUrls: ["./save-button.component.css"],
  standalone: false,
})
export class SaveButtonComponent {
  @Input() blueprintId!: string;
  @Input() saved = false;
  /** true when logged out */
  @Input() disabled = false;
  @Output() changed = new EventEmitter<boolean>();

  working = false;

  constructor(
    private blueprintService: BlueprintService,
    private messageService: MessageService,
  ) {}

  get title(): string {
    if (this.disabled) return $localize`:saveButton.login:Log in to save`;
    return this.saved
      ? $localize`:saveButton.saved:Saved to your profile — click to remove`
      : $localize`:saveButton.save:Save this blueprint to find it again`;
  }

  toggle() {
    if (this.disabled || this.working) return;
    const next = !this.saved;
    const previous = this.saved;
    this.saved = next; // optimistic; the server response confirms
    this.working = true;
    this.blueprintService.setSaved(this.blueprintId, next).subscribe({
      next: (response) => {
        this.working = false;
        this.saved = response.saved;
        this.changed.emit(response.saved);
      },
      error: () => {
        this.working = false;
        this.saved = previous;
        this.messageService.add({
          severity: "error",
          summary: next
            ? $localize`:saveButton.saveError:Could not save this blueprint`
            : $localize`:saveButton.unsaveError:Could not remove this blueprint from your saved list`,
          detail: $localize`Please try again.`,
        });
      },
    });
  }
}
