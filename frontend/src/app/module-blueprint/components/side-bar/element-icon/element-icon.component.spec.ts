import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ElementIconComponent } from './element-icon.component';

describe('ElementIconComponent', () => {
  let component: ElementIconComponent;
  let fixture: ComponentFixture<ElementIconComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ElementIconComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ElementIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
