import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { ComponentBlueprintParentComponent } from "./module-blueprint/components/component-blueprint-parent/component-blueprint-parent.component";
import { ResetPasswordComponent } from "./module-blueprint/components/user-auth/reset-password/reset-password.component";

const routes: Routes = [
  { path: "", component: ComponentBlueprintParentComponent },
  { path: "b/:id", component: ComponentBlueprintParentComponent },
  {
    path: "b/:id/hideui/:width/:height",
    component: ComponentBlueprintParentComponent,
  },
  { path: "openfromurl/:url", component: ComponentBlueprintParentComponent },
  { path: "browse", component: ComponentBlueprintParentComponent },
  { path: "about", component: ComponentBlueprintParentComponent },
  { path: "reset-password", component: ResetPasswordComponent },
  { path: "", redirectTo: "/", pathMatch: "prefix" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
