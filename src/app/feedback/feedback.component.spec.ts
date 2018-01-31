import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { FormErrorMessagesComponent } from '../shared/form-error-messages.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FeedbackComponent } from './feedback.component';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { MaterialModule } from '../shared/material.module';

describe('FeedbackComponent', () => {
  let component: FeedbackComponent;
  let fixture: ComponentFixture<FeedbackComponent>;

  beforeEach((() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, ReactiveFormsModule, MaterialModule, HttpClientModule, BrowserAnimationsModule ],
      declarations: [ FeedbackComponent, FormErrorMessagesComponent ],
      providers: [ CouchService, UserService ]
    });
    fixture = TestBed.createComponent(FeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
