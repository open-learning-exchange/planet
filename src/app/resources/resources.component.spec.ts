import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ResourcesComponent } from './resources.component';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientModule } from '@angular/common/http';
import { MaterialModule } from '../shared/material.module';
import { RouterModule } from '@angular/router';
import { CouchService } from '../shared/couchdb.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs/observable/of';
import 'rxjs/add/observable/throw';

describe('ResourcesComponent', () => {
  /*
  let component: ResourcesComponent;
  let fixture: ComponentFixture<ResourcesComponent>;
  // let putSpy: any;
  let getSpy: any;
  let couchService;
  let statusElement;
  let de;
  let motoristshandbook;
  let blob;
  let fakeF;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, RouterModule, HttpClientModule, RouterTestingModule, MaterialModule, BrowserAnimationsModule ],
      declarations: [ ResourcesComponent ],
      providers: [ CouchService ]
    });
    fixture = TestBed.createComponent(ResourcesComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement;
    couchService = fixture.debugElement.injector.get(CouchService);
    statusElement = de.nativeElement.querySelector('.km-resources-title');
    motoristshandbook = { filename: 'motorists-handbook.pdf', id: 'motorists-handbook.pdf', mediaType: 'pdf',
                          attachments: { 'motorists-handbook.pdf': { content_type: 'application/pdf' } }, sum: 16, timesRated: 4 };
    motoristshandbook.Event = ({
       type : 'change',
       target: {
         files: FileList
       }
    });
    blob = new Blob([ '' ], { type: 'text/html' });
    blob['lastModifiedDate'] = '11/14/2017';
    blob['name'] = 'motoristshandbook';
    fakeF = <File>blob;

  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  /*
  it('should getRating', () => {
    component.getRating(motoristshandbook.sum, motoristshandbook.timesRated);
    expect(component.rating).toEqual(4.0);
  });
  */

  /*
  it('should bindFile', () => {
    component.bindFile(motoristshandbook.Event);
    expect(component.file).toEqual(motoristshandbook.Event.target.files[0]);
  });
  */

  /*
  it('should make a put request to couchService', () =>{
    putSpy =spyOn(couchService, 'put').and.returnValue(Promise.resolve({filename:fakeF.name, motoristshandbook}));
        component.file=fakeF;
        component.submitResource();
        fixture.whenStable().then(() =>{
          fixture.detectChanges();
          expect(putSpy).toHaveBeenCalled();
        });
  }));

  it('should submitResources successfully', ()=>{
      putSpy =spyOn(couchService, 'put').and.returnValue(Promise.resolve(motoristshandbook));
        component.file = fakeF;
        component.submitResource();
      fixture.whenStable().then(() =>{
        fixture.detectChanges();
        expect(component.message).toBe('Success');
      });
  });

  it('should There was a error submitResource',()=>{
      putSpy =spyOn(couchService, 'put').and.returnValue(Promise.reject({}));
        component.file = fakeF;
        component.submitResource;
        fixture.whenStable().then(() =>{
          fixture.detectChanges();
          expect(component.message).toBe('Error');
        });
  });

  // test getResources()
  it('should make a get request to couchService', () => {
    getSpy = spyOn(couchService, 'get').and.returnValue(of().map).and.callThrough();
    component.getResources();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(getSpy).toHaveBeenCalledWith('resources/_all_docs?include_docs=true');
    });
  });

  it('should getResources', () => {
    getSpy = spyOn(couchService, 'get').and.returnValue(of(motoristshandbook).map).and.callThrough();
    component.getResources();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(statusElement.textContent).toBe(motoristshandbook.filename);
    });
  });

  it('should There was a problem getResource', () => {
    getSpy = spyOn(couchService, 'get').and.returnValue(Rx.Observable.throw({ Error }));
    component.getResources();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.message).toBe('Error');
    });
  });
  */
});
