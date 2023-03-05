import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UiScreenContainerComponent } from './ui-screen-container.component';

describe('UiScreenContainerComponent', () => {
  let component: UiScreenContainerComponent;
  let fixture: ComponentFixture<UiScreenContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UiScreenContainerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UiScreenContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
