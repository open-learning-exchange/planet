import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NationComponent } from './nation.component';

describe('NationComponent', () => {
  let component: NationComponent;
  let fixture: ComponentFixture<NationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
