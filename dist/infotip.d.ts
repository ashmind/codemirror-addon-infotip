declare module "codemirror" {
  type InfotipResult = { data: unknown, range: { from: CodeMirror.Position, to: CodeMirror.Position } };

  interface Editor {
      setOption(key: 'infotip', value: InfotipOptions): void;

      infotipUpdate(arg?: InfotipResult|null): void;
      infotipIsActive(): boolean;
  }

  interface EditorConfiguration {
      infotip?: InfotipOptions;
  }

  interface BaseInfotipOptions {
    delay?: number;
    render?: (parent: HTMLElement, data: any) => void;
  }

  interface AsyncInfotipOptions extends BaseInfotipOptions {
    async: true;
    getInfo: (cm: Editor, position: CodeMirror.Position, update: (args?: InfotipResult|null) => void) => void;
  }

  interface SyncInfotipOptions extends BaseInfotipOptions {
    async: false;
    getInfo: (cm: Editor, position: CodeMirror.Position) => InfotipResult|null|undefined;
  }

  type InfotipOptions = SyncInfotipOptions|AsyncInfotipOptions;
}

// just to make TS happy
export {};