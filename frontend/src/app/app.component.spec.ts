import { TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { of, Subject } from "rxjs";
import { AppComponent } from "./app.component";
import { ThemeService } from "./module-blueprint/services/theme.service";
import { AuthenticationService } from "./module-blueprint/services/authentification-service";
import { ContentLocaleService } from "./module-blueprint/services/content-locale.service";

describe("AppComponent", () => {
  let themeService: {
    initFromLocal: ReturnType<typeof vi.fn>;
    loadForUser: ReturnType<typeof vi.fn>;
  };
  let contentLocaleService: {
    initFromLocal: ReturnType<typeof vi.fn>;
    loadForUser: ReturnType<typeof vi.fn>;
  };
  let loggedIn: boolean;
  let sessionEstablished: Subject<void>;

  beforeEach(async () => {
    loggedIn = false;
    sessionEstablished = new Subject<void>();
    themeService = {
      initFromLocal: vi.fn(),
      loadForUser: vi.fn().mockReturnValue(of("steam")),
    };
    contentLocaleService = {
      initFromLocal: vi.fn(),
      loadForUser: vi.fn().mockReturnValue(of("en")),
    };

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ThemeService, useValue: themeService },
        { provide: ContentLocaleService, useValue: contentLocaleService },
        {
          provide: AuthenticationService,
          useValue: {
            isLoggedIn: () => loggedIn,
            sessionEstablished$: sessionEstablished.asObservable(),
          },
        },
      ],
    }).compileComponents();
  });

  it("applies the locally stored theme and content locale on init, fetching nothing for a logged-out visitor", () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(themeService.initFromLocal).toHaveBeenCalled();
    expect(contentLocaleService.initFromLocal).toHaveBeenCalled();
    expect(themeService.loadForUser).not.toHaveBeenCalled();
    expect(contentLocaleService.loadForUser).not.toHaveBeenCalled();
  });

  // The local theme must be applied before any network call, so the first
  // paint is never the wrong palette. The content locale decides which title
  // every read request asks for, so it has to be settled before the first list
  // request, not after.
  it("fetches the account theme and content locale once a session exists, after the local copies", () => {
    loggedIn = true;
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(themeService.loadForUser).toHaveBeenCalled();
    expect(contentLocaleService.loadForUser).toHaveBeenCalled();

    const firstFetch = Math.min(
      themeService.loadForUser.mock.invocationCallOrder[0],
      contentLocaleService.loadForUser.mock.invocationCallOrder[0],
    );
    expect(themeService.initFromLocal.mock.invocationCallOrder[0]).toBeLessThan(
      firstFetch,
    );
    expect(
      contentLocaleService.initFromLocal.mock.invocationCallOrder[0],
    ).toBeLessThan(firstFetch);
  });

  // Login completes via an in-SPA route navigation, not a page reload, so
  // AppComponent's one-shot ngOnInit check runs BEFORE the session exists.
  // Without reacting to sessionEstablished$, account state (and content
  // locale's adopt-local-declaration-into-account step) would never load
  // until the next hard refresh.
  it("loads account state when a session is established after init, not just at bootstrap", () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(themeService.loadForUser).not.toHaveBeenCalled();
    expect(contentLocaleService.loadForUser).not.toHaveBeenCalled();

    sessionEstablished.next();

    expect(themeService.loadForUser).toHaveBeenCalled();
    expect(contentLocaleService.loadForUser).toHaveBeenCalled();
  });

  it("unsubscribes from sessionEstablished$ on destroy", () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    fixture.destroy();

    sessionEstablished.next();

    expect(themeService.loadForUser).not.toHaveBeenCalled();
    expect(contentLocaleService.loadForUser).not.toHaveBeenCalled();
  });
});
