import { FormControl } from '../../../node_modules/@angular/forms';

const dropdownString = (fieldValue: any, value: string) => {
  return fieldValue instanceof Array ? fieldValue.indexOf(value) === -1 : value.toLowerCase() !== fieldValue.toLowerCase();
};

const dropdownArray = (fieldValue: any, values: string[]) => {
  return values.findIndex(value => !dropdownString(fieldValue, value)) === -1;
};

const checkFilterItems = (data: any) => ((includeItem: boolean, [ field, val ]) => {
  // If field is an array field, check if one value matches.  If not check if values match exactly.
  const noMatch = val instanceof Array ? dropdownArray(data[field], val) : dropdownString(data[field], val);
  if (val && noMatch) {
    return false;
  }
  return includeItem;
});

// Multi level field filter by spliting each field by '.'
export const filterSpecificFields = (filterFields: string[]): any => {
  return (data: any, filter: string) => {
    for (let i = 0; i < filterFields.length; i++) {
      const keys = filterFields[i].split('.');
      if (getProperty(data, keys).toLowerCase().indexOf(filter.trim().toLowerCase()) > -1) {
        return true;
      }
    }
  };
};

// Takes an object and array of property keys.  Returns the nested value of the succession of
// keys or undefined.
function getProperty(data: any, propertyArray: string[]) {
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
      const keys = filterFields[i].split('.');
      return trueIfExists === (getProperty(data, keys) !== undefined);
    }
    return true;
  };
};

const matchAllItems = (filterItems: string[], propItems: string[]) => {
  return filterItems.reduce((isMatch, filter) => isMatch && propItems.indexOf(filter) > -1, true);
};

export const filterArrayField = (filterField: string, filterItems: string[]) => {
  return (data: any, filter: string) => {
    const keys = filterField.split('.');
    return matchAllItems(filterItems, getProperty(data, keys) || []);
  };
};

export const filterTags = (filterField, filterControl: FormControl) => {
  return (data: any, filter: string) => {
    return filterArrayField(filterField, filterControl.value)(data, filter);
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
