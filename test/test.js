const driver = require("./test-driver.js");
jest.useFakeTimers();

test("hover doesn't error if no getInfo is specified", async () => {
  driver.setup({});
  driver.mousemove();

  jest.runAllTimers();
});