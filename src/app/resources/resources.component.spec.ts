import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CouchService } from '../shared/couchdb.service';
import { HttpModule } from '@angular/http';
import { ResourcesComponent } from './resources.component';
import { FormsModule }   from '@angular/forms'

describe('ResourcesComponent', () => {
  let component: ResourcesComponent;
  let fixture: ComponentFixture<ResourcesComponent>;
  let putSpy: any;
  let getSpy: any;
  let couchService;
  let statusElement;
  let de;
  let testEvent;
  let attachments;
  let testdata;
  let motoristshandbook;
  let testresource1;
  let testinput;
  //let testArray;
  //let blob;

  beforeEach((() => {
    TestBed.configureTestingModule({
     
      imports: [ FormsModule, RouterTestingModule, HttpModule ],
      declarations: [ ResourcesComponent ],
      providers: [ CouchService ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
   
    fixture = TestBed.createComponent(ResourcesComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement;
    couchService = fixture.debugElement.injector.get(CouchService);
    statusElement = de.nativeElement.querySelector('span');
    testdata = { digest: "567", length: 3287300, revpos:1, stub:true };
    motoristshandbook = { filename:"motorists-handbook.pdf", id: "motorists-handbook.pdf", mediaType: 'pdf', attachments:{ content_type: "application/pdf", testdata }};
    testresource1= Object.assign({ 'filename': motoristshandbook.filename, '_id': motoristshandbook.id, '_attachments':motoristshandbook.attachments, mediaType: motoristshandbook.mediaType });
    testinput = Object.assign({ name: "helloworld.pdf", lastModified: 1509907562000, webkitRelativePath: "", size: 519916, type:"application/pdf"});
    testinput.Event = ({
       type : 'change',
       target: {
         files: FileList
       }
    });
    //testArray = ['<a id="a"><b id="b">hey!</b></a>']; 
    //component.file = new Blob(testArray, {type : 'text/html'});
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
  
  //test bindFile(event)
  it('should bindFile',() =>{
      component.bindFile(testinput.Event);
      expect(component.file).toEqual(testinput.Event.target.files[0]);
  });

  //test submitResources()
  it('should make a put request to couchService', () =>{
      putSpy =spyOn(couchService, 'put').and.returnValue(Promise.resolve());
      //component.file = blob;
      //compoent.submitResource();
      fixture.whenStable().then(() =>{
          component.submitResource();
          fixture.detectChanges();
          expect(putSpy).toHaveBeenCalled();
      });
  });

  it('should submitResources successfully', ()=>{
      putSpy =spyOn(couchService, 'put').and.returnValue(Promise.resolve(testresource1));
      fixture.whenStable().then(() =>{
        component.submitResource();
        fixture.detectChanges();
        expect(statusElement.textContent).toBe('Success');
      });
  });
 
  it('should There was a error submitResource',()=>{
      putSpy =spyOn(couchService, 'put').and.returnValue(Promise.reject({}));
        fixture.whenStable().then(() =>{
          component.submitResource();
          fixture.detectChanges();
          expect(statusElement.textContent).toBe('Error');
        });
  });

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
    const resourceRows = de.nativeElement.querySelector('a');
    getSpy = spyOn(couchService, 'get').and.returnValue(Promise.resolve(testresource1));
    component.getResources();
    fixture.whenStable().then(() =>{
      fixture.detectChanges();
      expect(resourceRows.textContent).toBe(testresource1.filename);
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
