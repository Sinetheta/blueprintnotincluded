import { BuildableElement } from "../../../../../../../lib/index";
import { BuildableElementPickerComponent } from "./buildable-element-picker.component";

describe("BuildableElementPickerComponent", () => {
  it("emits the pick, closes every popover, and writes the pick into the caller's array", () => {
    const component = new BuildableElementPickerComponent();
    const panels = [{ hide: vi.fn() }, { hide: vi.fn() }];
    component.elementPanels = {
      forEach: (f: (p: any) => void) => panels.forEach(f),
    } as any;
    const before = new BuildableElement();
    const picked = new BuildableElement();
    const current = [before];
    component.currentElement = current;
    const emit = vi.spyOn(component.changeElement, "emit");

    component.chooseElement(picked, 0);

    expect(emit).toHaveBeenCalledWith({ newElement: picked, index: 0 });
    for (const panel of panels) expect(panel.hide).toHaveBeenCalled();
    // Callers (Replace strip, item-collection-info) pass their own array and
    // read the pick back from it, so the write must land in place.
    expect(current[0]).toBe(picked);
  });

  it("warns only for a slot that mixes more than one element", () => {
    const component = new BuildableElementPickerComponent();
    expect(component.showWarning(0)).toBe(false);
    component.nbElements = [1, 2];
    expect(component.showWarning(0)).toBe(false);
    expect(component.showWarning(1)).toBe(true);
  });
});
