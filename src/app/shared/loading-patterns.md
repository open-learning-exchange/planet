# Loading State Patterns

This application uses two primary patterns for handling loading states.

## 1. Page-level Text/Spinner (Initial Load)

This pattern is used when loading the initial data for a route or a major component. It involves a local `isLoading` boolean property on the component and a `PlanetLoadingSpinnerComponent` in the template.

**Usage:**

*   **Component Class:**
    *   Initialize `isLoading = true`.
    *   Set `isLoading = false` once the primary data has loaded (usually in `finalize` of an RxJS pipe).
    *   Can use the `LoadingState` utility helper.

```typescript
// component.ts
isLoading = true;

ngOnInit() {
  this.service.getData().pipe(
    finalize(() => this.isLoading = false)
  ).subscribe(data => {
    // handle data
  });
}
```

*   **Component Template:**
    *   Use `<planet-loading-spinner>` with an optional `*ngIf="isLoading"` or structural directive.

```html
<!-- component.html -->
<planet-loading-spinner *ngIf="isLoading"></planet-loading-spinner>
<div *ngIf="!isLoading">
  <!-- content -->
</div>
```

## 2. Action-level Service (Blocking Actions)

This pattern is used for user-initiated actions that require blocking the UI, such as submitting a form or performing a critical update. It uses the `DialogsLoadingService` to show a modal spinner.

**Usage:**

*   **Service Injection:** Inject `DialogsLoadingService`.
*   **Start:** Call `this.dialogsLoadingService.start()` before the async operation.
*   **Stop:** Call `this.dialogsLoadingService.stop()` in the `finalize()` block of the Observable subscription to ensure it closes even if an error occurs.
*   **Wrap Utility:** Use `this.dialogsLoadingService.wrap(observable$)` to handle start/stop automatically.

```typescript
// component.ts
constructor(private loadingService: DialogsLoadingService) {}

save() {
  this.loadingService.wrap(
    this.service.saveData(this.data)
  ).subscribe(response => {
    // handle success
  });
}
```
