import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RequestsComponent } from './requests.component';
import { CouchService } from '../../shared/couchdb.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../../shared/material.module';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';

describe('RequestsComponent', () => {
  let component: RequestsComponent;
  let fixture: ComponentFixture<RequestsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, BrowserAnimationsModule, MaterialModule, RouterTestingModule, RequestsComponent],
      providers: [
        CouchService,
        provideHttpClient(withInterceptorsFromDi()),
        {
          provide: DialogsFormService,
          useValue: {
            confirm: () => of({}),
            openDialogsForm: () => {},
            closeDialogsForm: () => {},
            showErrorMessage: () => {}
          }
        }
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
