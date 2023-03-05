import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponentSideSelectionToolComponent } from './selection-tool.component';

describe('ComponentSideSelectionToolComponent', () => {
  let component: ComponentSideSelectionToolComponent;
  let fixture: ComponentFixture<ComponentSideSelectionToolComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ComponentSideSelectionToolComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComponentSideSelectionToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
