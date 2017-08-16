import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetupsaddComponent } from './meetupsadd.component';

describe('MeetupsaddComponent', () => {
  let component: MeetupsaddComponent;
  let fixture: ComponentFixture<MeetupsaddComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MeetupsaddComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeetupsaddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
