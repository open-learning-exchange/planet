import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms'
import { NationComponent } from './nation.component';
import { FormErrorMessagesComponent } from '../shared/form-error-messages.component';
import { RouterTestingModule } from '@angular/router/testing';
import { NationValidatorService } from '../validators/nation-validator.service';
import { CouchService } from '../shared/couchdb.service';
import { HttpModule } from '@angular/http';

describe('NationComponent', () => {
  let component: NationComponent;
  let fixture: ComponentFixture<NationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ ReactiveFormsModule, RouterTestingModule, HttpModule ],
      declarations: [ NationComponent, FormErrorMessagesComponent ],
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
