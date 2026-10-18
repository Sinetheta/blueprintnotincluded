import { TestBed } from "@angular/core/testing";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";

import { FeedbackService } from "./feedback.service";
import { AuthenticationService } from "./authentification-service";

describe("FeedbackService", () => {
  let service: FeedbackService;
  let httpMock: HttpTestingController;
  let mockAuth: any;

  beforeEach(() => {
    mockAuth = { getToken: vi.fn().mockReturnValue("test-jwt") };

    TestBed.configureTestingModule({
      providers: [
        FeedbackService,
        { provide: AuthenticationService, useValue: mockAuth },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(FeedbackService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe("submit", () => {
    it("posts to /api/feedback with message and metadata", () => {
      let result: any;
      service.submit("Great app!").subscribe((r) => (result = r));

      const req = httpMock.expectOne("/api/feedback");
      expect(req.request.method).toBe("POST");
      expect(req.request.body.message).toBe("Great app!");
      expect(req.request.body.url).toBeDefined();
      expect(req.request.body.userAgent).toBeDefined();
      expect(Array.isArray(req.request.body.consoleErrors)).toBe(true);

      req.flush({ message: "Feedback received" });
      expect(result).toEqual({ message: "Feedback received" });
    });

    it("sends Authorization header with bearer token", () => {
      service.submit("test").subscribe();
      const req = httpMock.expectOne("/api/feedback");
      expect(req.request.headers.get("Authorization")).toBe("Bearer test-jwt");
      req.flush({ message: "ok" });
    });

    // The report carries what went wrong before the user wrote it: the last
    // 20 uncaught errors and console errors, oldest dropped first
    it("attaches the most recent errors", () => {
      for (let i = 1; i <= 24; i++)
        window.dispatchEvent(
          new ErrorEvent("error", { error: { stack: `boom ${i}` } }),
        );
      console.error("boom 25");

      service.submit("broken").subscribe();
      const req = httpMock.expectOne("/api/feedback");
      const consoleErrors: string[] = req.request.body.consoleErrors;
      expect(consoleErrors).toHaveLength(20);
      expect(consoleErrors[0]).toBe("boom 6");
      expect(consoleErrors[19]).toBe("boom 25");
      req.flush({ message: "ok" });
    });
  });
});
