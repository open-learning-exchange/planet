import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { LoginComponent } from './login.component';
import { CouchService } from '../shared/couchdb.service';
import { MaterialModule } from '../shared/material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('Login', () => {

  const setup = () => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([]), FormsModule, CommonModule, MaterialModule, BrowserAnimationsModule, LoginComponent],
      providers: [CouchService, provideHttpClient(withInterceptorsFromDi())]
    });
    const fixture = TestBed.createComponent(LoginComponent);
    const comp = fixture.componentInstance;
    return { fixture, comp };
  };
});
