const morgan = require("morgan");
const PouchDB = require("pouchdb");

const app = require("express-pouchdb")(PouchDB, {
  overrideMode: {
    include: ["routes/fauxton"]
  }
});

app.couchConfig.set("httpd", "enable_cors", true, function() {});

app.use(morgan("dev"));

app.listen(8888);
