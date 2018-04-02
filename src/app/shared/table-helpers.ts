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

export const filterDropdownWithSpecificFields = (obj: any) => {
  return (data: any, filter: string) => {
    if (data[ Object.keys(obj) [ 0 ] ].toLowerCase().indexOf(filter) > -1) {
      return Object.entries(obj).reduce(check(data), true);
    }
    return Object.entries(obj).reduce(checkFilterItems(data), true);
  };
};

const checkFilterItems = (data: any) => ((includeItem: boolean, [ field, val ]) => {
  if (val && val.toLowerCase() !== data[field].toLowerCase()) {
    return false;
  }
  return includeItem;
});

const check = (data: any) => ((includeItem: boolean, [ field, val ]) => {
  if (val.charAt(0) && val.toLowerCase().charAt(0) !== data[field].toLowerCase().charAt(0)) {
    return false;
  }
  return includeItem;
});
