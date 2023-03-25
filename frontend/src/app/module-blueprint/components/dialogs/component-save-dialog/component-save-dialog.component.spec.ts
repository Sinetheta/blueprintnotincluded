import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { RouterTestingModule } from "@angular/router/testing";
import { MessageService } from "primeng/api";

import { ComponentSaveDialogComponent } from "./component-save-dialog.component";
import { AuthenticationService } from "src/app/module-blueprint/services/authentification-service";

describe("ComponentSaveDialogComponent", () => {
  let component: ComponentSaveDialogComponent;
  let fixture: ComponentFixture<ComponentSaveDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule, RouterTestingModule.withRoutes([])],
      declarations: [ComponentSaveDialogComponent],
      providers: [AuthenticationService, MessageService],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComponentSaveDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
