import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";

import { DialogShareUrlComponent } from "./dialog-share-url.component";

describe("DialogShareUrlComponent", () => {
  let component: DialogShareUrlComponent;
  let fixture: ComponentFixture<DialogShareUrlComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DialogShareUrlComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogShareUrlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
