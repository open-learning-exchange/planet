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
    return Object.entries(filterObj).reduce((includeItem: boolean, [ field, val ]) => {
      if (val && val.toLowerCase() !== data[field].toLowerCase()) {
        return false;
      }
      return includeItem;
    }, true);
  };
};
