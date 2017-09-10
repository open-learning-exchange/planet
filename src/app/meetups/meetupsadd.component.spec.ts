import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetupsaddComponent } from './meetupsadd.component';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';


describe('MeetupsaddComponent', () => {
  let component: MeetupsaddComponent;
  let fixture: ComponentFixture<MeetupsaddComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, HttpModule ],
      declarations: [ MeetupsaddComponent ]
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
