import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PlanetResourceIconComponent, resolveResourceIconInfo } from './resources-icon.component';

describe('PlanetResourceIconComponent & resolveResourceIconInfo', () => {
  describe('resolveResourceIconInfo', () => {
    it.each([
      { desc: 'null resource', input: null, icon: '', cat: 'none' },
      { desc: 'undefined resource', input: undefined, icon: '', cat: 'none' },
      { desc: 'resource without files', input: { title: 'Policy', _attachments: {} }, icon: '', cat: 'none' },
      { desc: 'PDF by extension', input: { filename: 'handbook.pdf' }, icon: 'picture_as_pdf', cat: 'pdf' },
      {
        desc: 'PDF by MIME',
        input: { _attachments: { 'doc.pdf': { content_type: 'application/pdf' } } },
        icon: 'picture_as_pdf',
        cat: 'pdf'
      },
      {
        desc: 'PDF uppercase key',
        input: { filename: 'DOC.PDF', _attachments: { 'DOC.PDF': { content_type: 'application/pdf' } } },
        icon: 'picture_as_pdf',
        cat: 'pdf'
      },
      {
        desc: 'PDF extensionless MIME',
        input: { _attachments: { 'DOC_ATTACH': { content_type: 'application/pdf' } } },
        icon: 'picture_as_pdf',
        cat: 'pdf'
      },
      { desc: 'Video MP4', input: { filename: 'lesson.mp4' }, icon: 'videocam', cat: 'video' },
      { desc: 'Audio MP3', input: { filename: 'recording.mp3' }, icon: 'audiotrack', cat: 'audio' },
      { desc: 'CSV spreadsheet', input: { filename: 'scores.csv' }, icon: 'grid_on', cat: 'spreadsheet' },
      { desc: 'XLSX spreadsheet', input: { filename: 'budget.xlsx' }, icon: 'grid_on', cat: 'spreadsheet' },
      { desc: 'Image PNG', input: { filename: 'diagram.png' }, icon: 'image', cat: 'image' },
      {
        desc: 'Multi-attachment HTML',
        input: { _attachments: { 'index.html': { content_type: 'text/html' }, 'style.css': {} } },
        icon: 'language',
        cat: 'html'
      },
      { desc: 'Word DOCX', input: { filename: 'essay.docx' }, icon: 'description', cat: 'word' },
      { desc: 'Presentation PPTX', input: { filename: 'lecture.pptx' }, icon: 'slideshow', cat: 'presentation' },
      { desc: 'Markdown text', input: { filename: 'notes.md' }, icon: 'description', cat: 'text' },
      { desc: 'Archive ZIP', input: { filename: 'archive.zip' }, icon: 'archive', cat: 'archive' },
      { desc: 'Archive tar.gz', input: { filename: 'bundle.tar.gz' }, icon: 'archive', cat: 'archive' },
      {
        desc: 'Generic file fallback',
        input: { filename: 'custom.xyz', _attachments: { 'custom.xyz': {} } },
        icon: 'insert_drive_file',
        cat: 'file'
      },
      { desc: 'Unwrapped doc object', input: { doc: { filename: 'guide.pdf' } }, icon: 'picture_as_pdf', cat: 'pdf' }
    ])('resolves $desc to $icon', ({ input, icon, cat }) => {
      const result = resolveResourceIconInfo(input);
      expect(result.icon).toBe(icon);
      expect(result.category).toBe(cat);
    });
  });

  describe('PlanetResourceIconComponent', () => {
    let fixture: ComponentFixture<PlanetResourceIconComponent>;
    let component: PlanetResourceIconComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [PlanetResourceIconComponent]
      }).compileComponents();

      fixture = TestBed.createComponent(PlanetResourceIconComponent);
      component = fixture.componentInstance;
    });

    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should render icon with aria-label and role="img" when resource has file', () => {
      component.resource = {
        title: 'Reading Guide',
        filename: 'reading.pdf',
        _attachments: { 'reading.pdf': { content_type: 'application/pdf' } }
      };
      component.ngOnChanges();
      fixture.detectChanges();

      const iconEl = fixture.debugElement.query(By.css('.km-resource-icon'));
      expect(iconEl).toBeTruthy();
      expect(iconEl.nativeElement.textContent.trim()).toBe('picture_as_pdf');
      expect(iconEl.attributes['aria-label']).toBe('PDF Document');
      expect(iconEl.attributes['role']).toBe('img');
    });

    it('should not render icon when resource has no file', () => {
      component.resource = { title: 'No file resource', _attachments: {} };
      component.ngOnChanges();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.km-resource-icon'))).toBeNull();
    });

    it('should reactively update the icon when the associated file is replaced', () => {
      // PDF -> Video -> Spreadsheet
      const files = [
        { filename: 'guide.pdf', contentType: 'application/pdf', expectedIcon: 'picture_as_pdf' },
        { filename: 'guide.mp4', contentType: 'video/mp4', expectedIcon: 'videocam' },
        { filename: 'data.csv', contentType: 'text/csv', expectedIcon: 'grid_on' }
      ];

      for (const file of files) {
        component.resource = {
          title: 'Course Item',
          filename: file.filename,
          _attachments: { [file.filename]: { content_type: file.contentType } }
        };
        component.ngOnChanges();
        fixture.detectChanges();

        const iconEl = fixture.debugElement.query(By.css('.km-resource-icon'));
        expect(iconEl.nativeElement.textContent.trim()).toBe(file.expectedIcon);
      }
    });
  });
});
