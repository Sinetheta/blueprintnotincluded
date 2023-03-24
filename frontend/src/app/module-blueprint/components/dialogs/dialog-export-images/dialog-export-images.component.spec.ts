import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";

import { DialogExportImagesComponent } from "./dialog-export-images.component";

describe("DialogExportImagesComponent", () => {
  let component: DialogExportImagesComponent;
  let fixture: ComponentFixture<DialogExportImagesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DialogExportImagesComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogExportImagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
