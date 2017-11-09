import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CouchService } from '../shared/couchdb.service';
import { HttpModule } from '@angular/http';
import { ResourcesViewComponent } from './resources-view.component';
import { FormsModule }   from '@angular/forms'

describe('ResourcesViewComponent', () => {
    let component: ResourcesViewComponent;
    let fixture: ComponentFixture<ResourcesViewComponent>;
    let postSpy: any;
    let getSpy: any;
    let id: string;
    let couchService;
    let statusElement;
    let testdata;
    let testimage;
    let testresource1;
    //let resourceSrc;
    let de;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
          imports: [ FormsModule, RouterTestingModule, HttpModule ],
          declarations: [ ResourcesViewComponent ],
          providers: [ CouchService ]
        })
        .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ResourcesViewComponent);
        component = fixture.componentInstance;
        de = fixture.debugElement;
        couchService = fixture.debugElement.injector.get(CouchService);
        testdata = { digest: "md5", length: 456321, revpos:1, stub:true };
        testimage = { filename:"scenery.png", id: "scenery.png", mediaType: 'img', attachments:{ content_type: "application/image", testdata }};
        testresource1= Object.assign({ 'filename': testimage.filename, '_id': testimage.id, '_attachments':testimage.attachments, mediaType: testimage.mediaType });
      });
    
      it('should be created', () => {
        expect(component).toBeTruthy();
      });

      //test getResource()
      it('should make a get request to couchService', () =>{
        getSpy = spyOn(couchService, 'get').and.returnValue(Promise.resolve(testresource1._id));
        component.getResource(testresource1._id);
        fixture.whenStable().then(() =>{
          fixture.detectChanges();
          expect(getSpy).toHaveBeenCalledWith('resources/' + testresource1._id);
        });
      });

      it('should getResource', ()=>{
        statusElement = de.nativeElement.querySelector('img');
        getSpy = spyOn(couchService, 'get').and.returnValue(Promise.resolve(component.resourceSrc));
        component.getResource(testresource1._id);
        fixture.whenStable().then(() =>{
          fixture.detectChanges();
          expect(statusElement.textContext).toBe(component.resourceSrc);
        });
      });
    
      it('should There was a problem getResource', () =>{
        statusElement = de.nativeElement.querySelector('audio');
        getSpy = spyOn(couchService,'get').and.returnValue(Promise.reject({}));
        component.getResource(testresource1._id);
        fixture.whenStable().then(() =>{
          fixture.detectChanges();
          expect(statusElement.textContext).toBe('Error');
        });
      });
})