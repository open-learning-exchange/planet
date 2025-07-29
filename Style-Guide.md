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
We have a git hook to run TSLint before pushing code to the repository.  Please install this hook to your local machine by running the following command:
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

### il8n
Planet uses the `il8n` translation module to translate our content and make it accessible. This module can be included in an html tag with the keyword il8n. For example, `<p il8n>Text to be translated</p>`.

If there are no strings enclosed by the tag, or if only interpolation strings are enclosed, then the `il8n` attribute should not be used as it will raise errors during compilation. For example, `<p>{{interpolatedString}}</p>` needs no `il8n` tag.

If text of an attribute needs to be translated an `il8n` translation attribute can be added by including a label with the format `il8n-x` where `x` represents the label that needs to be translated. For example, `<img src="oleImg" il8n-title title="Example image" />`.

For more information, see the docs [here](https://angular.io/guide/i18n).

### App Directory Structure
Within the `src/app` directory, each feature should have its own directory.  Within that directory as we add sub-features, if there are more than 9 files we should create a sub-directory with the same naming convention as files (i.e. Resources Review would be in a `resources-review` directory).

The `src/app/shared` directory is intended for files which are used across different features.  Rather than creating more directories in the `src/app` directory, we can store these files here to reduce the number of files & directories in the main app directory.

### Naming
Component files should be named after their page/feature and follow Angular's standard naming pattern:
```
feature.component.ts      // Component logic
feature.component.html    // Component template
feature.component.scss    // Component styles
```

### Code Comments
We follow a minimalist approach to code comments:

- Keep comments sparse and meaningful
- Only add comments when logic is complex and not immediately obvious from the code itself
- Use clear, descriptive method and variable names instead of comments when possible
- For complex algorithms or business rules that may not be intuitive, include a brief explanation
- Avoid redundant comments

### SCSS Style
For CSS class names, keep them descriptive and concise. Feature or role of the class should be a prefix separated with a dash from the rest of the name.

### Variables
#### Color & Theme Variables
All color variables should be defined in `/src/app/_variables.scss`:
- Use Material's theme system (`$primary`, `$accent`, `$warn`)
- Define semantic variables (e.g., `$light-grey` not `$color-1`)
- Use Material's `mat-color()` function to access theme colors
- Never hardcode color values

#### Screen Size Variables
Default breakpoint variables in `_variables.scss`:
```scss
$screen-md: 1000px;  // Medium screen breakpoint
$screen-sm: 780px;   // Small screen breakpoint
$screen-xs: 480px;   // Extra small screen breakpoint
```

Components can override these for specific needs using the `screen-sizes` mixin:
```scss
@include screen-sizes($screen-md: 1200px, $screen-sm: 780px);
```

### Reusability
We would like to make our classes reusable across components when possible.  When creating a new class, make sure to consider if this can be used across current or in development components.  If so, please create the class in the `styles.scss` file.

If, in the future, the `styles.scss` file becomes so large it is difficult to manage, we will break it up into different files.
### Test classes
For unit tests it is easier to locate tags with a specific unit test class that has a prefix `km-`.  These __should not be used for any CSS styling__.  By limiting these to unit test use it allows people working on testing to remove unused `km-` classes knowing that they are not affecting the site in any way.

### Variables
Please put variables in the `/src/app/_variables.scss`.

## Unit & End-to-end Testing
### Classes
Please use specific test classes to query the HTML elements when testing.  These can be added directly to the HTML template and should have the prefix `km-` to let people working on the SCSS know that this class is for testing only.  By using specific test classes we can ensure consistent testing even as the CSS changes.

## UI Styles
### Color Usage
Use Angular Material's color system with these conventions for buttons:

- Default: Primary color (blue) for standard actions
  - Use `mat-button` or `mat-raised-button color="primary"`
- Accent color (yellow) for attention-drawing actions
  - Use `mat-button` or `mat-raised-button color="accent"`
- Warning color (red) for destructive actions
  - Use `mat-button` or `mat-raised-button color="warn"`
- Grey (default with no color attribute) for secondary actions
  - Use `mat-button` without color attribute
- Disabled state automatically applies grey
  - Use [disabled]= "condition"

Common patterns from our components:
- Dialog submit: `<button [disabled]="!linkForm.valid">`
- Bulk actions: `<button [disabled]="!selection.selected.length">`
- Clear filters: `<button [disabled]="courses.filter.trim() === '' && tagFilter.value.length === 0">`
- Step progression: `<button [disabled]="stepNum > 0 && !step.isPreviousTestTaken">`

### Toolbars
When designing component toolbars, follow these patterns:

- Primary (first) toolbar:
  - Use filter lists and search inputs directly in the toolbar
  - White background (default mat-toolbar)
- Secondary toolbars:
  - Use kebab menu (three vertical dots) to contain actions on tablet and mobile views
  - Primary color background with white text (`primary-color` class)
  - Use white icons and text for buttons (`mat-icon`, `font-size-1` classes)

### Loading Indicators
For consistent loading states across the application, follow these standards:

- For page-level or component-level loading:
  - Use simple text indicators with "Loading [resource]..." format
  - Example: `<span i18n>Loading courses...</span>`
  - Always include an `*ngIf="isLoading"` condition with an `else` template for loaded content

- For action-based loading (form submissions, data operations):
  - Use `DialogsLoadingService` to show a loading wheel
  - Start loading with `dialogsLoadingService.start()`
  - Stop loading with `dialogsLoadingService.stop()` in both success and error cases
  - Always use within a `finalize()` operator in RxJS pipes to ensure loading stops

- Loading state variables:
  - Initialize as `isLoading = true` when data fetching begins
  - Set to `false` when data loading completes

### Icons
When using icons in the application, follow these guidelines:

- Use Material icons (`mat-icon`) whenever possible
- Prefer opaque icons over transparent ones for better visibility
- Keep icon sizes consistent within similar UI elements
- Use icon colors that maintain sufficient contrast with the background
- For custom icons, ensure they match Material Design style guidelines

### Dialog Button Standards
When creating dialog boxes, follow these button placement rules:

- Primary action buttons (right side):
  - Submit/OK button should be rightmost
  - Use mat-raised-button with primary color
- Secondary action buttons (left side):
  - Cancel button should be immediately left of primary action
  - Additional actions (if any) go to left of Cancel
  - Use mat-button without color
- Labels:
  - Use "Cancel" and "Submit" for form dialogs
  - Use "Close" and "OK" for confirmation dialogs

### Text Capitalization
For consistency in our UI text, follow these capitalization and punctuation rules:

- Buttons, Headers, and Titles: 
  - Use Title Case (Capitalize Each Word)
  - Do not use periods
  - Example: "Submit Request", "User Profile", "Course Management"
- Messages and regular content: 
  - Use Sentence case (Only first letter capitalized)
  - Include periods at the end of complete sentences
  - Example: "Your request has been submitted.", "Please enter valid credentials."
  - Exception: Short status, placeholder, or label text doesn't need periods ("No results found", "Required field")

### Text Truncation
To maintain clean UI layouts and improve readability, follow these guidelines for truncating text:

- Use `TruncateTextPipe` in templates to truncate text dynamically.
- Use the `truncateText` utility function in TypeScript for programmatic truncation.
- Avoid hardcoded or redundant truncation logic.

### Form Fields and Error Messages
For consistency in forms across the application, follow these standards:

- Form Field Labels:
  - Use Title Case for field labels
  - Do not use colons after labels
- Placeholder Text:
  - Use Sentence case
  - Be concise and descriptive
- Error Messages:
  - Use Sentence case
  - End with a period
  - Be specific about the error

### Form Validation Patterns
For form validation, refer to these standard validator implementations:

- Built-in validators: Angular's `Validators` class
- Custom validators: Found in `/src/app/validators/custom-validators.ts`
  - Common use cases: time, date, password matching, link validation
- Async validators: Found in `/src/app/validators/validator.service.ts`
  - Common use cases: unique field checking, password verification
