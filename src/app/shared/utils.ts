// Highly unlikely random numbers will not be unique for practical amount of course steps
export const uniqueId = () => '_' + Math.random().toString(36).substr(2, 9);

export const compareRev = (parent, local) => {
    if (parent === local) {
      return 1;
    }
    local = parseInt(local.split('-')[0], 10);
    parent = parseInt(parent.split('-')[0], 10);
    return (local < parent) ? -1 : (local > parent) ? 2 : 9;
  };

export const dedupeShelfReduce = (ids, id) => {
    if (ids.indexOf(id) > -1) {
      return ids;
    }
    return ids.concat(id);
  };
