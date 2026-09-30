import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ResourcesIconComponent } from './resources-icon.component';

describe('ResourcesIconComponent', () => {
  let fixture: ComponentFixture<ResourcesIconComponent>;

  const icon = () => fixture.debugElement.query(By.css('.km-resource-icon'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ ResourcesIconComponent ] }).compileComponents();
    fixture = TestBed.createComponent(ResourcesIconComponent);
  });

  it('labels the icon with the file type and follows attachment changes', () => {
    fixture.componentRef.setInput('resource', { _attachments: { 'guide.pdf': { content_type: 'application/pdf' } } });
    fixture.detectChanges();
    expect(icon().nativeElement.textContent.trim()).toBe('picture_as_pdf');
    expect(icon().attributes['aria-label']).toBe('PDF');
    expect(icon().attributes['aria-hidden']).toBe('false');

    fixture.componentRef.setInput('resource', { _attachments: { 'guide.mp4': { content_type: 'video/mp4' } } });
    fixture.detectChanges();
    expect(icon().nativeElement.textContent.trim()).toBe('movie');
  });

  it('renders nothing for a resource without attachments', () => {
    fixture.componentRef.setInput('resource', { title: 'Policy' });
    fixture.detectChanges();
    expect(icon()).toBeNull();
  });
});
