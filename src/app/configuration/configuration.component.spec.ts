import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MaterialModule } from '../shared/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { HttpClientModule } from '@angular/common/http';
import { ValidatorService } from '../validators/validator.service';
import { FormErrorMessagesComponent } from '../shared/forms/form-error-messages.component';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ConfigurationComponent } from './configuration.component';

describe('ConfigurationComponent', () => {
  let component: ConfigurationComponent;
  let fixture: ComponentFixture<ConfigurationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, HttpClientModule, BrowserAnimationsModule, ReactiveFormsModule, MaterialModule, RouterTestingModule ],
      declarations: [ ConfigurationComponent, FormErrorMessagesComponent ],
      providers: [ CouchService, ValidatorService ]
    });
    fixture = TestBed.createComponent(ConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
