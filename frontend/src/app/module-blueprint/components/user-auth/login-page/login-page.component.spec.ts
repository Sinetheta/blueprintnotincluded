import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterTestingModule } from "@angular/router/testing";
import { Router, ActivatedRoute } from "@angular/router";
import { of, throwError, Subject } from "rxjs";
import { MessageService } from "primeng/api";
import { PasswordModule } from "primeng/password";

import { LoginPageComponent } from "./login-page.component";
import { AuthenticationService } from "../../../services/authentification-service";

describe("LoginPageComponent", () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  let mockAuth: any;
  let mockRouter: any;
  let mockRoute: any;
  let mockMessageService: any;

  beforeEach(async () => {
    mockAuth = {
      loginWithPassword: vi.fn(),
      saveToken: vi.fn(),
      rememberReturnTo: vi.fn(),
      consumeReturnTo: vi.fn(() => "/"),
      getAuthMode: vi
        .fn()
        .mockReturnValue(of({ mode: "workos", devUsers: [] })),
    };
    mockRouter = {
      navigate: vi.fn(),
      navigateByUrl: vi.fn(),
      // What the template's routerLinks need once it renders
      createUrlTree: vi.fn(),
      serializeUrl: vi.fn(() => ""),
      events: new Subject(),
    };
    mockRoute = { snapshot: { queryParams: {} } };
    mockMessageService = { add: vi.fn() };

    await TestBed.configureTestingModule({
      declarations: [LoginPageComponent],
      // PasswordModule: <p-password> is the password field's value accessor
      imports: [
        FormsModule,
        PasswordModule,
        RouterTestingModule.withRoutes([]),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: AuthenticationService, useValue: mockAuth },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
  });

  it("logs in with what was typed into the form", async () => {
    mockAuth.loginWithPassword.mockReturnValue(
      of({ kind: "success", token: "jwt" }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const type = (selector: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event("input"));
    };
    type("#email", "a@b.com");
    type("#password", "hunter2");
    el.querySelector("form")!.dispatchEvent(new Event("submit"));

    expect(mockAuth.loginWithPassword).toHaveBeenCalledWith(
      "a@b.com",
      "hunter2",
    );
  });

  describe("ngOnInit", () => {
    it("shows success toast when reset query param is present", () => {
      mockRoute.snapshot.queryParams = { reset: "1" };
      component.ngOnInit();
      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: "success" }),
      );
    });

    it("does not show toast when reset param is absent", () => {
      component.ngOnInit();
      expect(mockMessageService.add).not.toHaveBeenCalled();
    });
  });

  describe("submit", () => {
    it("does nothing when email is empty", () => {
      component.email = "";
      component.password = "pass";
      component.submit();
      expect(mockAuth.loginWithPassword).not.toHaveBeenCalled();
    });

    it("does nothing when password is empty", () => {
      component.email = "a@b.com";
      component.password = "";
      component.submit();
      expect(mockAuth.loginWithPassword).not.toHaveBeenCalled();
    });

    it("sets loading true while request is in flight, then false when it resolves", () => {
      component.email = "a@b.com";
      component.password = "pass";
      const response$ = new Subject<any>();
      mockAuth.loginWithPassword.mockReturnValue(response$.asObservable());

      component.submit();
      // request has not emitted yet — loading must stay true in flight
      expect(component.loading).toBe(true);

      response$.next({ kind: "success", token: "t" });
      response$.complete();
      // response handled — loading resets to false
      expect(component.loading).toBe(false);
      expect(mockAuth.saveToken).toHaveBeenCalledWith("t");
    });

    it("navigates where the auth service says on success (returnTo, default /)", () => {
      component.email = "a@b.com";
      component.password = "pass";
      mockAuth.loginWithPassword.mockReturnValue(
        of({ kind: "success", token: "jwt" }),
      );
      mockAuth.consumeReturnTo.mockReturnValue("/editor?save=1");
      component.submit();
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith("/editor?save=1");
    });

    it("parks the returnTo query param for the login completion to use", () => {
      mockRoute.snapshot.queryParams = { returnTo: "/editor?save=1" };
      component.ngOnInit();
      expect(mockAuth.rememberReturnTo).toHaveBeenCalledWith("/editor?save=1");
    });

    it("shows legacy hint on legacy_account result", () => {
      component.email = "a@b.com";
      component.password = "pass";
      mockAuth.loginWithPassword.mockReturnValue(
        of({ kind: "legacy_account" }),
      );
      component.submit();
      expect(component.showLegacyHint).toBe(true);
      expect(component.loading).toBe(false);
    });

    it("sets error message on invalid_credentials result", () => {
      component.email = "a@b.com";
      component.password = "pass";
      mockAuth.loginWithPassword.mockReturnValue(
        of({ kind: "invalid_credentials" }),
      );
      component.submit();
      expect(component.errorMessage).toBeTruthy();
      expect(component.loading).toBe(false);
    });

    it("sets error message on observable error", () => {
      component.email = "a@b.com";
      component.password = "pass";
      mockAuth.loginWithPassword.mockReturnValue(
        throwError(() => new Error("network")),
      );
      component.submit();
      expect(component.errorMessage).toBeTruthy();
      expect(component.loading).toBe(false);
    });

    it("resets showLegacyHint and errorMessage on new submit", () => {
      component.showLegacyHint = true;
      component.errorMessage = "old error";
      component.email = "a@b.com";
      component.password = "pass";
      mockAuth.loginWithPassword.mockReturnValue(
        of({ kind: "success", token: "t" }),
      );
      component.submit();
      expect(component.showLegacyHint).toBe(false);
      expect(component.errorMessage).toBe("");
    });
  });

  describe("resetPassword", () => {
    it("navigates to forgot with email param", () => {
      component.email = "test@example.com";
      component.resetPassword();
      expect(mockRouter.navigate).toHaveBeenCalledWith(["/login/forgot"], {
        queryParams: { email: "test@example.com" },
      });
    });
  });

  describe("local auth mode", () => {
    // Advisory only: the ordinary form must keep working without it
    it("stays in workos mode and keeps the form working when the mode request fails", () => {
      mockAuth.getAuthMode.mockReturnValue(
        throwError(() => new Error("network")),
      );
      component.ngOnInit();
      expect(component.authMode).toBe("workos");
      expect(component.devUsers).toEqual([]);

      mockAuth.loginWithPassword.mockReturnValue(
        of({ kind: "success", token: "jwt" }),
      );
      component.email = "a@b.com";
      component.password = "pass";
      component.submit();
      expect(mockAuth.saveToken).toHaveBeenCalledWith("jwt");
    });

    it("picks up the dev user roster when the mode response says local", () => {
      mockAuth.getAuthMode.mockReturnValue(
        of({
          mode: "local",
          devUsers: [
            { username: "dev_you", email: "dev_you@bpni.local", role: "admin" },
          ],
          devPassword: "dev_password",
        }),
      );
      component.ngOnInit();
      expect(component.authMode).toBe("local");
      expect(component.devUsers).toEqual([
        { username: "dev_you", email: "dev_you@bpni.local", role: "admin" },
      ]);
    });

    it("does nothing when a login is already in flight", () => {
      component.loading = true;
      component.loginAsDevUser({
        username: "dev_you",
        email: "dev_you@bpni.local",
        role: "admin",
      });
      expect(mockAuth.loginWithPassword).not.toHaveBeenCalled();
    });

    it("logs in with the dev user's email and the shared dev password", () => {
      mockAuth.getAuthMode.mockReturnValue(
        of({
          mode: "local",
          devUsers: [],
          devPassword: "dev_password",
        }),
      );
      component.ngOnInit();
      mockAuth.loginWithPassword.mockReturnValue(
        of({ kind: "success", token: "jwt" }),
      );
      mockAuth.consumeReturnTo.mockReturnValue("/editor?save=1");

      component.loginAsDevUser({
        username: "dev_you",
        email: "dev_you@bpni.local",
        role: "admin",
      });

      expect(mockAuth.loginWithPassword).toHaveBeenCalledWith(
        "dev_you@bpni.local",
        "dev_password",
      );
      expect(mockAuth.saveToken).toHaveBeenCalledWith("jwt");
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith("/editor?save=1");
    });

    it("shows an error when the dev user login is rejected", () => {
      mockAuth.loginWithPassword.mockReturnValue(
        of({ kind: "invalid_credentials" }),
      );
      component.loginAsDevUser({
        username: "dev_you",
        email: "dev_you@bpni.local",
        role: "admin",
      });
      expect(component.errorMessage).toBeTruthy();
      expect(component.loading).toBe(false);
    });
  });
});
