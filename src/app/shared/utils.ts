// Highly unlikely random numbers will not be unique for practical amount of course steps
export const uniqueId = () => '_' + Math.random().toString(36).substr(2, 9);

export const dedupeShelfReduce = (ids, id) => {
    if (ids.indexOf(id) > -1) {
      return ids;
    }
    return ids.concat(id);
  }