export const filterSpecificFields = (filterFields: string[]): any => {
  return (data: any, filter: string) => {
    for (let i = 0; i < filterFields.length; i++) {
      if (data[filterFields[i]].toLowerCase().indexOf(filter) > -1) {
        return true;
      }
    }
  };
};

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

const checkFilterItems = (data: any) => ((includeItem: boolean, [ field, val ]) => {
  // If field is an array field, check if one value matches.  If not check if values match exactly.
  const noMatch = data[field] instanceof Array ? data[field].indexOf(val) === -1 : val.toLowerCase() !== data[field].toLowerCase();
  if (val && noMatch) {
    return false;
  }
  return includeItem;
});
