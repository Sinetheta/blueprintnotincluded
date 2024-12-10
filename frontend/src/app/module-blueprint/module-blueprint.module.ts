import { NgModule, ChangeDetectorRef } from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { Routes, RouterModule } from "@angular/router";
import { ComponentCanvasComponent } from "src/app/module-blueprint/components/component-canvas/component-canvas.component";
import { ComponentMenuComponent } from "src/app/module-blueprint/components/component-menu/component-menu.component";
import { ComponentBlueprintParentComponent } from "src/app/module-blueprint/components/component-blueprint-parent/component-blueprint-parent.component";

import { MouseWheelDirective } from "src/app/module-blueprint/directives/mousewheel.directive";
import { DragAndDropDirective } from "src/app/module-blueprint/directives/draganddrop.directive";

import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ScrollPanelModule } from "primeng/scrollpanel";
import { OverlayPanelModule } from "primeng/overlaypanel";
import { MenubarModule } from "primeng/menubar";
import { TabMenuModule } from "primeng/tabmenu";
import { SlideMenuModule } from "primeng/slidemenu";
import { DialogModule } from "primeng/dialog";
import { DropdownModule } from "primeng/dropdown";
import { AccordionModule } from "primeng/accordion";
import { SliderModule } from "primeng/slider";
import { ToastModule } from "primeng/toast";
import { InputTextModule } from "primeng/inputtext";
import { ColorPickerModule } from "primeng/colorpicker";
import { PasswordModule } from "primeng/password";
import { TooltipModule } from "primeng/tooltip";
import { MessageService } from "primeng/api";
import { PanelModule } from "primeng/panel";
import { CheckboxModule } from "primeng/checkbox";
import { InputSwitchModule } from "primeng/inputswitch";
import { FieldsetModule } from "primeng/fieldset";
import { ListboxModule } from "primeng/listbox";
import { VirtualScrollerModule } from "primeng/virtualscroller";
import { ToggleButtonModule } from "primeng/togglebutton";
import { SidebarModule } from "primeng/sidebar";
import { RadioButtonModule } from "primeng/radiobutton";
import { InputTextareaModule } from "primeng/inputtextarea";
import { UsernameValidationDirective } from "./directives/username-validation.directive";
import { ComponentSideSelectionToolComponent } from "./components/side-bar/selection-tool/selection-tool.component";
import { KeyboardDirective } from "./directives/keyboard.directive";
import { ComponentLoginDialogComponent } from "./components/user-auth/login-dialog/login-dialog.component";
import { RegisterFormComponent } from "./components/user-auth/register-form/register-form.component";
import { CheckDuplicateService } from "./services/check-duplicate-service";
import { LoginFormComponent } from "./components/user-auth/login-form/login-form.component";
import { AuthenticationService } from "./services/authentification-service";
import { BlueprintService } from "./services/blueprint-service";
import { RECAPTCHA_V3_SITE_KEY, RecaptchaV3Module } from "ng-recaptcha";
import { ToolService } from "./services/tool-service";
import { SelectTool } from "./common/tools/select-tool";
import { BuildTool } from "./common/tools/build-tool";
import { ComponentSaveDialogComponent } from "./components/dialogs/component-save-dialog/component-save-dialog.component";
import { DialogShareUrlComponent } from "./components/dialogs/dialog-share-url/dialog-share-url.component";
import { ComponentSideBuildToolComponent } from "./components/side-bar/build-tool/build-tool.component";
import { ItemCollectionInfoComponent } from "./components/side-bar/item-collection-info/item-collection-info.component";
import { DialogBrowseComponent } from "./components/dialogs/dialog-browse/dialog-browse.component";
import { DialogExportImagesComponent } from "./components/dialogs/dialog-export-images/dialog-export-images.component";
import { BlueprintNameValidationDirective } from "./directives/blueprint-name-validation.directive";
import { LikeWidgetComponent } from "./components/like-widget/like-widget.component";
import { BuildableElementPickerComponent } from "./components/side-bar/buildable-element-picker/buildable-element-picker.component";
import { ElementReport } from "./common/tools/element-report";
import { ElementReportToolComponent } from "./components/side-bar/element-report-tool/element-report-tool.component";
import { UiScreenContainerComponent } from "./components/side-bar/ui-screens/ui-screen-container/ui-screen-container.component";
import { SingleSliderScreenComponent } from "./components/side-bar/ui-screens/single-slider-screen/single-slider-screen.component";
import { ThresholdSwhitchScreenComponent } from "./components/side-bar/ui-screens/threshold-switch-screen/threshold-switch-screen.component";
import { ActiveRangeScreenComponent } from "./components/side-bar/ui-screens/active-range-screen/active-range-screen.component";
import { DialogAboutComponent } from "./components/dialogs/dialog-about/dialog-about.component";
import { TemperaturePickerComponent } from "./components/side-bar/temperature-picker/temperature-picker.component";
import { TemperatureScaleComponent } from "./components/side-bar/temperature-scale/temperature-scale.component";
import { ElementIconComponent } from "./components/side-bar/element-icon/element-icon.component";
import { CellElementPickerComponent } from "./components/side-bar/cell-element-picker/cell-element-picker.component";
import { FilterElementSolidPipe } from "./pipes/filter-element-solid.pipe";
import { FilterElementLiquidPipe } from "./pipes/filter-element-liquid.pipe";
import { FilterElementGasPipe } from "./pipes/filter-element-gas.pipe";
import { AddMassUnitPipe } from "./pipes/add-mass-unit.pipe";
import { BitSelectionScreenComponent } from "./components/side-bar/ui-screens/bit-selection-screen/bit-selection-screen.component";
import { InfoInputComponent } from "./components/side-bar/info-input/info-input.component";
import { InfoInputIconComponent } from "./components/side-bar/info-input-icon/info-input-icon.component";
import { PipeContentComponent } from "./components/side-bar/pipe-content/pipe-content.component";
import { ResetPasswordComponent } from "./components/user-auth/reset-password/reset-password.component";

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextareaModule,
    PasswordModule,
    ColorPickerModule,
    InputTextModule,
    SliderModule,
    ButtonModule,
    CardModule,
    ScrollPanelModule,
    OverlayPanelModule,
    MenubarModule,
    TabMenuModule,
    SlideMenuModule,
    DialogModule,
    DropdownModule,
    AccordionModule,
    ToastModule,
    TooltipModule,
    PanelModule,
    InputSwitchModule,
    CheckboxModule,
    FieldsetModule,
    ListboxModule,
    VirtualScrollerModule,
    ToggleButtonModule,
    SidebarModule,
    RadioButtonModule,
    RecaptchaV3Module,
    BrowserAnimationsModule,
  ],
  declarations: [
    UsernameValidationDirective,
    BlueprintNameValidationDirective,
    ComponentCanvasComponent,
    MouseWheelDirective,
    DragAndDropDirective,
    KeyboardDirective,
    ComponentMenuComponent,
    ComponentBlueprintParentComponent,
    ComponentSaveDialogComponent,
    ComponentSideBuildToolComponent,
    ComponentSideSelectionToolComponent,
    ComponentLoginDialogComponent,
    RegisterFormComponent,
    LoginFormComponent,
    DialogShareUrlComponent,
    ItemCollectionInfoComponent,
    DialogBrowseComponent,
    DialogExportImagesComponent,
    LikeWidgetComponent,
    BuildableElementPickerComponent,
    ElementReportToolComponent,
    UiScreenContainerComponent,
    SingleSliderScreenComponent,
    ThresholdSwhitchScreenComponent,
    ActiveRangeScreenComponent,
    DialogAboutComponent,
    TemperaturePickerComponent,
    TemperatureScaleComponent,
    ElementIconComponent,
    CellElementPickerComponent,
    FilterElementSolidPipe,
    FilterElementLiquidPipe,
    FilterElementGasPipe,
    AddMassUnitPipe,
    BitSelectionScreenComponent,
    InfoInputComponent,
    InfoInputIconComponent,
    PipeContentComponent,
    ResetPasswordComponent,
  ],
  providers: [
    CheckDuplicateService,
    AuthenticationService,
    BlueprintService,
    ToolService,
    SelectTool,
    BuildTool,
    ElementReport,
    DatePipe,
    MessageService,
    {
      provide: RECAPTCHA_V3_SITE_KEY,
      useValue: "6Leizc0kAAAAAIZQRmbXVXZ2HvfS_cY_LrkOk8x6",
    },
  ],
  exports: [ComponentBlueprintParentComponent],
})
export class ModuleBlueprintModule {}
