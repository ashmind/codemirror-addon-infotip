import * as CodeMirror from "codemirror";

// Tests that CodeMirror types are extended correctly
const info = { data: 'x', range: { from: CodeMirror.Pos(1, 1), to: CodeMirror.Pos(1, 1) } };

export function testCreate(textarea: HTMLTextAreaElement) {
  CodeMirror.fromTextArea(textarea, {
    infotip: {
      async: true,
      getInfo: (cm, position, update) => {
        update(info);
      }
    }
  });

  CodeMirror.fromTextArea(textarea, {
    infotip: {
      async: false,
      getInfo: (cm, position) => info
    }
  });
}

export function testSetOption(cm: CodeMirror.Editor) {
  cm.setOption('infotip', {
    async: true,
    getInfo: (cm, position, update) => {
      update(info);
    }
  });

  cm.setOption('infotip', {
    async: false,
    getInfo: (cm, position) => info
  });
}

export function testUpdate(cm: CodeMirror.Editor) {
  cm.infotipUpdate(info);
  cm.infotipUpdate(null);
  cm.infotipUpdate();
}

export function testIsActive(cm: CodeMirror.Editor) {
  cm.infotipIsActive() as boolean;
}