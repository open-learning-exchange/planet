import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RequestsComponent } from './requests.component';
import { CouchService } from '../../shared/couchdb.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('RequestsComponent', () => {
  let component: RequestsComponent;
  let fixture: ComponentFixture<RequestsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [RequestsComponent],
      providers: [CouchService, provideHttpClient(withInterceptorsFromDi())]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
