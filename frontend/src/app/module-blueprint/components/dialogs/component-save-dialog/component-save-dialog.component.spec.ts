import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { ComponentSaveDialogComponent } from "./component-save-dialog.component";

describe("ComponentSaveDialogComponent", () => {
  let component: ComponentSaveDialogComponent;
  let fixture: ComponentFixture<ComponentSaveDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ComponentSaveDialogComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComponentSaveDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
