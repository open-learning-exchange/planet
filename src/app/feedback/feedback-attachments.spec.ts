import { vi } from 'vitest';
import { PendingAttachment } from '../shared/forms/file-upload.component';
import { prepareFeedbackAttachments } from './feedback-attachments';

describe('feedback document attachments', () => {
  const image = (name = 'screen.png', type = 'image/png', contents = 'image'): PendingAttachment => ({
    file: new File([ contents ], name, { type }), originalName: name, safeName: name, contentType: type
  });

  afterEach(() => vi.restoreAllMocks());

  it('supports text-only feedback', async () => {
    expect(await prepareFeedbackAttachments().toPromise()).toEqual({});
  });

  it('preserves the actual bytes and MIME types of up to three images with unique, safe names', async () => {
    const attachments = await prepareFeedbackAttachments([
      image('screen shot.png'), image('screen shot.png', 'image/png', 'second'), image('photo.jpg', '', 'third')
    ]).toPromise();

    expect(Object.keys(attachments)).toEqual([ 'screenshot-screen_shot.png', 'screenshot-screen_shot-1.png', 'screenshot-photo.jpg' ]);
    expect(attachments['screenshot-screen_shot.png']).toEqual({ content_type: 'image/png', data: btoa('image') });
    expect(attachments['screenshot-screen_shot-1.png'].data).toBe(btoa('second'));
    expect(attachments['screenshot-photo.jpg'].content_type).toBe('image/jpeg');
  });

  it('propagates read failures instead of producing a partial attachment set', async () => {
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function () {
      this.onerror(new ProgressEvent('error'));
    });
    await expect(prepareFeedbackAttachments([ image() ]).toPromise()).rejects.toThrow('Could not read');
  });
});
