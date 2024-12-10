import { Component, OnInit, EventEmitter, Output } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { AuthenticationService } from "../../../services/authentification-service";
import { MessageService } from "primeng/api";
import { ReCaptchaV3Service } from "ng-recaptcha";
import { Observable, Subscription } from "rxjs";
import { UsernameValidationDirective } from "src/app/module-blueprint/directives/username-validation.directive";
import { Dialog } from "primeng/dialog";

@Component({
  selector: "app-login-form",
  templateUrl: "./login-form.component.html",
  styleUrls: ["./login-form.component.css"],
})
export class LoginFormComponent {
  loginForm = new FormGroup({
    username: new FormControl("", [
      Validators.required,
      UsernameValidationDirective.validate,
    ]),
    password: new FormControl("", [Validators.required]),
  });

  @Output() loginRegistration = new EventEmitter();
  @Output() loginOk = new EventEmitter();

  constructor(
    private authService: AuthenticationService,
    private recaptchaV3Service: ReCaptchaV3Service,
    private messageService: MessageService
  ) {}

  get f() {
    return this.loginForm.controls;
  }
  get icon() {
    return this.working ? "pi pi-spin pi-spinner" : "";
  }

  working: boolean = false;
  authError: boolean = false;
  showResetDialog: boolean = false;
  resetEmail: string = "";

  reset() {
    this.working = false;
    this.authError = false;
    this.loginForm.reset();
  }

  subscription: Subscription;
  onSubmit() {
    this.working = true;
    this.subscription = this.recaptchaV3Service
      .execute("login")
      .subscribe((token) => {
        let tokenPayload = {
          "g-recaptcha-response": token,
          email: "",
          username: this.loginForm.value.username as string,
          password: this.loginForm.value.password as string,
        };

        this.authService.login(tokenPayload).subscribe({
          next: this.handleSaveNext.bind(this),
          error: this.handleSaveError.bind(this),
        });

        this.subscription.unsubscribe();
      });
  }

  handleSaveNext(response: any) {
    this.loginOk.emit();

    const username = this.authService.getUserDetails().username;
    let summary: string = $localize`Login Successful`;
    let detail: string = $localize`Welcome ${username}`;

    this.messageService.add({
      severity: "success",
      summary: summary,
      detail: detail,
    });
    this.working = false;
  }

  handleSaveError() {
    this.authError = true;
    this.working = false;
  }

  registration() {
    this.loginRegistration.emit();
  }

  forgotPassword() {
    this.showResetDialog = true;
  }

  requestReset() {
    if (!this.resetEmail) {
      this.messageService.add({
        severity: "error",
        summary: "Error",
        detail: "Please enter your email address",
      });
      return;
    }

    this.recaptchaV3Service.execute("resetPassword").subscribe((token) => {
      this.authService.requestPasswordReset(this.resetEmail).subscribe({
        next: () => {
          this.messageService.add({
            severity: "success",
            summary: "Reset Email Sent",
            detail: "Please check your inbox for password reset instructions",
          });
          this.showResetDialog = false;
          this.resetEmail = "";
        },
        error: () => {
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to send reset email",
          });
        },
      });
    });
  }
}
