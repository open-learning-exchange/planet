import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationViewListComponent } from './notification-view-list.component';

describe('NotificationViewListComponent', () => {
  let component: NotificationViewListComponent;
  let fixture: ComponentFixture<NotificationViewListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NotificationViewListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificationViewListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
