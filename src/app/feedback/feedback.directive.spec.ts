import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { FeedbackDirective } from './feedback.directive';
import { Component } from '@angular/core';

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
