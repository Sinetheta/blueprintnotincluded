import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { RouterTestingModule } from "@angular/router/testing";

import { AuthenticationService } from "src/app/module-blueprint/services/authentification-service";
import { BuildTool } from "src/app/module-blueprint/common/tools/build-tool";
import { ElementReport } from "src/app/module-blueprint/common/tools/element-report";
import { ComponentSideSelectionToolComponent } from "./selection-tool.component";
import { SelectTool } from "src/app/module-blueprint/common/tools/select-tool";

describe("ComponentSideSelectionToolComponent", () => {
  let component: ComponentSideSelectionToolComponent;
  let fixture: ComponentFixture<ComponentSideSelectionToolComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule, RouterTestingModule.withRoutes([])],
      declarations: [ComponentSideSelectionToolComponent],
      providers: [AuthenticationService, BuildTool, ElementReport, SelectTool],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComponentSideSelectionToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
