import { formatBytes } from '../shared/utils';

interface ResourceAttachment {
  content_type?: string;
  length?: number;
}

interface ResourceDocumentWithAttachments {
  openWhichFile?: string;
  _attachments?: Record<string, ResourceAttachment>;
}

const attachmentsFor = (doc?: ResourceDocumentWithAttachments | null): Record<string, ResourceAttachment> =>
  doc?._attachments ?? {};

export const resourceAttachmentFilename = (doc?: ResourceDocumentWithAttachments | null): string => {
  const attachments = attachmentsFor(doc);
  if (doc?.openWhichFile && attachments[doc.openWhichFile]) {
    return doc.openWhichFile;
  }
  return Object.keys(attachments)[0] ?? '';
};

export const formatResourceAttachmentSize = (
  doc?: ResourceDocumentWithAttachments | null,
  filename?: string
): string => {
  const attachments = attachmentsFor(doc);
  const selectedFilename = filename || resourceAttachmentFilename(doc);
  return formatBytes(attachments[selectedFilename]?.length);
};

export const formatResourceAttachmentsSize = (doc?: ResourceDocumentWithAttachments | null): string => {
  const totalSize = Object.values(attachmentsFor(doc))
    .reduce((total, attachment) => total + (attachment.length ?? 0), 0);
  return formatBytes(totalSize);
};
