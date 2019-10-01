import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CertificationComponent } from './certification.component';

describe('CertificationComponent', () => {
  let component: CertificationComponent;
  let fixture: ComponentFixture<CertificationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CertificationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CertificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
