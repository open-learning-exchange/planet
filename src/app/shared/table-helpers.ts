const checkFilterItems = (data: any) => ((includeItem: boolean, [ field, val ]) => {
  // If field is an array field, check if one value matches.  If not check if values match exactly.
  const noMatch = data[field] instanceof Array ? data[field].indexOf(val) === -1 : val.toLowerCase() !== data[field].toLowerCase();
  if (val && noMatch) {
    return false;
  }
  return includeItem;
});

export const filterSpecificFields = (filterFields: string[]): any => {
  return (data: any, filter: string) => {
    let dt = '';
    for (let i = 0; i < filterFields.length; i++) {
      const keys = filterFields[i].split('.');
      dt = testCase(data, keys);
      if (dt.toLowerCase().indexOf(filter.trim().toLowerCase()) > -1) {
        return true;
      }
    }
  };
};

function testCase(data: any, filterFields: string[]) {
  if (filterFields.length > 1 && data[filterFields[0]]) {
      data = data[filterFields[0]];
      filterFields.splice(0, 1);
      return testCase(data, filterFields);
  } else if (data[filterFields[0]]) {
      return data[filterFields[0]];
  }
  return '';
}

export const filterDropdowns = (filterObj: any) => {
  return (data: any, filter: string) => {
    // Object.entries returns an array of each key/value pair as arrays in the form of [ key, value ]
    return Object.entries(filterObj).reduce(checkFilterItems(data), true);
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
