# Lazy Loading Guide

This guide describes the lazy loading pattern used in the application to optimize bundle size and load times.

## 1. Creating a Lazy Loaded Module

To create a lazy loaded module, follow these steps:

1.  **Create the Module**: Create a new module (e.g., `FeatureModule`) that defines the feature.
2.  **Create Routing Module**: Create a routing module (e.g., `FeatureRouterModule`) with `RouterModule.forChild(routes)`.
3.  **Lazy Load in Parent**: In the parent routing module (e.g., `HomeRouterModule`), use `loadChildren` to import the module.

```typescript
// parent-router.module.ts
{
  path: 'feature',
  loadChildren: () => import('./feature/feature.module').then(m => m.FeatureModule)
}
```

## 2. Handling Shared Components (Crucial)

To ensure the module is truly lazy loaded and not bundled into the main or parent chunk, you must avoid eager imports.

-   **Problem**: If `FeatureModule` imports a module that is also imported by the parent (e.g., `HomeModule`), and that shared module imports `FeatureModule` (directly or indirectly), you get a circular dependency or eager loading.
-   **Solution**: If other modules need components from your `FeatureModule`, create a **Shared Module** (e.g., `FeatureSharedModule`).
    -   Move shared components/pipes/directives to `FeatureSharedModule`.
    -   Import `FeatureSharedModule` in `FeatureModule`.
    -   Import `FeatureSharedModule` in other modules that need these components (e.g., Dialogs, other features).
    -   **Do NOT** import `FeatureModule` (the one with routing) in any other module. Only `loadChildren` should refer to it.

### Example: Resources Module Refactoring

We split `ResourcesModule` into `ResourcesModule` (Lazy) and `ResourcesSharedModule` (Shared).

-   `ResourcesSharedModule`: Exports `ResourcesViewerComponent`, `ResourcesAddComponent`, etc.
-   `ResourcesModule`: Imports `ResourcesSharedModule`, defines routes.
-   `DialogsAddResourcesModule`: Imports `ResourcesSharedModule` (instead of `ResourcesModule`).

## 3. Preloading Strategy

For commonly accessed features, we use a custom preloading strategy `SelectedPreloadingStrategy`.

To enable preloading for a lazy route, add `data: { preload: true }`.

```typescript
// home-router.module.ts
{
  path: 'courses',
  loadChildren: () => import('../courses/courses.module').then(m => m.CoursesModule),
  data: { preload: true }
}
```

This ensures that the module is downloaded in the background after the main app loads, improving navigation speed without blocking initial load.
