import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertsDeleteComponent } from '../shared/alerts/alerts-delete.component';
import { NationComponent } from './nation.component';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FormErrorMessagesComponent } from '../shared/form-error-messages.component';
import { CouchService } from '../shared/couchdb.service';
import { RouterTestingModule } from '@angular/router/testing';
import { NationValidatorService } from '../validators/nation-validator.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('NationComponent', () => {
  let component: NationComponent;
  let fixture: ComponentFixture<NationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ ReactiveFormsModule, FormsModule, HttpClientModule, RouterTestingModule, BrowserAnimationsModule ],
      declarations: [ NationComponent, AlertsDeleteComponent, FormErrorMessagesComponent ],
      providers: [ CouchService, NationValidatorService ]
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
