import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";

import { ComponentLoginDialogComponent } from "./login-dialog.component";

describe("ComponentLoginDialogComponent", () => {
  let component: ComponentLoginDialogComponent;
  let fixture: ComponentFixture<ComponentLoginDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ComponentLoginDialogComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComponentLoginDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
