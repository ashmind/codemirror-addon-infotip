jest.mock("codemirror");
require("../dist/infotip.js");

const CodeMirror = require("codemirror");
const cm = {
  getWrapperElement: jest.fn(() => ({})),
  coordsChar: jest.fn(() => ({})),
  getHelper: jest.fn(),
  state: {}
};

const setup = CodeMirror.defineOption.mock.calls[0][2];
const handler = name => CodeMirror.on.mock.calls.find(c => c[1] === name)[2];
const handlerThis = { CodeMirror: cm };

module.exports = {
  cm,
  setup: options => setup(cm, options),
  mousemove: e => handler("mousemove").call(handlerThis, e || {})
};