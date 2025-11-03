import { FormControl, AbstractControl } from '@angular/forms';
import { FuzzySearchService } from './fuzzy-search.service';

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

const dropdownArray = (fieldValue: any, values: string[]) => {
  return values.findIndex(value => !dropdownString(fieldValue, value)) === -1;
};

const checkFilterItems = (data: any) => ((includeItem: boolean, [ field, val ]) => {
  const dataField = getProperty(data, field);
  // If field is an array field, check if one value matches.  If not check if values match exactly.
  const noMatch = val instanceof Array ? dropdownArray(dataField, val) : dropdownString(dataField, val);
  if (val && noMatch) {
    return false;
  }
  return includeItem;
});

// Multi level field filter by spliting each field by '.'
export const filterSpecificFields = (filterFields: string[]): any => {
  return (data: any, filter: string) => {
    const normalizedFilter = filter.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (let i = 0; i < filterFields.length; i++) {
      const fieldValue = getProperty(data, filterFields[i]);
      if (typeof fieldValue === 'string' &&
          fieldValue.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(normalizedFilter) > -1) {
        return true;
      }
    }
    return false;
  };
};

export const filterSpecificFieldsByWord = (filterFields: string[]): any => {
  return (data: any, filter: string) => {
    // Normalize each word
    const words = filter.split(' ').map(value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    return words.every(word => {
      return filterFields.some(field => {
        const fieldValue = getProperty(data, field);
        return typeof fieldValue === 'string' &&
               fieldValue.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(word);
      });
    });
  };
};

// Enhanced version that combines exact and fuzzy search
export const filterSpecificFieldsHybrid = (filterFields: string[], fuzzySearchService?: FuzzySearchService): any => {
  return (data: any, filter: string) => {
    const normalizedFilter = filter.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!normalizedFilter) { return true; }

    return filterFields.some(field => {
      const fieldValue = getProperty(data, field);
      if (typeof fieldValue !== 'string') { return false; }

      // Try exact match first, then fuzzy if available
      const normalizedFieldValue = fieldValue.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalizedFieldValue.includes(normalizedFilter) ||
             (fuzzySearchService?.fuzzyWordMatch(filter, fieldValue, { threshold: 0.6, maxDistance: 2 }) ?? false);
    });
  };
};

// Takes an object and string of dot seperated property keys.  Returns the nested value of the succession of
// keys or undefined.
function getProperty(data: any, fields: string) {
  const propertyArray = fields.split('.');
  return propertyArray.reduce((obj, prop) => (obj && obj[prop] !== undefined) ? obj[prop] : undefined, data);
}

export const filterDropdowns = (filterObj: any) => {
  return (data: any, filter: string) => {
    // Object.entries returns an array of each key/value pair as arrays in the form of [ key, value ]
    return Object.entries(filterObj).reduce(checkFilterItems(data), true);
  };
};

// Takes array of field names and if trueIfExists is true, return true if field exists
// if false return true if it does not exist
export const filterFieldExists = (filterFields: string[], trueIfExists: boolean): any => {
  return (data: any, filter: string) => {
    for (let i = 0; i < filterFields.length; i++) {
      return trueIfExists === (getProperty(data, filterFields[i]) !== undefined);
    }
    return true;
  };
};

const matchAllItems = (filterItems: string[], propItems: string[]) => {
  return filterItems.reduce((isMatch, filter) => isMatch && propItems.indexOf(filter) > -1, true);
};

export const filterArrayField = (filterField: string, filterItems: string[]) => {
  return (data: any, filter: string) => {
    return matchAllItems(filterItems, getProperty(data, filterField) || []);
  };
};

export const filterTags = (filterControl: FormControl) => {
  return (data: any, filter: string) => {
    return filterArrayField('tags', filterControl.value)({ tags: data.tags.map((tag: any) => tag._id) }, filter);
  };
};

export const filterAdvancedSearch = (searchObj: any) => {
  return (data: any, filter: string) => {
    return Object.entries(searchObj).reduce(
      (isMatch, [ field, val ]: any[]) => isMatch && (field.indexOf('_') > -1 || filterArrayField(field, val)(data.doc, filter)),
      true
    );
  };
};

// filterOnOff must be an object so it references a variable on component & changes with component changes
export const filterShelf = (filterOnOff: { value: 'on' | 'off' }, filterField: string) => {
  return (data: any, filter: string) => {
    return filterOnOff.value === 'off' || data[filterField] === true;
  };
};

// Special filter for showing members that are admins
export const filterAdmin = (data, filter) => data.doc.isUserAdmin && data.doc.roles.length === 0;

// Takes an array of the above filtering functions and returns true if all match
export const composeFilterFunctions = (filterFunctions: any[]) => {
  return (data: any, filter: any) => {
    return filterFunctions.reduce((isMatch, filterFunction) => {
      return isMatch && filterFunction(data, filter);
    }, true);
  };
};

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

export const filteredItemsInPage = (filteredData: any[], pageIndex: number, pageSize: number) => {
  return pageIndex === undefined ? filteredData : filteredData.slice(pageIndex * pageSize, (pageIndex * pageSize) + pageSize);
};

export const selectedOutOfFilter = (filteredData: any[], selection: any, paginator: any = {}) => {
  const itemsInPage = filteredItemsInPage(filteredData, paginator.pageIndex, paginator.pageSize);
  return selection.selected.filter((selectedId) => itemsInPage.find((filtered: any) => filtered._id === selectedId ) === undefined);
};

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

export const showFormErrors = (
  controls: { [key: string]: AbstractControl } | AbstractControl[]
) => {
  const controlList = Array.isArray(controls) ? controls : Object.values(controls);
  controlList.forEach(control => {
    control.markAsTouched({ onlySelf: true });
  });
};

export const filterIds = (filterObj: { ids: string[] }) => {
  return (data: any, filter: string) => {
    return filterObj.ids.length > 0 ? filterObj.ids.indexOf(data._id) > -1 : true;
  };
};
