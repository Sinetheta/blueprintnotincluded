import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";

import { BitSelectionScreenComponent } from "./bit-selection-screen.component";

describe("BitSelectionScreenComponent", () => {
  let component: BitSelectionScreenComponent;
  let fixture: ComponentFixture<BitSelectionScreenComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BitSelectionScreenComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BitSelectionScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
