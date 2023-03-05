import { BrowserModule, EventManager } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

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
    ModuleBlueprintModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [
    { provide: EventManager, useClass: CustomEventManager }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
