# Planet Style Guide
## Editor Config
If you have an IDE that supports a `.editorconfig` file, please make sure you take the necessary steps to install those files.  There's moer info on specific IDE installations [here](http://www.editorconfig.org).
## Angular & TypeScript
### Template & Style
If the HTML & CSS are fewer than 12 lines total, please keep the `template` and `style` in the `.component.ts` file.  Otherwise, you should move one or both to separate `.component.html` or `.component.scss` file(s).

If there are more than 12 lines, but the component has little to no TypeScript functionality, then an exception can be made if code reviewers agree to it.

### TSLint
We have a git hook to run TSLint from the Vagrant before pushing code to the repository.  Please install this hook to your local machine by running the following command:
```
npm run install-hooks
```
The only limitation with TSLint currently is that it is not very good at indendtation rules.  Please make sure to comply with 2 space indents and to indent the appropriate number of times.
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
File: resources.review.service.ts
Class name: ResourcesReviewService
```
We suggest only having one sub-feature to keep file and class names from getting too long.
## SCSS Style
### Naming
This is a work in progress.  Please keep names descriptive and concise.  Feature or the role of the class should be a prefix separated with a dash from the rest of the name.
### Reusability
We would like to make our classes reusable across components if possible.  When creating a new class, make sure to consider if this can be used across current or in development components.  If so, please create the class in the `styles.scss` file.
### Test classes
For unit tests it is easier to locate tags with a specific unit test class that has a prefix `km-`.  These __should not be used for any CSS styling__.  By limiting these to unit test use it allows people working on testing to remove unused `km-` classes knowing that they are not affecting the site in any way.
### Variables
Please put variables in the `/src/app/variables.scss`.
## Unit & End-to-end Testing
### Classes
Please use specific test classes to query the HTML elements when testing.  These can be added directly to the HTML template and should have the prefix `km-` to let people working on the SCSS know that this class is for testing only.  By using specific test classes we can ensure consistent testing even as the CSS changes.