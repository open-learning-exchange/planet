import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CouchService } from '../../shared/couchdb.service';
import { MeetupsAddComponent } from './meetups-add.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../shared/material.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';


describe('MeetupsAddComponent', () => {
  /*
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, HttpClientModule, MaterialModule, NoopAnimationsModule ],
      declarations: [ MeetupsAddComponent ],
      providers: [ CouchService ]
    })
    .compileComponents();
  }));

  let component: MeetupsAddComponent;
  let fixture;
  let spy: any;
  let couchService;
  let testModel: any;
  let de;
  let statusElement;
  let compiled;

  beforeEach(() => {
    fixture = TestBed.createComponent(MeetupsAddComponent);
    component = fixture.debugElement.componentInstance;
    couchService = fixture.debugElement.injector.get(CouchService);
    testModel = { title: 'hangout', description: 'once a week' };
    de = fixture.debugElement;
    compiled = fixture.debugElement.nativeElement;
    statusElement = de.nativeElement.querySelector('p');
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });


  it('should make a post request to couchService', () => {
    spy = spyOn(couchService, 'post').and.returnValue(of(testModel));
    component.onSubmit();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(spy).toHaveBeenCalled();
    });
  });

  it('should show meetup created: title correctly', () => {
    spy = spyOn(couchService, 'post').and.returnValue(of(testModel.title));
    component.onSubmit();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement.textContent).toBe('Meetup created: ' + testModel.title);
    });
  });

  it('should message Please complete the form', () => {
    testModel.title = '';
    testModel.description = '';
    component.onSubmit();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement.textContent).toBe('Please complete the form');
    });
  });

  it('should message There was a problem creating the meetup', () => {
    spy = spyOn(couchService, 'post').and.returnValue(Rx.Observable.throw({ Error }));
    component.onSubmit();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement.textContent).toBe('There was a problem creating the meetup');
    });
  });
  */
});
