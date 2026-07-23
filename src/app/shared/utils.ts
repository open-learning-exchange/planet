import * as showdown from 'showdown';
import mime from 'mime';
showdown.setOption('strikethrough', true);
export const converter = new showdown.Converter();

// File.type can be empty for some browsers / file sources; fall back to the
// filename extension via the mime package so callers don't reject valid files.
export const normalizedContentType = (file: File): string =>
  file.type || mime.getType(file.name) || '';

// HTML accept attribute matcher. Supports extension tokens (".pdf"), MIME
// types ("image/png") and MIME wildcards ("image/*"). Empty/missing accept allows anything.
export const isAcceptableFile = (file: File, accept?: string): boolean => {
  if (!accept || !accept.trim()) {
    return true;
  }
  const filename = file.name.toLowerCase();
  const ext = filename.includes('.') ? '.' + filename.split('.').pop() : '';
  const contentType = normalizedContentType(file).toLowerCase();
  return accept
    .split(',')
    .map(token => token.trim().toLowerCase())
    .filter(Boolean)
    .some(token => {
      if (token.startsWith('.')) {
        return ext === token;
      }
      if (token.endsWith('/*')) {
        return contentType.startsWith(token.slice(0, -1));
      }
      return contentType === token;
    });
};

export const safeAttachmentName = (name: string, usedNames: string[] = []): string => {
  const trimmed = name.trim().replace(/\s+/g, '_').replace(/[/?#\\%*:|"<>]/g, '_') || 'attachment';
  if (usedNames.indexOf(trimmed) === -1) {
    return trimmed;
  }
  const lastDot = trimmed.lastIndexOf('.');
  const baseName = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
  const ext = lastDot > 0 ? trimmed.slice(lastDot) : '';
  let index = 1;
  let nextName = `${baseName}-${index}${ext}`;
  while (usedNames.indexOf(nextName) > -1) {
    index += 1;
    nextName = `${baseName}-${index}${ext}`;
  }
  return nextName;
};

export const couchAttachmentUrl = (baseUrl: string, dbName: string, docId: string, attachmentName: string): string => {
  const trimmedBaseUrl = baseUrl.replace(/\/+$/, '');
  const trimmedDbName = dbName.replace(/^\/+|\/+$/g, '');
  return `${trimmedBaseUrl}/${trimmedDbName}/${encodeURIComponent(docId)}/${encodeURIComponent(attachmentName)}`;
};

export interface NormalizeImageOptions {
  maxDimension?: number;
  quality?: number;
  usedNames?: string[];
}

export interface NormalizedImage {
  file: File;
  contentType: string;
  fileName: string;
}

export const scaledDimensions = (width: number, height: number, maxDimension: number): { width: number; height: number } => {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
};

const replaceExtension = (name: string, extension: string, usedNames: string[] = []): string => {
  const safeName = safeAttachmentName(name);
  const lastDot = safeName.lastIndexOf('.');
  const baseName = lastDot > 0 ? safeName.slice(0, lastDot) : safeName;
  return safeAttachmentName(`${baseName}.${extension}`, usedNames);
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise(resolve => canvas.toBlob(resolve, type, quality));

interface EncodedImage {
  blob: Blob;
  contentType: string;
  extension: string;
}

const encodedImage = async (canvas: HTMLCanvasElement, quality: number): Promise<EncodedImage | null> => {
  const webp = await canvasToBlob(canvas, 'image/webp', quality);
  if (webp?.type === 'image/webp') {
    return { blob: webp, contentType: 'image/webp', extension: 'webp' };
  }
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality);
  return jpeg?.type === 'image/jpeg' ? { blob: jpeg, contentType: 'image/jpeg', extension: 'jpg' } : null;
};

// Browser-side cover/image normalization: bounds replicated payloads while keeping upload UX permissive.
export const normalizeImage = async (file: File, opts: NormalizeImageOptions = {}): Promise<NormalizedImage> => {
  const maxDimension = opts.maxDimension ?? 600;
  const quality = opts.quality ?? 0.82;
  const fallback = (): NormalizedImage => ({
    file,
    contentType: normalizedContentType(file),
    fileName: safeAttachmentName(file.name, opts.usedNames)
  });
  let objectUrl = '';
  try {
    objectUrl = URL.createObjectURL(file);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) {
      return fallback();
    }
    const dimensions = scaledDimensions(sourceWidth, sourceHeight, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return fallback();
    }
    ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    const encoded = await encodedImage(canvas, quality);
    if (!encoded) {
      return fallback();
    }
    const fileName = replaceExtension(file.name, encoded.extension, opts.usedNames);
    return {
      file: new File([ encoded.blob ], fileName, { type: encoded.contentType, lastModified: file.lastModified }),
      contentType: encoded.contentType,
      fileName
    };
  } catch {
    return fallback();
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
};

// Highly unlikely random numbers will not be unique for practical amount of course steps
export const uniqueId = () => '_' + Math.random().toString(36).substr(2, 9);

export const dedupeShelfReduce = (ids, id) => {
  if (ids.indexOf(id) > -1) {
    return ids;
  }
  return ids.concat(id);
};

export const dedupeObjectArray = (array: any[], fields: string[]) => array.filter((item, index) => {
  return array.findIndex((i: any) => fields.every(field => i[field] === item[field])) === index;
});

export const removeFromArray = (startArray = [], removeArray = []) => {
  return startArray.filter(item => removeArray.indexOf(item) === -1);
};

export const addToArray = (startArray = [], addArray = []) => {
  return startArray.concat(addArray).reduce(dedupeShelfReduce, []);
};

export const findByIdInArray = (array = [], id: string) => array.find(item => item._id === id);

/*
 * styleVariables was previously imported from SCSS files as an ECMA module
 * Angular as of v14 throws an error when trying to do this
 * There might be a way to rework this, but with the low frequency of change
 * working on other priorities for now.
 * See https://github.com/angular/angular-cli/issues/23273
 */

export const styleVariables: any = {
  primary: '#2196f3',
  primaryLighter: '#bbdefb',
  primaryText: 'white',
  accent: '#ffc107',
  accentLighter: '#ffecb3',
  accentText: 'rgba(0, 0, 0, 0.87)',
  grey: '#bdbdbd',
  greyText: 'rgba(0, 0, 0, 0.54)'
};;

export const filterById = (array = [], id: string) => array.filter(item => item._id !== id);

export const isInMap = (tag: string, map: Map<string, boolean>) => map.get(tag);

export const mapToArray = (map: Map<string, boolean>, equalValue?) => {
  const iterable = map.entries();
  const keyToArray = (item, array: string[]) => {
    if (item.done) {
      return array;
    }
    const [ key, val ] = item.value;
    return keyToArray(iterable.next(), !equalValue || val === equalValue ? [ ...array, key ] : array);
  };
  return keyToArray(iterable.next(), []);
};

const twoDigitNumber = (number: number) => `${number.toString().length < 2 ? '0' : ''}${number.toString()}`;

export const addDateAndTime = (date, time) => new Date(date + (Date.parse('1970-01-01T' + time + 'Z') || 0));

export const getClockTime = (time: Date) => `${twoDigitNumber(time.getHours())}:${twoDigitNumber(time.getMinutes())}`;

export const urlToParamObject = (url: string) => url.split(';').reduce((params, fragment) => {
  const [ key, value ] = fragment.split('=');
  if (value) {
    params[key] = value;
  }
  return params;
}, {});

export const toProperCase = (string: string) => `${string.slice(0, 1).toUpperCase()}${string.slice(1)}`;

export const stringToHex = (string: string) => string.split('').map(char => char.charCodeAt(0).toString(16)).join('');

export const hexToString = (string: string) => string.match(/.{1,2}/g).map(hex => String.fromCharCode(parseInt(hex, 16))).join('');

export const ageFromBirthDate = (currentTime: number, birthDate: string) => {
  const now = new Date(currentTime);
  const birth = new Date(birthDate);
  const yearDiff = now.getFullYear() - birth.getFullYear();
  const afterBirthDay = now.getMonth() < birth.getMonth() ?
    false :
    now.getMonth() === birth.getMonth() && now.getDay() < birth.getDay() ?
      false :
      true;
  return yearDiff - (afterBirthDay ? 0 : 1);
};

export const formatStringDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));

export const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const deepEqual = (item1: any, item2: any) => {
  if (typeof item1 !== typeof item2) {
    return false;
  }
  if (item1 instanceof Array) {
    return item1.length === item2.length && item1.every(value1 => item2.find(value2 => deepEqual(value1, value2)) !== undefined);
  }
  if (item1 && item2 && item1 instanceof Object) {
    return Object.keys({ ...item1, ...item2 }).every((key) => deepEqual(item1[key], item2[key])) ;
  }
  return item1 === item2;
};

export const markdownToPlainText = (markdown: any) => {
  if (typeof markdown !== 'string') {
    return markdown;
  }
  const html = document.createElement('div');
  html.innerHTML = converter.makeHtml(markdown);
  return (html.textContent || html.innerText || '').replace(/^\n|\n$/g, '');
};

export const truncateText = (text, length) => {
  if (!text) {
    return '';
  }
  if (text.length > length) {
    return `${text.slice(0, length)}...`;
  }
  return text;
};

const markdownColumnWidth = (value: string) => {
  let width = 0;
  for (const character of value) {
    width = character === '\t' ? width + 4 - (width % 4) : width + 1;
  }
  return width;
};

const markdownTableRowRegex = /^[ \t]*\|[^\n]+\|[ \t]*$/;
const isExcessiveWhitespace = (value: string) => value.length > 8 || (value.match(/\t/g)?.length || 0) > 1;
const collapseWhitespaceRuns = (value: string) =>
  value.replace(/[ \t]+/g, (match) => isExcessiveWhitespace(match) ? '  ' : match);

interface MarkdownFence {
  blockquoteDepth: number;
  indentation: number;
  marker: string;
  length: number;
}

const stripMarkdownBlockquotePrefix = (line: string) => {
  const prefix = line.match(/^(?: {0,3}>[ \t]?)+/)?.[0] || '';
  return {
    blockquoteDepth: (prefix.match(/>/g) || []).length,
    content: line.slice(prefix.length),
    prefix
  };
};

const isClosingMarkdownFence = (line: string, fence: MarkdownFence) => {
  const { blockquoteDepth, content } = stripMarkdownBlockquotePrefix(line);
  const match = content.match(/^([ \t]*)(`+|~+)[ \t]*$/);
  if (blockquoteDepth !== fence.blockquoteDepth ||
      !match || match[2][0] !== fence.marker || match[2].length < fence.length) {
    return false;
  }
  const indentation = markdownColumnWidth(match[1]);
  return fence.indentation <= 3 ? indentation <= 3 : indentation === fence.indentation;
};

const getMarkdownFence = (lines: string[], index: number): MarkdownFence | undefined => {
  const { blockquoteDepth, content } = stripMarkdownBlockquotePrefix(lines[index]);
  const listPrefix = content.match(/^([ \t]{0,3}(?:[-+*]|\d+\.)[ \t]+)/)?.[0] || '';
  const match = content.slice(listPrefix.length).match(/^([ \t]*)(`{3,}|~{3,})(.*)$/);
  if (!match || (match[2][0] === '`' && match[3].includes('`'))) {
    return;
  }
  const fence = {
    blockquoteDepth,
    indentation: markdownColumnWidth(listPrefix) + markdownColumnWidth(match[1]),
    marker: match[2][0],
    length: match[2].length
  };
  for (let lineIndex = index + 1; lineIndex < lines.length; lineIndex += 1) {
    if (isClosingMarkdownFence(lines[lineIndex], fence)) {
      return fence;
    }
  }
};

const normalizeMarkdownLine = (line: string, hasFollowingLine: boolean) => {
  if (line.trim() === '') {
    return '';
  }
  // Preserve ordinary Markdown indentation, but bound legacy alignment whitespace that can block rendering.
  const { content: containerContent, prefix } = stripMarkdownBlockquotePrefix(line);
  const leadingWhitespace = containerContent.match(/^[ \t]*/)?.[0] || '';
  const indentation = markdownColumnWidth(leadingWhitespace);
  const trailingWhitespace = containerContent.match(/[ \t]+$/)?.[0] || '';
  const hasExcessiveIndentation = indentation > 8 || isExcessiveWhitespace(leadingWhitespace);
  const hasExcessiveTrailingWhitespace = isExcessiveWhitespace(trailingWhitespace);
  const contentWithoutIndentation = containerContent.slice(leadingWhitespace.length);
  const isListOrTable = /^(?:[-+*]|\d+\.)[ \t]+|^\|/.test(contentWithoutIndentation);
  const isIndentedCode = /^ {4,8}\S/.test(containerContent) || /^\t[^\t]/.test(containerContent);

  if (isIndentedCode) {
    return hasExcessiveTrailingWhitespace ? line.trimEnd() : line;
  }
  if (isListOrTable) {
    const normalizedListLine =
      `${prefix}${leadingWhitespace}${collapseWhitespaceRuns(contentWithoutIndentation)}`;
    return !hasFollowingLine && hasExcessiveTrailingWhitespace ? normalizedListLine.trimEnd() : normalizedListLine;
  }
  const content = hasExcessiveIndentation ? containerContent.trimStart() : containerContent;
  const normalizedLine = `${prefix}${collapseWhitespaceRuns(content)}`;
  return !hasFollowingLine && hasExcessiveTrailingWhitespace ? normalizedLine.trimEnd() : normalizedLine;
};

export const normalizeMarkdownWhitespace = (content: string) => {
  const lines = String(content ?? '').replace(/\r\n?/g, '\n').split('\n');
  const normalizedLines: string[] = [];
  let fence: MarkdownFence | undefined;
  let blankLineCount = 0;

  lines.forEach((sourceLine, index) => {
    if (fence) {
      normalizedLines.push(sourceLine);
      blankLineCount = 0;
      if (isClosingMarkdownFence(sourceLine, fence)) {
        fence = undefined;
      }
      return;
    }

    const openingFence = getMarkdownFence(lines, index);
    if (openingFence) {
      fence = openingFence;
      normalizedLines.push(sourceLine);
      blankLineCount = 0;
      return;
    }

    const line = normalizeMarkdownLine(sourceLine, index < lines.length - 1);
    if (line === '') {
      blankLineCount += 1;
      if (blankLineCount === 1) {
        normalizedLines.push('');
      }
      return;
    }
    blankLineCount = 0;
    normalizedLines.push(line);

    const isTopLevelListItem = /^ {0,3}(?:[-+*]|\d+\.)[ \t]+(?=\S|$)/.test(line);
    const nextLineIsTableHeader = markdownTableRowRegex.test(lines[index + 1] || '');
    const followingLineIsTableDivider = /^[ \t]*\|[ \t]*:?-{3,}/.test(lines[index + 2] || '');

    // EasyMDE accepts a table directly below a list item, while Showdown needs a blank line.
    if (isTopLevelListItem && nextLineIsTableHeader && followingLineIsTableDivider) {
      normalizedLines.push('');
    }
  });

  return normalizedLines.join('\n').replace(/^\n+|\n+$/g, '');
};

export const markdownImageRegex = /!\[[^\]]*\]\((.*?\.(?:png|jpe?g|gif)(?:\?.*?)?)\)/gi;

// Content must be normalized first so pathological whitespace cannot inflate preview length.
export const getMarkdownPreviewText = (content: string) => {
  const textOnly = (content || '').replace(new RegExp(markdownImageRegex), '');
  return textOnly.replace(/^(#{1,6})\s+(.+)$/gm, '**$2**');
};

export const calculateMdAdjustedLimit = (content, limit) => {
  const hasMdStyles = /#{1,6}\s+.+/g.test(content);
  const hasLists = /^(\*|-|\d+\.)\s+/gm.test(content);
  const hasTables = /^\|(.+)\|/gm.test(content);
  const hasRegularText = /[^\s#|\-*0-9.]/.test(content);

  const scaleFactor = hasLists && !hasRegularText ? 0.2 : hasTables && !hasRegularText ? 0.55 : hasMdStyles ? 0.8 : 1;
  return Math.floor(limit * scaleFactor);
};

export const hasMarkdownImages = (content: string) => new RegExp(markdownImageRegex).test(content || '');

export const doesMarkdownPreviewTruncate = (content: string, limit = 450) => {
  const previewText = getMarkdownPreviewText(normalizeMarkdownWhitespace(content));
  return previewText.length > calculateMdAdjustedLimit(previewText, limit);
};

export const extractMarkdownImageUrls = (content: string) => {
  const matches: string[] = [];
  const regex = new RegExp(markdownImageRegex);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content || '')) !== null) {
    matches.push(match[1]);
  }

  return matches;
};
