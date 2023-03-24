import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";

import { InfoInputComponent } from "./info-input.component";

describe("InfoInputComponent", () => {
  let component: InfoInputComponent;
  let fixture: ComponentFixture<InfoInputComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [InfoInputComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InfoInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
