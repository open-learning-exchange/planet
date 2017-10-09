import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { MeetupsComponent } from './meetups.component';
import { HttpModule } from '@angular/http';

describe('MeetupsComponent', () => {
  
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpModule
      ],
      declarations: [ MeetupsComponent ],
      providers:[CouchService]
    })
    .compileComponents();
  }));

  let component: MeetupsComponent;
  let fixture: ComponentFixture<MeetupsComponent>;
  let spy: any;
  let couchService;
  let de;
  let statusElement;
  //let testModel;
  let meetupdata1;
  let meetupdata2;
  let meetuparray;

  beforeEach(() => {
    fixture = TestBed.createComponent(MeetupsComponent);
    component = fixture.componentInstance;
    couchService = fixture.debugElement.injector.get(CouchService);
    //testModel = {id:'1', rev: 'qwrjksf'};
    de = fixture.debugElement;
    statusElement = de.nativeElement.querySelector('p');
    meetupdata1 ={id:'1', rev:'qwrjksf',title:'happyhangout', description:'once a week'}; 
    meetupdata2 ={id:'2', rev:'ghjjdrt',title:'angularhangout', description:'twice a week'};
    meetuparray ={meetupdata1, meetupdata2}
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
  
  it('should make a get request to couchService', () => {
    spy = spyOn(couchService, 'get').and.returnValue(Promise.resolve());
    component.getMeetups();
    fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(spy).toHaveBeenCalledWith('meetups/_all_docs?include_docs=true');
    });
  });
  
  it('should getmeetups',() =>{
    
      spy = spyOn(couchService, 'get').and.returnValue(Promise.resolve(meetuparray)); 
      component.getMeetups();
      fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(meetuparray.calls.allArgs()).toEqual([{id:'1', rev:'qwrjksf',title:'happyhangout', description:'once a week'}, {id:'2', rev:'ghjjdrt',title:'angularhangout', description:'twice a week'}]);
      });
  });

  it('should show There was a problem getting meetups', async() =>{
    spy = spyOn(couchService, 'get').and.returnValue(Promise.reject({}));
    component.getMeetups();
    fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(statusElement.textContent).toBe('There was a problem getting meetups');
    });
  });

  
  it('should make a delete request to couchService', () => {
   
    spy = spyOn(couchService, 'delete').and.returnValue(Promise.resolve());
    component.deleteMeetup(meetupdata1.id, meetupdata1.rev);
    fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(spy).toHaveBeenCalledWith('meetups/' + meetupdata1.id + '?rev=' + meetupdata1.rev);
    });
  });

  it('should delete a specific meetup', async() =>{
    spy = spyOn(couchService, 'delete').and.returnValue(Promise.resolve(meetuparray));
      component.deleteMeetup('1', 'qwrjksf');
      fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(meetuparray.calls.allArgs()).toEqual({id:'2', rev:'ghjjdrt',title:'angularhangout', description:'twice a week'});
      });
  });

  it('should There was a problem deleting this meetup', async() =>{
    spy = spyOn(couchService, 'delete').and.returnValue(Promise.reject({}));
    component.deleteMeetup(meetupdata1.id, meetupdata1.rev);
    fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(statusElement.textContent).toBe('There was a problem deleting this meetup');
    });
  });
})