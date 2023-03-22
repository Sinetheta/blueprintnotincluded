import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { ComponentCanvasComponent } from "./component-canvas.component";

describe("ComponentCanvasComponent", () => {
  let component: ComponentCanvasComponent;
  let fixture: ComponentFixture<ComponentCanvasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ComponentCanvasComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComponentCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
