import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApkLogsComponent } from './apk-logs.component';

describe('ApkLogsComponent', () => {
  let component: ApkLogsComponent;
  let fixture: ComponentFixture<ApkLogsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ApkLogsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApkLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
