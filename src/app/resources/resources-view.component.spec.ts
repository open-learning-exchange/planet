import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CouchService } from '../shared/couchdb.service';
import { ResourcesViewComponent } from './resources-view.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

describe('ResourcesViewComponent', () => {
    let component: ResourcesViewComponent;
    let fixture: ComponentFixture<ResourcesViewComponent>;
    let getSpy: any;
    let couchService;
    let statusElement;
    let testimage;
    let de;

    beforeEach(() => {
        TestBed.configureTestingModule({
          imports: [ FormsModule, RouterTestingModule, HttpClientModule ],
          declarations: [ ResourcesViewComponent ],
          providers: [ CouchService ]
        });
        fixture = TestBed.createComponent(ResourcesViewComponent);
        component = fixture.componentInstance;
        de = fixture.debugElement;
        statusElement = de.nativeElement.querySelector('.km-resource-view img');
        couchService = fixture.debugElement.injector.get(CouchService);
        testimage = { filename: 'scenery.png', id: 'scenery.png', mediaType: 'img',
                      attachments: { 'scenery.png': { content_type: 'application/image' } } };
      });

    it('should be created', () => {
        expect(component).toBeTruthy();
      });

    // test getResource()
    it('should make a get request to couchService', () => {
        getSpy = spyOn(couchService, 'get').and.returnValue(Promise.resolve(testimage.id));
        component.getResource(testimage.id);
        fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(getSpy).toHaveBeenCalledWith('resources/' + testimage.id);
        });
      });

    it('should getResource', () => {
        getSpy = spyOn(couchService, 'get').and.returnValue(Promise.resolve(testimage));
        component.getResource(testimage.id);
        fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(statusElement.textContext).toBe(testimage);
        });
      });

    it('should There was a problem getResource', () => {
        getSpy = spyOn(couchService, 'get').and.returnValue(Promise.reject({}));
        component.getResource(testimage.id);
        fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(statusElement.textContext).toBe('Error');
        });
      });
});
