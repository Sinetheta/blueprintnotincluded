import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { By } from "@angular/platform-browser";

import { OpenBlueprintBoxComponent } from "./open-blueprint-box.component";
import { PendingImportService } from "../../services/pending-import.service";

describe("OpenBlueprintBoxComponent", () => {
  let fixture: ComponentFixture<OpenBlueprintBoxComponent>;
  let component: OpenBlueprintBoxComponent;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let pendingImport: PendingImportService;

  beforeEach(async () => {
    sessionStorage.clear();
    router = { navigate: vi.fn() };
    await TestBed.configureTestingModule({
      declarations: [OpenBlueprintBoxComponent],
      imports: [FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: Router, useValue: router }],
    }).compileComponents();
    fixture = TestBed.createComponent(OpenBlueprintBoxComponent);
    component = fixture.componentInstance;
    pendingImport = TestBed.inject(PendingImportService);
    fixture.detectChanges();
  });

  it("opens a saved blueprint's page for an id or a link", () => {
    component.text =
      "https://blueprintnotincluded.org/b/6ad640cb4fc40c07504b2725";
    component.open();
    expect(router.navigate).toHaveBeenCalledWith([
      "/blueprint",
      "6ad640cb4fc40c07504b2725",
    ]);
    expect(pendingImport.peek()).toBe(false);
  });

  it("parks a share string for the editor and goes there", () => {
    component.text = '{"friendlyname":"Kitchen","buildings":[]}';
    component.open();
    expect(router.navigate).toHaveBeenCalledWith(["/editor"]);
    expect(pendingImport.take()).toBe(
      '{"friendlyname":"Kitchen","buildings":[]}',
    );
  });

  it("treats a paste as the whole gesture", () => {
    const clipboardData = { getData: () => "6ad640cb4fc40c07504b2725" };
    const event = {
      clipboardData,
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;
    component.onPaste(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([
      "/blueprint",
      "6ad640cb4fc40c07504b2725",
    ]);
  });

  it("explains a link with no id instead of sending it to the editor", () => {
    component.text = "https://blueprintnotincluded.org/discover";
    component.open();
    fixture.detectChanges();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.error).toContain("no blueprint id");
    expect(
      fixture.debugElement.query(By.css(".open-box__hint--error")),
    ).not.toBeNull();
  });

  it("does nothing for an empty submit", () => {
    component.text = "   ";
    component.open();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.error).toBeNull();
  });

  it("reads a dropped .blueprint file and parks its text", async () => {
    const file = new File(['{"friendlyname":"dropped"}'], "x.blueprint", {
      type: "application/json",
    });
    const event = {
      preventDefault: vi.fn(),
      dataTransfer: { files: [file] },
    } as unknown as DragEvent;
    component.onDragOver({ preventDefault: vi.fn() } as unknown as DragEvent);
    expect(component.dragging).toBe(true);
    component.onDrop(event);
    expect(component.dragging).toBe(false);
    await vi.waitFor(() =>
      expect(router.navigate).toHaveBeenCalledWith(["/editor"]),
    );
    expect(pendingImport.take()).toBe('{"friendlyname":"dropped"}');
  });
});
