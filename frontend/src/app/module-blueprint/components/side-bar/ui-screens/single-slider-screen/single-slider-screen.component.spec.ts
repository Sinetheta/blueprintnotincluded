import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { SingleSliderScreenComponent } from "./single-slider-screen.component";

describe("SingleSliderScreenComponent", () => {
  let component: SingleSliderScreenComponent;
  let fixture: ComponentFixture<SingleSliderScreenComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SingleSliderScreenComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SingleSliderScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
