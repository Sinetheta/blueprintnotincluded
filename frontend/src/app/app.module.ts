import { BrowserModule, EventManager } from '@angular/platform-browser';
import { NgModule, ErrorHandler } from '@angular/core';
import { Router } from "@angular/router";
import { HttpClientModule } from '@angular/common/http';
import { NgxGoogleAnalyticsModule, NgxGoogleAnalyticsRouterModule } from 'ngx-google-analytics';
import * as Sentry from "@sentry/angular-ivy";

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { ModuleBlueprintModule } from './module-blueprint/module-blueprint.module';
import { CustomEventManager } from './module-blueprint/directives/custom-event-manager';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    NgxGoogleAnalyticsModule.forRoot(process.env.NG_APP_GA_TRACKING_CODE),
    NgxGoogleAnalyticsRouterModule.forRoot(),
    ModuleBlueprintModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [
    { provide: EventManager, useClass: CustomEventManager },
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler({
        showDialog: true,
      }),
    },
    {
      provide: Sentry.TraceService,
      deps: [Router],
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(trace: Sentry.TraceService) { }
}
