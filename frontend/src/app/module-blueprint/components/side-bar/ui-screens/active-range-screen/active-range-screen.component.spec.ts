import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveRangeScreenComponent } from './active-range-screen.component';

describe('ActiveRangeScreenComponent', () => {
  let component: ActiveRangeScreenComponent;
  let fixture: ComponentFixture<ActiveRangeScreenComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ActiveRangeScreenComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ActiveRangeScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
