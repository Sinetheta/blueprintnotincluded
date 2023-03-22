import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { CellElementPickerComponent } from "./cell-element-picker.component";

describe("CellElementPickerComponent", () => {
  let component: CellElementPickerComponent;
  let fixture: ComponentFixture<CellElementPickerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CellElementPickerComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CellElementPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
