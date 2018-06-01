const checkFilterItems = (data: any) => ((includeItem: boolean, [ field, val ]) => {
  // If field is an array field, check if one value matches.  If not check if values match exactly.
  const noMatch = data[field] instanceof Array ? data[field].indexOf(val) === -1 : val.toLowerCase() !== data[field].toLowerCase();
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

// Takes fields and return true if requestId field is present
export const filterFieldExists = (filterFields: string[]): any => {
  return (data: any, filter: string) => {
    for (let i = 0; i < filterFields.length; i++) {
      const keys = filterFields[i].split('.');
      return getProperty(data, keys) !== undefined;
    }
    return true;
  };
};

// Takes fields and return true if requestId field is empty
export const filterFieldNotExists = (filterFields: string[]): any => {
  return (data: any, filter: string) => {
    for (let i = 0; i < filterFields.length; i++) {
      const keys = filterFields[i].split('.');
      return getProperty(data, keys) === undefined;
    }
    return true;
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
