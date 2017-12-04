import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { HomeComponent } from './home.component';
import { NavigationComponent } from './navigation.component';
import { CouchService } from '../shared/couchdb.service';

describe('Home', () => {

  const setup = () => {
    TestBed.configureTestingModule({
      imports: [ RouterTestingModule, CommonModule, HttpClientModule ],
      declarations: [ HomeComponent, NavigationComponent ],
      providers: [ CouchService ]
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
