import { FormControl } from '../../../node_modules/@angular/forms';

const dropdownString = (fieldValue: any, value: string) => {
  if (fieldValue === undefined || value === undefined) {
    // If there is no value to filter, include item.  If the data field is undefined, exclude item.
    return value !== undefined;
  }
  return fieldValue instanceof Array ? fieldValue.indexOf(value) === -1 : value.toLowerCase() !== fieldValue.toLowerCase();
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
    for (let i = 0; i < filterFields.length; i++) {
      if (getProperty(data, filterFields[i]).toLowerCase().indexOf(filter.trim().toLowerCase()) > -1) {
        return true;
      }
    }
  };
};

// Takes an object and string of dot seperated property keys.  Returns the nested value of the succession of
// keys or undefined.
function getProperty(data: any, fields: string) {
  const propertyArray = fields.split('.');
  return propertyArray.reduce((obj, prop) => (obj && obj[prop]) ? obj[prop] : undefined, data);
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

export const filterTags = (filterField, filterControl: FormControl) => {
  return (data: any, filter: string) => {
    return filterArrayField(filterField, filterControl.value)(data, filter);
  };
};

export const filterAdvancedSearch = (searchObj: any) => {
  return (data: any, filter: string) => {
    return Object.entries(searchObj).reduce(
      (isMatch, [ field, val ]: any[]) => isMatch && filterArrayField(field, val)(data, filter),
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
      return item[property].toLowerCase();
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
  return filteredData.slice(pageIndex * pageSize, (pageIndex * pageSize) + 5);
};
