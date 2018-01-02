import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NationComponent } from './nation.component';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MaterialModule } from '../shared/material.module';
import { FormErrorMessagesComponent } from '../shared/form-error-messages.component';
import { CouchService } from '../shared/couchdb.service';
import { RouterTestingModule } from '@angular/router/testing';
import { ValidatorService } from '../validators/validator.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { of } from 'rxjs/observable/of';

describe('NationComponent', () => {
  let component: NationComponent;
  let fixture: ComponentFixture<NationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ ReactiveFormsModule, FormsModule, HttpClientModule, RouterTestingModule, BrowserAnimationsModule, MaterialModule ],
      declarations: [ NationComponent, FormErrorMessagesComponent ],
      providers: [ CouchService, ValidatorService, DialogsFormService ]
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
