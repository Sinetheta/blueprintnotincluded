import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { RouterTestingModule } from "@angular/router/testing";

import { DialogExportImagesComponent } from "./dialog-export-images.component";
import { AuthenticationService } from "src/app/module-blueprint/services/authentification-service";

describe("DialogExportImagesComponent", () => {
  let component: DialogExportImagesComponent;
  let fixture: ComponentFixture<DialogExportImagesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule, RouterTestingModule.withRoutes([])],
      declarations: [DialogExportImagesComponent],
      providers: [AuthenticationService],
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
