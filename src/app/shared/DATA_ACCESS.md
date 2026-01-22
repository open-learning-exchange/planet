# Data Access Service

The `DataAccessService` provides a centralized and standardized way to access and modify common data entities like User Data, Configuration, and Shelf Data. It encapsulates `UserService` and `StateService` calls, adding consistent loading state management (via `DialogsLoadingService`) and error handling.

## Usage

Inject `DataAccessService` into your component or service:

```typescript
import { DataAccessService } from '../shared/data-access.service';

constructor(private dataAccessService: DataAccessService) {}
```

## Methods

### Synchronous Helpers

*   `getUserData()`: Returns the current user object (synchronous).
*   `getConfiguration()`: Returns the current planet configuration object (synchronous).
*   `getShelfData()`: Returns the current user's shelf object (synchronous).
*   `getShelfObservable()`: Returns an observable that emits when the shelf changes.

### Async Operations (with Loading Spinner)

These methods automatically start the loading spinner when called and stop it when the operation completes or fails.

*   `fetchShelfData(userId?: string)`: Fetches the shelf document for a user. If `userId` is not provided, it fetches for the current user.
*   `saveShelfData(ids: string[], shelfName: string)`: Updates a specific list in the user's shelf (e.g., `courseIds`, `meetupIds`).
    *   `ids`: The new list of IDs.
    *   `shelfName`: The key in the shelf object to update.
*   `changeShelfData(ids: string[], shelfName: string, type: string)`: Adds or removes items from a shelf list.
    *   `type`: 'add' or 'remove'.
*   `initShelf(username: string)`: Initializes an empty shelf for a new user.
*   `deleteShelf(userId: string, rev: string)`: Deletes a user's shelf.

## Migration Guide

When refactoring code:
*   Replace `this.couchService.get('shelf/' + ...)` with `this.dataAccessService.fetchShelfData(...)`.
*   Replace `this.userService.updateShelf(...)` with `this.dataAccessService.saveShelfData(...)`.
*   Replace `this.userService.changeShelf(...)` with `this.dataAccessService.changeShelfData(...)`.
*   Replace `this.couchService.delete('shelf/' + ...)` with `this.dataAccessService.deleteShelf(...)`.
*   Replace `this.couchService.put('shelf/' + ...)` (for initialization) with `this.dataAccessService.initShelf(...)`.
