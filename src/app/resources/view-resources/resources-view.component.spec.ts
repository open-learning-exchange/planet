import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { ResourcesViewComponent } from './resources-view.component';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { HttpClientModule } from '@angular/common/http';
import { MaterialModule } from '../../shared/material.module';
import { FormsModule } from '@angular/forms';
import { FormBuilder } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs/observable/of';
import 'rxjs/add/observable/throw';
describe('ResourcesViewComponent', () => {
  /*
    let component: ResourcesViewComponent;
    let fixture: ComponentFixture<ResourcesViewComponent>;
    // let getSpy: any;
    let couchService;
    let statusElement;
    let testimage;
    let de;

    beforeEach(() => {
        TestBed.configureTestingModule({
          imports: [ FormsModule, RouterTestingModule, HttpClientModule, MaterialModule ],
          declarations: [ ResourcesViewComponent ],
          providers: [ CouchService, UserService, DialogsFormService, FormBuilder ]
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
    /*
    it('should make a get request to couchService', () => {
        getSpy = spyOn(couchService, 'get').and.returnValue(of(testimage.id));
        component.getResource(testimage.id);
        fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(getSpy).toHaveBeenCalledWith('resources/' + testimage.id);
        });
      });

    it('should getResource', () => {
        getSpy = spyOn(couchService, 'get').and.returnValue(of(testimage));
        component.getResource(testimage.id);
        fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(statusElement.textContext).toBe(testimage);
        });
      });

    it('should There was a problem getResource', () => {
        getSpy = spyOn(couchService, 'get').and.returnValue(Rx.Observable.throw({ Error }));
        component.getResource(testimage.id);
        fixture.whenStable().then(() => {
          fixture.detectChanges();
          expect(statusElement.textContext).toBe('Error');
        });
      });
    */
});
