jest.mock("codemirror");
require("../dist/infotip.js");

const CodeMirror = require("codemirror");
const cm = {
  getWrapperElement: jest.fn(() => ({})),
  coordsChar: jest.fn(() => ({})),
  cursorCoords: jest.fn(() => ({})),
  getHelper: jest.fn(),
  state: {}
};

const setup = CodeMirror.defineOption.mock.calls[0][2];
const update = CodeMirror.defineExtension.mock.calls.find(c => c[0] === "infotipUpdate")[1];
const handler = name => CodeMirror.on.mock.calls.find(c => c[1] === name)[2];
const handlerThis = { CodeMirror: cm };

function show() {
  update.call(cm, {
    range: {
      from: { line: -1, ch: 1 },
      to: { line: -1, ch: 1 }
    }
  });
}

function getTooltip() {
  const tooltip = document.querySelector(".CodeMirror-infotip");
  if (!tooltip)
    throw new Error("You must call show() at least once before getting the tooltip.");
  return tooltip;
}

module.exports = {
  cm,
  update: info => update.call(cm, info),
  setup: options => setup(cm, options),
  mousemove: e => handler("mousemove").call(handlerThis, e || {}),

  show,
  get tooltip() { return getTooltip(); }
};