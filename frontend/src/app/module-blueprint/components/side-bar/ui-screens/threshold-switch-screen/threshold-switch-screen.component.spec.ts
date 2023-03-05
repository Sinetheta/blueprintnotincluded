import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ThresholdSwhitchScreenComponent } from './threshold-switch-screen.component';

describe('ThresholdSwhitchScreenComponent', () => {
  let component: ThresholdSwhitchScreenComponent;
  let fixture: ComponentFixture<ThresholdSwhitchScreenComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ThresholdSwhitchScreenComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ThresholdSwhitchScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
