import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MeetupsViewComponent } from './meetups-view.component';

describe('ViewMeetupsComponent', () => {
  let component: MeetupsViewComponent;
  let fixture: ComponentFixture<MeetupsViewComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MeetupsViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeetupsViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
