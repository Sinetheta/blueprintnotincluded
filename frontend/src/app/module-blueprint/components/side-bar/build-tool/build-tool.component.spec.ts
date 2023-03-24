import { waitForAsync, ComponentFixture, TestBed } from "@angular/core/testing";

import { ComponentSideBuildToolComponent } from "./build-tool.component";

describe("ComponentSideBuildToolComponent", () => {
  let component: ComponentSideBuildToolComponent;
  let fixture: ComponentFixture<ComponentSideBuildToolComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ComponentSideBuildToolComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComponentSideBuildToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
