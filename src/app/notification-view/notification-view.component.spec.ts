import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationViewComponent } from './notification-view.component';

describe('NotificationViewComponent', () => {
  let component: NotificationViewComponent;
  let fixture: ComponentFixture<NotificationViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NotificationViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificationViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
