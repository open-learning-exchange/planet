# Codebase Scan and Issue Resolution Plan

Based on the prompt, I have scanned the codebase for visual, functional, or practical issues and generated a plan to fix them. The plan contains actionable steps for each issue, focused on high-level things a real user would notice, including HTML, CSS, or TS.

## Issues Identified & Proposed Fixes

### 1. Refactor `planetChatOutput` Directive Usage
**Issue:** The `planetChatOutput` directive is deprecated in favor of `td-flavored-markdown` for rendering chat messages.
**Files:**
- `src/app/news/news-list-item.component.html`
- `src/app/chat/chat-window/chat-window.component.html`
- `src/app/shared/chat-output.directive.ts`

**Actionable Steps:**
1. In `src/app/news/news-list-item.component.html`, replace the `<p>` elements using `[planetChatOutput]` with `<td-flavored-markdown>` elements. Maintain existing classes (like `conversation-query`, `conversation-error`, `conversation-response`) by wrapping the markdown component or applying classes directly if supported.
2. Apply the exact same replacements in `src/app/chat/chat-window/chat-window.component.html`.
3. Delete the file `src/app/shared/chat-output.directive.ts`.
4. Remove `ChatOutputDirective` from the `declarations` and `exports` arrays in `src/app/shared/shared.module.ts`.

### 2. Remove Inline Styles
**Issue:** Inline `style` attributes are used in various HTML templates, which violates the style guide and makes theming difficult.
**Files:**
- `src/app/dashboard/dashboard.component.html`
- `src/app/surveys/surveys.component.html`
- `src/app/upgrade/upgrade.component.html`
- `src/app/news/news-list-item.component.html`
- `src/app/news/news-list.component.html`
- `src/app/chat/chat-sidebar/chat-sidebar.component.html`

**Actionable Steps:**
1. For each of the files above, identify elements containing `style="..."`.
2. Extract the CSS properties into a new or existing class in the corresponding `.scss` file.
3. Apply the new class to the element and remove the inline `style` attribute.
4. If a component lacks an SCSS file, create one and update the `@Component` decorator in the `.ts` file to include `styleUrls: ['./component-name.scss']`.

### 3. Replace `<mat-spinner>` with `<planet-loading-spinner>`
**Issue:** Standard `<mat-spinner>` is used in some places instead of the consistent `<planet-loading-spinner>`.
**Files:**
- `src/app/shared/dialogs/dialogs-announcement.component.html`
- `src/app/news/news-list.component.html`

**Actionable Steps:**
1. In `src/app/shared/dialogs/dialogs-announcement.component.html`, replace `<mat-spinner></mat-spinner>` with `<planet-loading-spinner text="Loading..." i18n-text></planet-loading-spinner>`.
2. In `src/app/news/news-list.component.html`, replace `<mat-spinner></mat-spinner>` with `<planet-loading-spinner text="Loading news..." i18n-text></planet-loading-spinner>`.
3. Ensure the respective `.ts` files or modules import `PlanetLoadingSpinnerComponent`.

### 4. Fix Fixed Heights and Segmented Progress Bar CSS
**Issue:** Segmented progress bars (`CoursesProgressBarComponent`) require explicit height and width to prevent layout collapse. Also, fixed heights in layouts cause content overflow issues.
**Files:**
- `src/app/courses/progress-courses/courses-progress-bar.component.scss` (needs explicit height/width for empty divs)
- Various SCSS files with `height: Xpx;` (e.g., `src/app/upgrade/upgrade.scss`, `src/app/home/home.scss`)

**Actionable Steps:**
1. In `src/app/courses/progress-courses/courses-progress-bar.component.scss` (create it if missing), ensure the empty `div` elements representing segments have `height: 10px; width: 100%;`.
2. Review files containing `height: [0-9]*px`. Convert fixed heights on layout containers to `min-height` or flexible units to prevent dynamic content overlap.

### 5. Check `@empty` blocks for `@for` loops
**Issue:** Angular `@for` loops are missing `@empty` blocks to provide feedback when no data is available.
**Files:**
- Multiple files in `src/app/` (e.g., `src/app/health/health.component.html`, `src/app/dashboard/dashboard.component.html`, `src/app/courses/progress-courses/courses-progress-chart.component.html`, etc.)

**Actionable Steps:**
1. Find all instances of `@for (` in HTML templates.
2. Add an `@empty { <div class="empty-state">No data available</div> }` block to loops that currently lack one, providing appropriate context-specific text.
