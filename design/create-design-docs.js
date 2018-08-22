const fs = require('fs');
const mime = require('mime');
const basePath = require('path').basename(__dirname) + '/';

const readDirectories = (err, directories) => {
  directories.forEach((dir) => {
    fs.stat(basePath + dir, (err, stat) => {
      if (stat.isDirectory()) {
        readDir(dir, readFiles(dir));
      }
    });
  });
};

const readFiles = (dirPath) => (err, files) => {
  files.forEach((file) => {
    const filePath = basePath + dirPath + '/' + file;
    fs.stat(filePath, (err, stat) => {
      if (mime.getType(file) === 'application/javascript' && file !== 'create-design-docs.js') {
        writeDesignDoc(require('./' + dirPath + '/' + file), filePath);
      }
    });
  });
};

const readDir = (dirPath, callback) => {
  fs.readdir(basePath + dirPath, callback);
};

const writeDesignDoc = (design, filePath) => {

  fs.writeFile(filePath + 'on', JSON.stringify(recurseObject(design)), (err) => {
    if (err) {
      console.log(err);
    }
  });
};

const recurseObject = (object) => {
  return Object.entries(object).reduce((newObj, [ key, value ]) => {
    switch (typeof value) {
      case 'object':
        newObj[key] = recurseObject(value);
        break;
      case 'function':
        newObj[key] = functionToString(value);
        break;
      default:
        newObj[key] = value;
    }
    return newObj;
  }, {});
};

const functionToString = (func) => func.toString();

readDir('', readDirectories);
