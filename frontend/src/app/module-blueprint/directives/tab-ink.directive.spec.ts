import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TabInkDirective } from "./tab-ink.directive";

@Component({
  template: `
    <div class="bni-tabs" appTabInk>
      <button type="button" [class.active]="active === 0">First</button>
      <button type="button" [class.active]="active === 1">Second</button>
    </div>
  `,
  imports: [TabInkDirective],
})
class HostComponent {
  active = 0;
}

describe("TabInkDirective", () => {
  let fixture: ComponentFixture<HostComponent>;
  let container: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    container = fixture.nativeElement.querySelector(".bni-tabs");
  });

  it("marks the container and appends the ink bar", () => {
    expect(container.classList.contains("has-tab-ink")).toBe(true);
    const ink = container.querySelector(".bni-tab-ink");
    expect(ink).not.toBeNull();
    expect(ink!.getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps the bar hidden while the tabs have no layout (jsdom)", () => {
    // jsdom reports offsetWidth 0, which is the same code path as a
    // display:none container — the bar must not claim a position
    const ink = container.querySelector(".bni-tab-ink")!;
    expect(ink.classList.contains("bni-tab-ink--ready")).toBe(false);
  });

  describe("once the tabs have layout", () => {
    let ink: HTMLElement;
    let buttons: HTMLButtonElement[];
    // MutationObserver callbacks are microtasks.
    const settle = () => Promise.resolve();

    beforeEach(() => {
      ink = container.querySelector(".bni-tab-ink")!;
      buttons = Array.from(container.querySelectorAll("button"));
      // jsdom has no layout: give the two tabs side-by-side boxes.
      buttons.forEach((button, i) =>
        Object.defineProperties(button, {
          offsetWidth: { get: () => 40 + i * 10 },
          offsetHeight: { get: () => 20 },
          offsetLeft: { get: () => i * 60 },
          offsetTop: { get: () => 0 },
        }),
      );
    });

    it("slides the bar under the newly active tab", async () => {
      fixture.componentInstance.active = 1;
      fixture.detectChanges();
      await settle();

      expect(ink.style.width).toBe("50px");
      expect(ink.style.transform).toBe("translate(60px, 18px)");
      expect(ink.classList.contains("bni-tab-ink--ready")).toBe(true);
    });

    it("writes nothing once the bar is in place", async () => {
      // Unconditional writes re-set attributes even when the value is
      // unchanged, which refires the observers in a loop.
      fixture.componentInstance.active = 1;
      fixture.detectChanges();
      await settle();

      const writes: MutationRecord[] = [];
      const watcher = new MutationObserver((records) =>
        writes.push(...records),
      );
      watcher.observe(ink, { attributes: true });
      buttons[0].classList.add("hovered");
      await settle();
      await settle();
      watcher.disconnect();

      expect(writes).toEqual([]);
    });

    it("stops following the tabs once destroyed", async () => {
      fixture.destroy();
      buttons[0].classList.remove("active");
      buttons[1].classList.add("active");
      await settle();

      expect(ink.classList.contains("bni-tab-ink--ready")).toBe(false);
      expect(ink.style.width).toBe("");
    });
  });
});
