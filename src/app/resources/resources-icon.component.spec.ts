import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PlanetResourceIconComponent, resolveResourceIconInfo } from './resources-icon.component';

describe('PlanetResourceIconComponent & resolveResourceIconInfo', () => {
  describe('resolveResourceIconInfo', () => {
    it('should return empty info for null or undefined resource', () => {
      expect(resolveResourceIconInfo(null)).toEqual({ icon: '', tooltip: '', category: 'none' });
      expect(resolveResourceIconInfo(undefined)).toEqual({ icon: '', tooltip: '', category: 'none' });
    });

    it('should return empty info for resources without an attached file', () => {
      // Resource document without _attachments, filename, or file
      const noFileResource = {
        title: 'Community Policy Document',
        description: 'Just a text description with no attached file',
        author: 'Admin',
        _attachments: {}
      };
      expect(resolveResourceIconInfo(noFileResource)).toEqual({ icon: '', tooltip: '', category: 'none' });

      const emptyDocWrapper = {
        _id: 'sample-id',
        doc: {
          title: 'Empty Resource',
          description: 'No files attached'
        }
      };
      expect(resolveResourceIconInfo(emptyDocWrapper)).toEqual({ icon: '', tooltip: '', category: 'none' });
    });

    it('should resolve PDF resources', () => {
      const byExtension = resolveResourceIconInfo({ filename: 'handbook.pdf' });
      expect(byExtension.icon).toBe('picture_as_pdf');
      expect(byExtension.category).toBe('pdf');

      const byMime = resolveResourceIconInfo({
        _attachments: { 'file.pdf': { content_type: 'application/pdf' } }
      });
      expect(byMime.icon).toBe('picture_as_pdf');

      const byMediaType = resolveResourceIconInfo({ filename: 'doc.pdf', mediaType: 'pdf' });
      expect(byMediaType.icon).toBe('picture_as_pdf');

      const byOpenWith = resolveResourceIconInfo({ filename: 'doc.pdf', openWith: 'PDF.js' });
      expect(byOpenWith.icon).toBe('picture_as_pdf');
    });

    it('should resolve Video resources', () => {
      const byExtension = resolveResourceIconInfo({ filename: 'lesson.mp4' });
      expect(byExtension.icon).toBe('videocam');
      expect(byExtension.category).toBe('video');

      const byMime = resolveResourceIconInfo({
        _attachments: { 'video.webm': { content_type: 'video/webm' } }
      });
      expect(byMime.icon).toBe('videocam');

      const byMediaType = resolveResourceIconInfo({ filename: 'clip.mp4', mediaType: 'video' });
      expect(byMediaType.icon).toBe('videocam');
    });

    it('should resolve Audio resources', () => {
      const byExtension = resolveResourceIconInfo({ filename: 'recording.mp3' });
      expect(byExtension.icon).toBe('audiotrack');
      expect(byExtension.category).toBe('audio');

      const byMime = resolveResourceIconInfo({
        _attachments: { 'audio.ogg': { content_type: 'audio/ogg' } }
      });
      expect(byMime.icon).toBe('audiotrack');

      const byMediaType = resolveResourceIconInfo({ filename: 'track.mp3', mediaType: 'audio' });
      expect(byMediaType.icon).toBe('audiotrack');
    });

    it('should resolve Spreadsheet and CSV resources using grid_on icon', () => {
      const byCsvExt = resolveResourceIconInfo({ filename: 'scores.csv' });
      expect(byCsvExt.icon).toBe('grid_on');
      expect(byCsvExt.category).toBe('spreadsheet');

      const byXlsxExt = resolveResourceIconInfo({ filename: 'budget.xlsx' });
      expect(byXlsxExt.icon).toBe('grid_on');

      const byMime = resolveResourceIconInfo({
        _attachments: { 'data.csv': { content_type: 'text/csv' } }
      });
      expect(byMime.icon).toBe('grid_on');

      const byMediaType = resolveResourceIconInfo({ filename: 'data.csv', mediaType: 'csv' });
      expect(byMediaType.icon).toBe('grid_on');
    });

    it('should resolve Image resources', () => {
      const byExtension = resolveResourceIconInfo({ filename: 'diagram.png' });
      expect(byExtension.icon).toBe('image');
      expect(byExtension.category).toBe('image');

      const byMime = resolveResourceIconInfo({
        _attachments: { 'photo.jpg': { content_type: 'image/jpeg' } }
      });
      expect(byMime.icon).toBe('image');

      const byMediaType = resolveResourceIconInfo({ filename: 'picture.png', mediaType: 'Graphic/Pictures' });
      expect(byMediaType.icon).toBe('image');
    });

    it('should resolve Interactive Web and Multi-attachment HTML resources', () => {
      const byMultiAttachments = resolveResourceIconInfo({
        _attachments: {
          'index.html': { content_type: 'text/html' },
          'style.css': { content_type: 'text/css' }
        }
      });
      expect(byMultiAttachments.icon).toBe('language');
      expect(byMultiAttachments.category).toBe('html');

      const byHtmlExt = resolveResourceIconInfo({ filename: 'index.html' });
      expect(byHtmlExt.icon).toBe('language');

      const byMediaType = resolveResourceIconInfo({ filename: 'module.zip', mediaType: 'HTML' });
      expect(byMediaType.icon).toBe('language');
    });

    it('should resolve Word documents', () => {
      const byDocx = resolveResourceIconInfo({ filename: 'essay.docx' });
      expect(byDocx.icon).toBe('description');
      expect(byDocx.category).toBe('word');

      const byMime = resolveResourceIconInfo({
        _attachments: { 'doc.docx': { content_type: 'application/msword' } }
      });
      expect(byMime.icon).toBe('description');
    });

    it('should resolve Presentation slide decks', () => {
      const byPptx = resolveResourceIconInfo({ filename: 'lecture.pptx' });
      expect(byPptx.icon).toBe('slideshow');
      expect(byPptx.category).toBe('presentation');

      const byMime = resolveResourceIconInfo({
        _attachments: { 'slides.pptx': { content_type: 'application/vnd.ms-powerpoint' } }
      });
      expect(byMime.icon).toBe('slideshow');
    });

    it('should resolve Text and Markdown files', () => {
      const byMd = resolveResourceIconInfo({ filename: 'notes.md' });
      expect(byMd.icon).toBe('description');
      expect(byMd.category).toBe('text');

      const byMime = resolveResourceIconInfo({
        _attachments: { 'notes.txt': { content_type: 'text/plain' } }
      });
      expect(byMime.icon).toBe('description');
    });

    it('should resolve Compressed Archive files using archive icon', () => {
      const byZip = resolveResourceIconInfo({
        filename: 'archive.zip',
        _attachments: { 'archive.zip': { content_type: 'application/zip' } }
      });
      expect(byZip.icon).toBe('archive');
      expect(byZip.category).toBe('archive');

      const byTar = resolveResourceIconInfo({ filename: 'bundle.tar.gz' });
      expect(byTar.icon).toBe('archive');
    });

    it('should fallback to insert_drive_file for generic unrecognized files with attachment', () => {
      const generic = resolveResourceIconInfo({
        filename: 'custom.xyz',
        title: 'Custom File',
        _attachments: { 'custom.xyz': { content_type: 'application/octet-stream' } }
      });
      expect(generic.icon).toBe('insert_drive_file');
      expect(generic.category).toBe('file');
    });

    it('should unwrap enriched resource wrapper objects ({ doc: ... })', () => {
      const wrapped = resolveResourceIconInfo({
        _id: '123',
        doc: {
          title: 'Wrapped Resource',
          filename: 'guide.pdf',
          _attachments: { 'guide.pdf': { content_type: 'application/pdf' } }
        }
      });
      expect(wrapped.icon).toBe('picture_as_pdf');
      expect(wrapped.category).toBe('pdf');
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

    it('should render the icon when resource has an attached file', () => {
      component.resource = {
        title: 'Reading',
        filename: 'reading.pdf',
        _attachments: { 'reading.pdf': { content_type: 'application/pdf' } }
      };
      component.ngOnChanges();
      fixture.detectChanges();

      const iconEl = fixture.debugElement.query(By.css('.km-resource-icon'));
      expect(iconEl).toBeTruthy();
      expect(iconEl.nativeElement.textContent.trim()).toBe('picture_as_pdf');
    });

    it('should not render icon when resource is null, empty, or without attached file', () => {
      component.resource = null;
      component.ngOnChanges();
      fixture.detectChanges();

      let iconEl = fixture.debugElement.query(By.css('.km-resource-icon'));
      expect(iconEl).toBeNull();

      // Resource without an attached file
      component.resource = {
        title: 'No file resource',
        description: 'Test without attachment',
        _attachments: {}
      };
      component.ngOnChanges();
      fixture.detectChanges();

      iconEl = fixture.debugElement.query(By.css('.km-resource-icon'));
      expect(iconEl).toBeNull();
    });

    it('should reactively update the icon when the associated file is replaced', () => {
      // Step 1: Initial PDF file
      component.resource = {
        title: 'Course Guide',
        filename: 'guide.pdf',
        _attachments: { 'guide.pdf': { content_type: 'application/pdf' } }
      };
      component.ngOnChanges();
      fixture.detectChanges();

      let iconEl = fixture.debugElement.query(By.css('.km-resource-icon'));
      expect(iconEl.nativeElement.textContent.trim()).toBe('picture_as_pdf');

      // Step 2: User replaces the file with an MP4 video
      component.resource = {
        title: 'Course Guide',
        filename: 'guide.mp4',
        _attachments: { 'guide.mp4': { content_type: 'video/mp4' } }
      };
      component.ngOnChanges();
      fixture.detectChanges();

      iconEl = fixture.debugElement.query(By.css('.km-resource-icon'));
      expect(iconEl.nativeElement.textContent.trim()).toBe('videocam');

      // Step 3: User replaces the file with a CSV dataset
      component.resource = {
        title: 'Course Guide',
        filename: 'data.csv',
        _attachments: { 'data.csv': { content_type: 'text/csv' } }
      };
      component.ngOnChanges();
      fixture.detectChanges();

      iconEl = fixture.debugElement.query(By.css('.km-resource-icon'));
      expect(iconEl.nativeElement.textContent.trim()).toBe('grid_on');
    });
  });
});
