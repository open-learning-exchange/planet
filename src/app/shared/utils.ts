export const showdown = require('showdown');
export const pdfMake = require('pdfmake/build/pdfmake');
export const pdfFonts = require('pdfmake/build/vfs_fonts');
export const converter = new showdown.Converter();

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

export const getThemeColor = (variableName: string): string => {
  if (typeof getComputedStyle === 'undefined') {
    return '';
  }
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
};

export const styleVariables: any = {
  get primary() { return getThemeColor('--primary-color') || '#2196f3'; },
  get primaryLighter() { return getThemeColor('--primary-lighter-color') || '#bbdefb'; },
  get primaryText() { return getThemeColor('--primary-text-color') || 'white'; },
  get accent() { return getThemeColor('--accent-color') || '#ffc107'; },
  get accentLighter() { return getThemeColor('--accent-lighter-color') || '#ffecb3'; },
  get accentText() { return getThemeColor('--accent-text-color') || 'rgba(0, 0, 0, 0.87)'; },
  get grey() { return getThemeColor('--grey-color') || '#bdbdbd'; },
  get greyText() { return getThemeColor('--grey-text-color') || 'rgba(0, 0, 0, 0.54)'; },
  get lightGrey() { return getThemeColor('--light-grey-color') || 'whitesmoke'; }
};

export const filterById = (array = [], id: string) => array.filter(item => item._id !== id);

export const itemsShown = (paginator: any) => Math.min(paginator.length - (paginator.pageIndex * paginator.pageSize), paginator.pageSize);

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

export const twoDigitNumber = (number: number) => `${number.toString().length < 2 ? '0' : ''}${number.toString()}`;

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
  if (!text) { return ''; }
  if (text.length > length) {
    return `${text.slice(0, length)}...`;
  }
  return text;
};

export const calculateMdAdjustedLimit = (content, limit) => {
  const hasMdStyles = /#{1,6}\s+.+/g.test(content);
  const hasLists = /^(\*|-|\d+\.)\s+/gm.test(content);
  const hasTables = /^\|(.+)\|/gm.test(content);
  const hasRegularText = /[^\s#|\-*0-9.]/.test(content);

  const scaleFactor = hasLists && !hasRegularText ? 0.2 : hasTables && !hasRegularText ? 0.55 : hasMdStyles ? 0.8 : 1;
  return Math.floor(limit * scaleFactor);
};
