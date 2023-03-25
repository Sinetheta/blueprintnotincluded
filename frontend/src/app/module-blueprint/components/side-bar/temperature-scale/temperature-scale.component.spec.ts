import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";

import { TemperatureScaleComponent } from "./temperature-scale.component";

xdescribe("TemperatureScaleComponent", () => {
  let component: TemperatureScaleComponent;
  let fixture: ComponentFixture<TemperatureScaleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
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
