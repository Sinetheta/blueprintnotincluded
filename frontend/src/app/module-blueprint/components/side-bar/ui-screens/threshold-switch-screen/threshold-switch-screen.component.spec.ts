import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";

import { ThresholdSwhitchScreenComponent } from "./threshold-switch-screen.component";

xdescribe("ThresholdSwhitchScreenComponent", () => {
  let component: ThresholdSwhitchScreenComponent;
  let fixture: ComponentFixture<ThresholdSwhitchScreenComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ThresholdSwhitchScreenComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ThresholdSwhitchScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
