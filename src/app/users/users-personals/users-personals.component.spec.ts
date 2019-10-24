import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersPersonalsComponent } from './users-personals.component';

describe('UsersPersonalsComponent', () => {
  let component: UsersPersonalsComponent;
  let fixture: ComponentFixture<UsersPersonalsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UsersPersonalsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UsersPersonalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
