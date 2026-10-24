// PouchDB's browser dependencies expect these Node-style globals.
const browserWindow = window as any;
browserWindow.global ??= browserWindow;
browserWindow.process ??= {};
browserWindow.process.nextTick ??= setTimeout;
