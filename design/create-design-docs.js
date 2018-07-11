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
        fs.readFile(filePath, 'utf8', writeDesignDoc(filePath));
      }
    });
  });
};

const readDir = (dirPath, callback) => {
  fs.readdir(basePath + dirPath, callback);
};

const writeDesignDoc = (filePath) => (err, data) => {
  fs.writeFile(filePath + 'on', JSON.stringify({ 'validate_doc_update': data.split(/\r?\n/).join('\n') }), (err) => {
    if (err) {
      console.log(err);
    }
  });
};

readDir('', readDirectories);
