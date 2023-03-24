import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";

import { TemperatureScaleComponent } from "./temperature-scale.component";

describe("TemperatureScaleComponent", () => {
  let component: TemperatureScaleComponent;
  let fixture: ComponentFixture<TemperatureScaleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [TemperatureScaleComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TemperatureScaleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
