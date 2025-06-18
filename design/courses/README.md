# Design Documents

Read about Design Document from CouchDB's documentation [here](http://docs.couchdb.org/en/2.1.0/ddocs/ddocs.html).

## How to create View Functions

1. Create a `.js` file to make it easier to write your function.
2. Write an anonymous function for your view function in your `.js` file.
3. Go to [Project Fauxton](http://localhost:2200/_utils/) on `http://localhost:2200/_utils/` and select the database you want to add the function.
<img width="1440" alt="image" src="https://user-images.githubusercontent.com/6295956/31312817-1d925996-ab94-11e7-8074-d6eada02a7aa.png">
4. Create a New View for your function.
<img width="1440" alt="image" src="https://user-images.githubusercontent.com/6295956/31312863-bab4e4a4-ab95-11e7-9296-a2d7e5bf34b6.png">
5. Paste your function and create it.
<img width="1439" alt="image" src="https://user-images.githubusercontent.com/6295956/31312874-08f06aee-ab96-11e7-9824-4c25ff4bd098.png">
6. Go to all documents and double click on the document you just created. Then copy only the function you created and ignore rest of the fields.
<img width="1439" alt="image" src="https://user-images.githubusercontent.com/6295956/31312899-c2d7ea86-ab96-11e7-9d84-b79a54effc83.png">
7. Create a `.json` file and write a proper view function that you will add to the database.
8. Add your `.json` using the `upsert_design` function in the `couchdb-setup.sh` file and run the script to add it to CouchDB.


You can view a sample validate document function [here](https://github.com/ole-vi/planet/blob/courses-component/design/courses/course-validators.js), its json file [here](https://github.com/ole-vi/planet/blob/courses-component/design/courses/course-validators.json) and docker file [here](https://github.com/ole-vi/planet/blob/998fff9b295bdf1e5a732b3ba50907cba6f4a9cd/docker/db-init/docker-entrypoint.sh#L27).
