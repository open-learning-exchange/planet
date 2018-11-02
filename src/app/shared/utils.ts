import styleVars from '../_variables.scss';

// Highly unlikely random numbers will not be unique for practical amount of course steps
export const uniqueId = () => '_' + Math.random().toString(36).substr(2, 9);

export const dedupeShelfReduce = (ids, id) => {
    if (ids.indexOf(id) > -1) {
      return ids;
    }
    return ids.concat(id);
  };

export const removeFromArray = (startArray = [], removeArray = []) => {
  return startArray.filter(item => removeArray.indexOf(item) === -1);
};

export const addToArray = (startArray = [], addArray = []) => {
  return startArray.concat(addArray).reduce(dedupeShelfReduce, []);
};

export const findByIdInArray = (array = [], id: string) => array.find(item => item._id === id);

export const styleVariables: any = (() => {
  console.log(styleVars.match(/:export \{([\s\S]*)\}/)[1]);
  const varArray = styleVars.match(/:export \{([\s\S]*)\}/)[1].split(';').filter((val: string) => val.trim());
  return varArray.reduce((styleObj, variable) => {
    const [ prop, value ] = variable.split(': ');
    return { ...styleObj, [prop.trim()]: value };
  }, {});
})();
