import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { MeetupsAddComponent } from './meetups-add.component';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';


describe('MeetupsAddComponent', () => {
  let component: MeetupsAddComponent;
  let fixture: ComponentFixture<MeetupsAddComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, HttpModule ],
      declarations: [ MeetupsAddComponent ],
      providers: [CouchService]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeetupsAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
