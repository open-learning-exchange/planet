import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedbackDirective } from './feedback.directive';
import { Component } from '@angular/core/src/metadata/directives';

// Simple component to test that FeedbackDirective is working on
// different HTML tags
@Component({
  template: `
    <a planet-feedback></a>
    <button planet-feedback></button>
    <div planet-feedback></div>
  `
})
class TestComponent { }

describe('FeedbackDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ FeedbackDirective, TestComponent ]
    })
    .compileComponents();
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
