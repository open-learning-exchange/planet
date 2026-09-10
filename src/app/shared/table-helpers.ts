import { FormControl, AbstractControl } from '../../../node_modules/@angular/forms';
import { FuzzySearchOptions, fuzzyWordMatch, normalizeSearchString, splitSearchWords } from './fuzzy-search';

// Takes an object and string of dot seperated property keys.  Returns the nested value of the succession of
// keys or undefined.
const getProperty = (data: any, fields: string) => {
  const propertyArray = fields.split('.');
  return propertyArray.reduce((obj, prop) => (obj && obj[prop] !== undefined) ? obj[prop] : undefined, data);
};

const dropdownString = (fieldValue: any, value: string) => {
  if (fieldValue === undefined || value === undefined) {
    // If there is no value to filter, include item.  If the data field is undefined, exclude item.
    return value !== undefined;
  }

  if (fieldValue instanceof Array) {
    return fieldValue.indexOf(value) === -1;
  }

  // Ensure both value and fieldValue are strings before calling toLowerCase
  if (typeof value === 'string' && typeof fieldValue === 'string') {
    return value.toLowerCase() !== fieldValue.toLowerCase();
  }
};

const dropdownArray = (fieldValue: any, values: string[]) => values.findIndex(value => !dropdownString(fieldValue, value)) === -1;

const checkFilterItems = (data: any) => ((includeItem: boolean, [ field, val ]) => {
  const dataField = getProperty(data, field);
  // If field is an array field, check if one value matches.  If not check if values match exactly.
  const noMatch = val instanceof Array ? dropdownArray(dataField, val) : dropdownString(dataField, val);
  if (val && noMatch) {
    return false;
  }
  return includeItem;
});

// Multi level field filter by spliting each field by '.'.  Matches the filter as one exact substring, so
// use it for filtering on a known value.  For anything a user types, use filterSpecificFieldsHybrid.
export const filterSpecificFields = (filterFields: string[]): any => (data: any, filter: string) => {
  const normalizedFilter = normalizeSearchString(filter.trim());
  return filterFields.some(filterField => {
    const fieldValue = getProperty(data, filterField);
    return typeof fieldValue === 'string' && normalizeSearchString(fieldValue).includes(normalizedFilter);
  });
};

// The search filter for anything a user types: every word of the filter must match at least one of the
// fields, exactly or within the fuzziness of fuzzy-search, so typos and word order do not matter.
export const filterSpecificFieldsHybrid = (filterFields: string[], options?: FuzzySearchOptions): any => (
  (data: any, filter: string) => {
    const words = splitSearchWords(filter);
    if (words.length === 0) {
      return true;
    }
    const fieldValues = filterFields
      .map(filterField => getProperty(data, filterField))
      .filter(fieldValue => typeof fieldValue === 'string' && fieldValue !== '');
    return words.every(word => fieldValues.some(fieldValue => fuzzyWordMatch(word, fieldValue, options)));
  }
);

export const filterDropdowns = (filterObj: any) => (data: any, filter: string) =>
// Object.entries returns an array of each key/value pair as arrays in the form of [ key, value ]
  Object.entries(filterObj).reduce(checkFilterItems(data), true);

// Takes array of field names and if trueIfExists is true, return true if field exists
// if false return true if it does not exist
export const filterFieldExists = (filterFields: string[], trueIfExists: boolean): any => (data: any, filter: string) => {
  for (const filterField of filterFields) {
    return trueIfExists === (getProperty(data, filterField) !== undefined);
  }
  return true;
};

const matchAllItems = (filterItems: string[], propItems: string[]) => {
  const propSet = new Set(propItems);
  return filterItems.every(filter => propSet.has(filter));
};

const filterArrayField = (filterField: string, filterItems: string[]) => (data: unknown, _filter: string) => {
  const raw = getProperty(data, filterField);
  const propItems = Array.isArray(raw) ? raw : raw == null ? [] : [String(raw)];

  return matchAllItems(filterItems, propItems);
};

export const filterTags = (filterControl: FormControl) => (data: any, filter: string) => (
  filterArrayField('tags', filterControl.value)({ tags: data.tags.map((tag: any) => tag._id) }, filter)
);

export const filterAdvancedSearch = (searchObj: any) => (data: any, filter: string) => Object.entries(searchObj).reduce(
  (isMatch, [ field, val ]: any[]) => (
    isMatch && (field.indexOf('_') > -1 || field === 'isEmpty' || filterArrayField(field, val)(data.doc, filter))
  ),
  true
);

// filterOnOff must be an object so it references a variable on component & changes with component changes
export const filterShelf = (filterOnOff: { value: 'on' | 'off' }, filterField: string) => (data: any, filter: string) => (
  filterOnOff.value === 'off' || data[filterField] === true
);

// Special filter for showing members that are admins
export const filterAdmin = (data, filter) => data.doc.isUserAdmin && data.doc.roles.length === 0;

// Takes an array of the above filtering functions and returns true if all match
export const composeFilterFunctions = (filterFunctions: any[]) => (
  (data: any, filter: any) => filterFunctions.reduce((isMatch, filterFunction) => isMatch && filterFunction(data, filter), true)
);

export const sortNumberOrString = (item, property) => {
  switch (typeof item[property]) {
    case 'number':
      return item[property];
    case 'string':
      return item[property].trim().toLowerCase();
  }
};

// Returns a space to fill the MatTable filter field so filtering runs for dropdowns when
// search text is deleted, but does not run when there are no active filters.
export const dropdownsFill = (filterObj) => Object.entries(filterObj).reduce((emptySpace, [ field, val ]) => {
  if (val) {
    return ' ';
  }
  return emptySpace;
}, '');

export const createDeleteArray = (array) => array.map((item: any) => ({ _id: item._id, _rev: item._rev, _deleted: true }));

export const commonSortingDataAccessor = (item: any, property: string) => {
  switch (property) {
    case 'rating':
      return item.rating.rateSum / item.rating.totalRating || 0;
    default:
      return item[property] ? sortNumberOrString(item, property) : sortNumberOrString(item.doc, property);
  }
};

export const deepSortingDataAccessor = (item: any, property: string) => {
  const keys = property.split('.');
  const simpleItem = keys.reduce((newItem, key, index) => {
    if (index === keys.length - 1 || newItem[key] === undefined || newItem[key] === null) {
      return newItem;
    }
    return newItem[key];
  }, item);
  return sortNumberOrString(simpleItem, keys[keys.length - 1]);
};

export const trackById = (index, item) => item._id;

export const trackByCategory = (index, item: { category: string }) => item.category;

export const trackByIdVal = (index, item: { id: string }) => item.id;

export const trackByIndex = (index: number) => index;

export const showFormErrors = <T extends { [K in keyof T]: AbstractControl }>(controls: T) => {
  (Object.values(controls) as AbstractControl[]).forEach(control => {
    control.markAsTouched({ onlySelf: true });
  });
};

export const filterIds = (filterObj: { ids: string[] }) => (data: any, filter: string) => (
  filterObj.ids.length > 0 ? filterObj.ids.indexOf(data._id) > -1 : true
);
