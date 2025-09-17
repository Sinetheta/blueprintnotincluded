import { enableProdMode } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import * as Sentry from "@sentry/angular-ivy";
import { BrowserTracing } from "@sentry/tracing";

import { AppModule } from "./app/app.module";
import { environment } from "./environments/environment";

if (environment.production) {
  enableProdMode();
}

Sentry.init({
  dsn: process.env.NG_APP_SENTRY_DSN,
  enabled: environment.production,
  integrations: [
    // Registers and configures the Tracing integration,
    // which automatically instruments your application to monitor its
    // performance, including custom Angular routing instrumentation
    new BrowserTracing({
      tracePropagationTargets: [
        "localhost",
        "https://blueprintnotincluded.org",
      ],
      routingInstrumentation: Sentry.routingInstrumentation,
    }),
  ],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

// Global handler for unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  console.warn(
    "Unhandled promise rejection caught and prevented:",
    event.reason
  );
  // Prevent the default behavior (console error)
  event.preventDefault();
});

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
