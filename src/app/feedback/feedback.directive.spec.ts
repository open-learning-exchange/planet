import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedbackDirective } from './feedback.directive';

// Simple component to test that FeedbackDirective is working on
// different HTML tags
// Simple component to test that FeedbackDirective is working on
// different HTML tags
@Component({
  template: `
    <a planetFeedback></a>
    <button planetFeedback></button>
    <div planetFeedback></div>
  `
})
class TestComponent { }

describe('FeedbackDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FeedbackDirective, TestComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
