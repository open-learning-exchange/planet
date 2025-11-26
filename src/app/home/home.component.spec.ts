import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MaterialModule } from '../shared/material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HomeComponent } from './home.component';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { of } from 'rxjs';

describe('Home', () => {

  const setup = () => {
    TestBed.configureTestingModule({
      imports: [ RouterTestingModule, BrowserAnimationsModule, CommonModule, HttpClientModule, MaterialModule ],
      declarations: [ HomeComponent ],
      providers: [ CouchService, UserService ]
    });
    const fixture = TestBed.createComponent(HomeComponent),
      comp = fixture.componentInstance;
    return { fixture, comp };
  };

  it('Should be a HomeComponent', () => {
    const { comp } = setup();
    expect(comp instanceof HomeComponent).toBe(true, 'Should create HomeComponent');
  });

});
