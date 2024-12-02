import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class PasswordResetService {
  constructor(private http: HttpClient) {}

  requestReset(email: string): Observable<any> {
    return this.http.post("/api/request-reset", { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post("/api/reset-password", { token, newPassword });
  }
}
