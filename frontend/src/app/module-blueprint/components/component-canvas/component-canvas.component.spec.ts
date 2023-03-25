import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { RouterTestingModule } from "@angular/router/testing";

import { BuildTool } from "src/app/module-blueprint/common/tools/build-tool";
import { ElementReport } from "src/app/module-blueprint/common/tools/element-report";
import { ComponentCanvasComponent } from "./component-canvas.component";
import { AuthenticationService } from "src/app/module-blueprint/services/authentification-service";
import { SelectTool } from "src/app/module-blueprint/common/tools/select-tool";

describe("ComponentCanvasComponent", () => {
  let component: ComponentCanvasComponent;
  let fixture: ComponentFixture<ComponentCanvasComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule, RouterTestingModule.withRoutes([])],
      declarations: [ComponentCanvasComponent],
      providers: [AuthenticationService, BuildTool, ElementReport, SelectTool],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComponentCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
