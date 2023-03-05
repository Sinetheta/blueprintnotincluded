import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PipeContentComponent } from './pipe-content.component';

describe('PipeContentComponent', () => {
  let component: PipeContentComponent;
  let fixture: ComponentFixture<PipeContentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PipeContentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PipeContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
