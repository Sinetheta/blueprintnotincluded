import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ElementReportToolComponent } from './element-report-tool.component';

describe('ElementReportToolComponent', () => {
  let component: ElementReportToolComponent;
  let fixture: ComponentFixture<ElementReportToolComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ElementReportToolComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ElementReportToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
