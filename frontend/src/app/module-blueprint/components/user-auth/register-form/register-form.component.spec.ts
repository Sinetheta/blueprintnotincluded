import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { RouterTestingModule } from "@angular/router/testing";
import { MessageService } from "primeng/api";
import { RECAPTCHA_V3_SITE_KEY, ReCaptchaV3Service } from "ng-recaptcha";

import { AuthenticationService } from "src/app/module-blueprint/services/authentification-service";
import { RegisterFormComponent } from "./register-form.component";
import { CheckDuplicateService } from "src/app/module-blueprint/services/check-duplicate-service";

describe("RegisterFormComponent", () => {
  let component: RegisterFormComponent;
  let fixture: ComponentFixture<RegisterFormComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule, RouterTestingModule.withRoutes([])],
      declarations: [RegisterFormComponent],
      providers: [
        AuthenticationService,
        CheckDuplicateService,
        MessageService,
        ReCaptchaV3Service,
        { provide: RECAPTCHA_V3_SITE_KEY, useValue: "testSikeKeyV3" },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
