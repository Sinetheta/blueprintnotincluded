import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { By } from "@angular/platform-browser";
import { of, throwError } from "rxjs";
import { MessageService } from "primeng/api";

import { SaveButtonComponent } from "./save-button.component";
import { BlueprintService } from "../../services/blueprint-service";

describe("SaveButtonComponent", () => {
  let fixture: ComponentFixture<SaveButtonComponent>;
  let component: SaveButtonComponent;
  let blueprintService: { setSaved: ReturnType<typeof vi.fn> };
  let messageService: { add: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    blueprintService = {
      setSaved: vi.fn((id: string, saved: boolean) =>
        of({ blueprintId: id, saved }),
      ),
    };
    messageService = { add: vi.fn() };
    await TestBed.configureTestingModule({
      declarations: [SaveButtonComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: BlueprintService, useValue: blueprintService },
        { provide: MessageService, useValue: messageService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SaveButtonComponent);
    component = fixture.componentInstance;
    component.blueprintId = "bp1";
    fixture.detectChanges();
  });

  const button = () => fixture.debugElement.query(By.css("button"));

  it("saves on click and reports the new state", () => {
    const changed = vi.fn();
    component.changed.subscribe(changed);
    button().nativeElement.click();
    fixture.detectChanges();

    expect(blueprintService.setSaved).toHaveBeenCalledWith("bp1", true);
    expect(component.saved).toBe(true);
    expect(changed).toHaveBeenCalledWith(true);
    expect(button().nativeElement.textContent).toContain("Saved");
    expect(button().nativeElement.getAttribute("aria-pressed")).toBe("true");
  });

  it("removes the bookmark when already saved", () => {
    component.saved = true;
    fixture.detectChanges();
    button().nativeElement.click();
    expect(blueprintService.setSaved).toHaveBeenCalledWith("bp1", false);
    expect(component.saved).toBe(false);
  });

  it("rolls back and explains when the request fails", () => {
    blueprintService.setSaved.mockReturnValue(
      throwError(() => new Error("nope")),
    );
    button().nativeElement.click();
    expect(component.saved).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "error" }),
    );
  });

  it("is inert while logged out, with a hint", () => {
    component.disabled = true;
    fixture.detectChanges();
    expect(button().nativeElement.disabled).toBe(true);
    expect(component.title).toContain("Log in");
    button().nativeElement.click();
    expect(blueprintService.setSaved).not.toHaveBeenCalled();
  });
});
