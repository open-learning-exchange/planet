import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { FormErrorMessagesComponent } from './form-error-messages.component';

describe('FormErrorMessagesComponent', () => {
  let component: FormErrorMessagesComponent;
  let fixture: ComponentFixture<FormErrorMessagesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ FormErrorMessagesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormErrorMessagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
