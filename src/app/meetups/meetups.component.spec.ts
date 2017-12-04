import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { MeetupsComponent } from './meetups.component';
import { PlanetAlertsModule } from '../shared/alerts/planet-alerts.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { By } from '@angular/platform-browser';

describe('MeetupsComponent', () => {

  let component: MeetupsComponent;
  let fixture: ComponentFixture<MeetupsComponent>;
  let getSpy: any;
  let deleteSpy: any;
  let couchService;
  let de;
  let meetupdata1;
  let meetupdata2;
  let meetuparray;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
         PlanetAlertsModule, BrowserAnimationsModule, HttpClientModule
      ],
      declarations: [ MeetupsComponent ],
      providers: [ CouchService ]
    });
    fixture = TestBed.createComponent(MeetupsComponent);
    component = fixture.componentInstance;
    couchService = fixture.debugElement.injector.get(CouchService);
    de = fixture.debugElement;
    meetupdata1 = { _id: '1', _rev: 'qwrjksf', title: 'happyhangout', description: 'once a week' };
    meetupdata2 = { _id: '2', _rev: 'ghjjdrt', title: 'angularhangout', description: 'twice a week' };
    meetuparray = { rows: [ { doc: meetupdata1 }, { doc: meetupdata2 } ] };
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should make a get request to couchService', () => {
    getSpy = spyOn(couchService, 'get').and.returnValue(Promise.resolve({ rows: [] }));
    fixture.detectChanges();
    expect(getSpy).toHaveBeenCalledWith('meetups/_all_docs?include_docs=true');
  });

  it('should display meetups in a table', () => {
    const meetupRows = de.queryAll(By.css('.km-meetup-row'));
    getSpy = spyOn(couchService, 'get').and.returnValue(Promise.resolve(meetuparray));
    component.getMeetups();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      // Iterate over rows in the meetup table to check title & description match mock data
      meetupRows.map((rowElement, index) => {
        const title = rowElement.query(By.css('.km-meetup-title')).nativeElement;
        const description = rowElement.query(By.css('.km-meetup-description')).nativeElement;
        expect(title.textContent).toBe(meetuparray.rows[index].doc.title);
        expect(description.textContent).toBe(meetuparray.rows[index].doc.description);
      });
    });
  });

  it('should show There was a problem getting meetups', () => {
    const statusElement = de.query(By.css('.km-message')).nativeElement;
    getSpy = spyOn(couchService, 'get').and.returnValue(Promise.reject({}));
    component.getMeetups();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement.textContent).toBe('There was a problem getting meetups');
    });
  });

  it('should make a delete request to couchService', () => {
    component.deleteMeetup(meetupdata1);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(deleteSpy).toHaveBeenCalledWith('meetups/' + meetupdata1.id + '?rev=' + meetupdata1.rev);
    });
  });

  it('should There was a problem deleting this meetup', () => {
    const statusElement = de.query(By.css('.km-message')).nativeElement;
    deleteSpy = spyOn(couchService, 'delete').and.returnValue(Promise.reject({}));
    component.deleteMeetup(meetupdata1);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement.textContent).toBe('There was a problem deleting this meetup');
    });
  });

});
