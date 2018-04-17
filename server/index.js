const morgan = require("morgan");
const PouchDB = require("pouchdb");

const app = require("express-pouchdb")(PouchDB, {
  overrideMode: {
    include: ["routes/fauxton"]
  }
});

app.use(morgan("dev"));

app.listen(8888);
