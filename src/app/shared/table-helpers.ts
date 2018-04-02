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

export const filterDropdownsAndSpecificFields = (filterObj: any, filterFields: string[]) => {
  return (data: any, filter: string) => {
    return filterDropdowns(filterObj)(data, filter) && filterSpecificFields(filterFields)(data, filter.trim());
  };
};

const checkFilterItems = (data: any) => ((includeItem: boolean, [ field, val ]) => {
  if (val && val.toLowerCase() !== data[field].toLowerCase()) {
    return false;
  }
  return includeItem;
});
