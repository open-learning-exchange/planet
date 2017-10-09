import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { MeetupsaddComponent } from './meetupsadd.component';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';


describe('MeetupsaddComponent', () => {
  let component: MeetupsaddComponent;
  let fixture: ComponentFixture<MeetupsaddComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, HttpModule ],
      declarations: [ MeetupsaddComponent ],
      providers: [CouchService]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeetupsaddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
