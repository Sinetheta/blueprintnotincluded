import { TestBed } from "@angular/core/testing";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";

import { AuthInterceptor } from "./auth-interceptor";
import { AuthenticationService } from "./authentification-service";

describe("AuthInterceptor", () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthenticationService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true,
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthenticationService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it("attaches the bearer token to an /api/ request when logged in", () => {
    authService.saveToken("token123");
    http.get("/api/users/me/theme-preference").subscribe();
    const req = httpMock.expectOne("/api/users/me/theme-preference");
    expect(req.request.headers.get("Authorization")).toBe("Bearer token123");
    req.flush({});
  });

  it("sends no Authorization header when logged out", () => {
    http.get("/api/users/me/theme-preference").subscribe();
    const req = httpMock.expectOne("/api/users/me/theme-preference");
    expect(req.request.headers.has("Authorization")).toBe(false);
    req.flush({});
  });

  // A third-party URL can carry /api/ in its path too; only same-origin
  // /api/ requests may get the token
  it("leaves a request that is not same-origin /api/ untouched even when logged in", () => {
    authService.saveToken("token123");
    http.get("/other/thing").subscribe();
    http.get("https://third-party.example/api/x").subscribe();
    for (const url of ["/other/thing", "https://third-party.example/api/x"]) {
      const req = httpMock.expectOne(url);
      expect(req.request.headers.has("Authorization"), url).toBe(false);
      req.flush({});
    }
  });

  it("does not overwrite an Authorization header a caller already set", () => {
    authService.saveToken("token123");
    http
      .get("/api/getblueprintsSecure", {
        headers: { Authorization: "Bearer explicit-token" },
      })
      .subscribe();
    const req = httpMock.expectOne("/api/getblueprintsSecure");
    expect(req.request.headers.get("Authorization")).toBe(
      "Bearer explicit-token",
    );
    req.flush({});
  });
});
