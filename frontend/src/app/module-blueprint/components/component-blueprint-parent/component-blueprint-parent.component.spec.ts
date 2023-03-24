import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";

import { ComponentBlueprintParentComponent } from "./component-blueprint-parent.component";

describe("ComponentBlueprintParentComponent", () => {
  let component: ComponentBlueprintParentComponent;
  let fixture: ComponentFixture<ComponentBlueprintParentComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ComponentBlueprintParentComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComponentBlueprintParentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
