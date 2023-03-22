import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { DialogBrowseComponent } from "./dialog-browse.component";

describe("DialogBrowseComponent", () => {
  let component: DialogBrowseComponent;
  let fixture: ComponentFixture<DialogBrowseComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DialogBrowseComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogBrowseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
