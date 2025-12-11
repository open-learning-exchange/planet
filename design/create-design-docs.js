const fs = require('fs');
const path = require('path');
const basePath = __dirname;

const readDirectories = (err, directories) => {
  directories.forEach((dir) => {
    const dirFullPath = path.join(basePath, dir);
    fs.stat(dirFullPath, (err, stat) => {
      if (stat.isDirectory()) {
        readDir(dir, readFiles(dir));
      }
    });
  });
};

const readFiles = (dirPath) => (err, files) => {
  files.forEach((file) => {
    const filePath = path.join(basePath, dirPath, file);
    fs.stat(filePath, (err, stat) => {
      if (path.extname(file) === '.js' && file !== 'create-design-docs.js') {
        const modulePath = './' + path.join(dirPath, file);
        writeDesignDoc(require(modulePath), filePath);
      }
    });
  });
};

const readDir = (dirPath, callback) => {
  fs.readdir(path.join(basePath, dirPath), callback);
};

const writeDesignDoc = (design, filePath) => {
  fs.writeFile(filePath + 'on', JSON.stringify(recurseObject(design)), (err) => {
    if (err) {
      console.error('Error writing design doc for:', filePath, err);
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
