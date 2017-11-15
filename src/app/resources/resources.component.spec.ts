import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CouchService } from '../shared/couchdb.service';
import { HttpModule } from '@angular/http';
import { ResourcesComponent } from './resources.component';
import { FormsModule } from '@angular/forms'

describe('ResourcesComponent', () => {
  let component: ResourcesComponent;
  let fixture: ComponentFixture<ResourcesComponent>;
  let putSpy: any;
  let getSpy: any;
  let couchService;
  let statusElement;
  let statusElement1;
  let de;
  let attachments;
  let motoristshandbook;
  let blob;
  let fakeF;

  beforeEach((() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, RouterTestingModule, HttpModule ],
      declarations: [ ResourcesComponent ],
      providers: [ CouchService ]
    });
  }));

  beforeEach(() => {
   
    fixture = TestBed.createComponent(ResourcesComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement;
    couchService = fixture.debugElement.injector.get(CouchService);
    statusElement = de.nativeElement.querySelector('.km-resouces-message');
    statusElement1 = de.nativeElement.querySelector('.km-resouces-filename');
    motoristshandbook = { filename:"motorists-handbook.pdf", id: "motorists-handbook.pdf", mediaType: 'pdf', attachments:{ 'motorists-handbook.pdf': { content_type: "application/pdf" } } };
    motoristshandbook.Event = ({
       type : 'change',
       target: {
         files: FileList
       }
    });
    blob = new Blob([""], { type: 'text/html' });
    blob["lastModifiedDate"] = "11/14/2017";
    blob["name"] = "motoristshandbook";
    fakeF = <File>blob;

  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
  
  //test bindFile(event)
  it('should bindFile',() =>{
      component.bindFile(motoristshandbook.Event);
      expect(component.file).toEqual(motoristshandbook.Event.target.files[0]);
  });

  //test submitResources()
  
  it('should make a put request to couchService', () =>{
      putSpy =spyOn(couchService, 'put').and.returnValue(Promise.resolve({filename:fakeF.name, motoristshandbook}));
         component.file = fakeF;
         component.submitResource();
        fixture.whenStable().then(() =>{
          fixture.detectChanges();
          expect(putSpy).toHaveBeenCalled();
        });
  });
  /*
  it('should submitResources successfully', ()=>{
      putSpy =spyOn(couchService, 'put').and.returnValue(Promise.resolve(motoristshandbook));
        component.file = fakeF;
        component.submitResource();
      fixture.whenStable().then(() =>{
        fixture.detectChanges();
        expect(statusElement.textContent).toBe('Success');
      });
  });
  
  it('should There was a error submitResource',()=>{
      putSpy =spyOn(couchService, 'put').and.returnValue(Promise.reject({}));
        component.file = fakeF;
        component.submitResource;
        fixture.whenStable().then(() =>{
          fixture.detectChanges();
          expect(statusElement.textContent).toBe('Error');
        });
  });*/

  //test getResources()
  it('should make a get request to couchService', () =>{
    getSpy = spyOn(couchService, 'get').and.returnValue(Promise.resolve());
    component.getResources();
    fixture.whenStable().then(() =>{
      fixture.detectChanges();
      expect(getSpy).toHaveBeenCalledWith('resources/_all_docs?include_docs=true');
    });
  });

  it('should getResources', ()=>{
    getSpy = spyOn(couchService, 'get').and.returnValue(Promise.resolve(motoristshandbook));
    component.getResources();
    fixture.whenStable().then(() =>{
      fixture.detectChanges();
      expect(statusElement1.textContent).toBe(motoristshandbook.filename);
    });
  });

  it('should There was a problem getResource', () =>{
    getSpy = spyOn(couchService,'get').and.returnValue(Promise.reject({}));
    component.getResources();
    fixture.whenStable().then(() =>{
      fixture.detectChanges();
      expect(statusElement.textContent).toBe('Error');
    });
  });
})
