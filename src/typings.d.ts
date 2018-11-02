/* SystemJS module definition */
declare var module: NodeModule;
interface NodeModule {
  id: string;
}

declare module '*.scss' {
  const content: string;
  export = content;
}
