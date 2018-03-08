# Planet Style Guide
Below is a brief summary of code standards we'd like to keep with this project.  For the most part this follows the [Angular Style Guide](https://angular.io/guide/styleguide), but in a more concise way so you have a quick to read reference guide.
## Editor Config
If you have an IDE that supports a `.editorconfig` file, please make sure you take the necessary steps to install those files.  There's more info on specific IDE installations [here](http://www.editorconfig.org).

This will help with a few things: maintaining 2 space indentations, ensuring there is a newline at the end of each file, and removing unnecessary whitespace at the end of a line.
## Angular & TypeScript
### Template & Style
If the HTML & CSS are fewer than 12 lines total, please keep the `template` and `style` in the `.component.ts` file.  Otherwise, you should move one or both to separate `.component.html` or `.component.scss` file(s).

If there are more than 12 lines, but the component has little to no TypeScript functionality, then an exception can be made if code reviewers agree to it.

### TSLint
We have a git hook to run TSLint from the Vagrant before pushing code to the repository.  Please install this hook to your local machine by running the following command:
```
npm run install-hooks
```
The only limitation with TSLint currently is that it is not very good at indentation rules.  Please make sure to comply with 2 space indents and to indent the appropriate number of times.
### Naming
We follow the standard Angular naming and would like to stick to simple names for files and classes.  Each name should follow the format:
```
<feature><sub-feature?><type>
```
For files the different parts should be separated with a dash, for class names we should use camel case.  Here are some examples:
#### Courses Component
```
File: courses.component.ts
Class name: CoursesComponent
```
#### Resources Review Service
```
File: resources-review.service.ts
Class name: ResourcesReviewService
```
We suggest using max one sub-feature word to keep file and class names from getting too long.

#### Forbidden Name

Please don't use the following name for variable since it is used by our `entrypoint` script in our production docker container.

|      Name      	|            Note           	|
|:--------------:	|:-------------------------:	|
| planet-db-host 	| used in the docker script 	|
| planet-db-port 	| used in the docker script 	|

### App Directory Structure
Within the `src/app` directory, each feature should have its own directory.  Within that directory as we add sub-features, if there are more than 9 files we should create a sub-directory with the same naming convention as files (i.e. Resources Review would be in a `resources-review` directory).

The `src/app/shared` directory is intended for files which are used across different features.  Rather than creating more directories in the `src/app` directory, we can store these files here to reduce the number of files & directories in the main app directory.
## SCSS Style
### Naming
This is a work in progress.  Please keep names descriptive and concise.  Feature or the role of the class should be a prefix separated with a dash from the rest of the name.
### Reusability
We would like to make our classes reusable across components when possible.  When creating a new class, make sure to consider if this can be used across current or in development components.  If so, please create the class in the `styles.scss` file.

If, in the future, the `styles.scss` file becomes so large it is difficult to manage, we will break it up into different files.
### Test classes
For unit tests it is easier to locate tags with a specific unit test class that has a prefix `km-`.  These __should not be used for any CSS styling__.  By limiting these to unit test use it allows people working on testing to remove unused `km-` classes knowing that they are not affecting the site in any way.
### Variables
Please put variables in the `/src/app/variables.scss`.
## Unit & End-to-end Testing
### Classes
Please use specific test classes to query the HTML elements when testing.  These can be added directly to the HTML template and should have the prefix `km-` to let people working on the SCSS know that this class is for testing only.  By using specific test classes we can ensure consistent testing even as the CSS changes.
