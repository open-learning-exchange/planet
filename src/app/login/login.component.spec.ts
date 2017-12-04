
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './login.component';
import { Router, RouterModule } from '@angular/router';
import { CouchService } from '../shared/couchdb.service';

describe('Login', () => {

  let spy: any;

  const setup = () => {
    TestBed.configureTestingModule({
      imports: [ RouterTestingModule.withRoutes([]), FormsModule, CommonModule, HttpClientModule ],
      declarations: [ LoginComponent ],
      providers: [ CouchService ]
    });
    const fixture = TestBed.createComponent(LoginComponent),
      comp = fixture.componentInstance,
      de = fixture.debugElement.query(By.css('#login-status')),
      statusElement = de.nativeElement,
      couchService = fixture.debugElement.injector.get(CouchService),
      testModel = { name: 'test', password: 'password', repeatPassword: 'password' };
    return { fixture, comp, statusElement, couchService, testModel };
  };

  it('Should be a LoginComponent', () => {
    const { comp } = setup();
    expect(comp instanceof LoginComponent).toBe(true, 'Should create AppComponent');
  });

  it('Should have a createMode property', () => {
    const { comp } = setup();
    expect(comp.createMode).toBe(false, 'createMode property is false by default');
  });

  it('Should display create user message', () => {
    const { fixture, comp, statusElement, couchService, testModel } = setup();
    spy = spyOn(couchService, 'put').and.returnValue(Promise.resolve({ id: 'org.couchdb.user:' + testModel.name }));
    comp.createUser(testModel);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement.textContent).toBe('User created: ' + testModel.name, 'Create user message displays correctly');
    });
  });

  it('Should reject nonmatching passwords', () => {
    const { fixture, comp, statusElement, couchService, testModel } = setup();
    testModel.repeatPassword = 'passwor';
    comp.createUser(testModel);
    fixture.detectChanges();
    expect(statusElement.textContent).toBe('Passwords do not match', 'Create user message displays correctly');
  });
  /*
  it('Should greet users', () => {
    const { fixture, comp, statusElement, couchService, testModel } = setup();
    spy = spyOn(couchService, 'post').and.returnValue(Promise.resolve({name: testModel.name}));
    comp.login(testModel);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement.textContent).toBe('Hi, ' + testModel.name + '!', 'Create user message displays correctly');
    });
  });
  */
  it('Should message when user & password do not match', () => {
    const { fixture, comp, statusElement, couchService, testModel } = setup();
    spy = spyOn(couchService, 'post').and.returnValue(Promise.reject({}));
    comp.login(testModel);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement.textContent).toBe('Username and/or password do not match');
    });
  });

});
