# CLAUDE.md

This file provides guidance for AI assistants working with the Planet Learning codebase.

## Project Overview

Planet Learning is an Angular-based educational platform built by Open Learning Exchange (OLE). It manages courses, resources, assessments, and learner interactions, designed to work both as community servers (local/offline deployments) and nation servers (cloud-based central repositories).

## Tech Stack

- **Frontend:** Angular 15, TypeScript 4.9, Angular Material 15, RxJS
- **Database:** CouchDB (via PouchDB client)
- **Backend Services:** Node.js ChatAPI for AI integration
- **Testing:** Jasmine + Karma (unit), Protractor (e2e)
- **Linting:** ESLint, SASS-lint, HTMLHint

## Essential Commands

```bash
# Development
npm install                    # Install dependencies
npm start                      # Serve on port 3000
ng serve --configuration spa   # Serve with Spanish locale

# Build
npm run build                  # Production build

# Linting
npm run lint                   # ESLint for TypeScript
npm run lint -- --fix          # Auto-fix ESLint issues
npm run sass-lint              # SASS linting
npm run htmlhint               # HTML linting
npm run lint-all               # Run all linters

# Testing
npm run test                   # Unit tests (Karma on localhost:9876)
npm run e2e                    # End-to-end tests
```

## Project Structure

```
src/app/
├── shared/              # Shared services, components, utilities
│   ├── database/        # PouchDB helpers
│   ├── dialogs/         # Reusable dialog components
│   ├── forms/           # Form components & validators
│   └── *.service.ts     # Core services (state, user, sync, etc.)
├── validators/          # Custom form validators
├── courses/             # Feature module: Courses
├── resources/           # Feature module: Resources
├── users/               # Feature module: User management
├── exams/               # Feature module: Assessments
├── teams/               # Feature module: Teams
├── meetups/             # Feature module: Calendar/Meetups
├── chat/                # Feature module: AI Chat
└── [other features]/    # Additional feature modules
```

## Coding Conventions

### Component Naming
- Selector prefix: `planet-` (kebab-case)
- Directive prefix: `planet` (camelCase)
- File pattern: `[feature]-[sub-feature].[type].ts`

### Component Structure
```typescript
@Component({
  selector: 'planet-feature-name',
  templateUrl: './feature-name.component.html',
  styleUrls: ['./feature-name.component.scss']
})
export class FeatureNameComponent implements OnInit, OnDestroy {
  private destroyed$ = new Subject<void>();

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
```

### Observable Cleanup Pattern
Always use `takeUntil` with a destroy Subject for subscriptions:
```typescript
this.someService.getData()
  .pipe(takeUntil(this.destroyed$))
  .subscribe(data => { /* handle */ });
```

### Form Patterns
- Use `UntypedFormBuilder` and `UntypedFormGroup`
- Custom validators in `/validators/custom-validators.ts`
- Async validators in `/validators/validator.service.ts`

### Styling
- SCSS with Angular Material theming
- Global variables in `_variables.scss`
- Responsive breakpoints: `$md`, `$sm`, `$xs`
- Test selectors use `km-` prefix (not for styling)

## Key Services

- **CouchService** - Database abstraction for CouchDB HTTP calls
- **StateService** - Global state management with caching
- **UserService** - Authentication and user profile management
- **SyncService** - Data synchronization between local/parent servers

## Common Patterns

### Dialog Pattern
```typescript
this.dialogsService.openDialog(SomeDialogComponent, {
  data: { /* dialog data */ }
}).afterClosed().subscribe(result => { /* handle */ });
```

### Table/List Pattern
```typescript
dataSource = new MatTableDataSource<Item>();
selection = new SelectionModel<Item>(true, []);
```

### State Service Usage
```typescript
this.stateService.couchDBState$
  .pipe(takeUntil(this.destroyed$))
  .subscribe(state => { /* handle state changes */ });
```

## i18n Guidelines

- Mark translatable strings with `i18n` attribute in templates
- Attribute translations: `i18n-title`, `i18n-placeholder`
- Translation files in `src/i18n/` (XLF format)
- Supported locales: eng, spa, fra, nep, ara, som

## Testing Notes

- Unit test files: `*.spec.ts`
- Test selectors: Elements with `km-` class prefix
- Coverage output: `coverage/` directory
- Run tests before pushing (pre-push hook enforced)

## Database Architecture

CouchDB with multiple databases:
- `courses`, `courses_progress` - Course content and learner progress
- `resources` - Educational content library
- `users` - User profiles and authentication
- `configurations` - System settings
- `ratings`, `submissions` - Learner feedback and assignments

## ChatAPI

Separate Node.js backend in `/chatapi/` for AI integration:
```bash
cd chatapi
npm install
npm run dev    # Runs on port 5000 (Linux) or 5400 (Windows/macOS)
```

## Code Quality Rules

- Max line length: 140 characters
- Single quotes for strings
- 2-space indentation
- No trailing whitespace
- Strict ESLint rules enforced via pre-push hooks
