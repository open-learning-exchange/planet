import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs/observable/of';
import { debugOperator } from './debug-operator';
import { Observable } from 'rxjs/Observable';

Observable.prototype.debug = debugOperator;

declare module 'rxjs/Observable' {
  interface Observable<T> {
    debug: typeof debugOperator;
  }
}

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ RouterTestingModule ],
      declarations: [ AppComponent ]
    });
  });

  it('Should be an AppComponent', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance instanceof AppComponent).toBe(true, 'Should create AppComponent');
  });
});
