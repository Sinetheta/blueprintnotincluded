import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";

import { TemperaturePickerComponent } from "./temperature-picker.component";

xdescribe("TemperaturePickerComponent", () => {
  let component: TemperaturePickerComponent;
  let fixture: ComponentFixture<TemperaturePickerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [TemperaturePickerComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TemperaturePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
