import mime from 'mime';
import { formatBytes } from '../shared/utils';
import { fileTypes } from './resources-constants';

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

const fileTypeFor = (value: string) => fileTypes.find(fileType => fileType.value === value);

const matchFileType = (contentType?: string | null) => fileTypes.find(({ pattern }) => contentType && pattern?.test(contentType));

// Zip uploads are unzipped, so several attachments without a chosen start file are a web bundle
export const resourceFileType = (doc?: ResourceDocumentWithAttachments | null) => {
  const filename = resourceAttachmentFilename(doc);
  if (!filename) {
    return undefined;
  }
  if (filename !== doc?.openWhichFile && Object.keys(attachmentsFor(doc)).length > 1) {
    return fileTypeFor('html');
  }
  const storedType = attachmentsFor(doc)[filename]?.content_type?.split(';')[0].trim().toLowerCase();
  return matchFileType(storedType) ?? matchFileType(mime.getType(filename)) ?? fileTypeFor('other');
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
  const attachmentLengths = Object.values(attachmentsFor(doc))
    .map(attachment => attachment.length)
    .filter((length): length is number => length !== undefined);
  if (attachmentLengths.length === 0) {
    return '';
  }
  const totalSize = attachmentLengths.reduce((total, length) => total + length, 0);
  return formatBytes(totalSize);
};
