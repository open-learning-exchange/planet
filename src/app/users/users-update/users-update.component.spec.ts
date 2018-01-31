import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormErrorMessagesComponent } from '../../shared/form-error-messages.component';
import { UsersUpdateComponent } from './users-update.component';
import { Location } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CouchService } from '../../shared/couchdb.service';
import { HttpHandler } from '@angular/common/http';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MaterialModule } from '../../shared/material.module';

describe('UserUpdateProfileComponent', () => {
  let component: UsersUpdateComponent;
  let fixture: ComponentFixture<UsersUpdateComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, ReactiveFormsModule, MaterialModule, RouterTestingModule, BrowserAnimationsModule ],
      declarations: [ UsersUpdateComponent, FormErrorMessagesComponent ],
      providers: [ CouchService, Location, HttpClient, HttpClientModule, HttpHandler ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UsersUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

