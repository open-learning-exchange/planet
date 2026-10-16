/* SystemJS module definition */
declare const module: NodeModule;
interface NodeModule {
  id: string;
}

declare module '*.scss' {
  const content: string;
  export = content;
}
