import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BitSelectionScreenComponent } from './bit-selection-screen.component';

describe('BitSelectionScreenComponent', () => {
  let component: BitSelectionScreenComponent;
  let fixture: ComponentFixture<BitSelectionScreenComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BitSelectionScreenComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BitSelectionScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
