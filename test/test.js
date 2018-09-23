const driver = require("./test-driver.js");
jest.useFakeTimers();

test("hover doesn't error if no getInfo is specified", async () => {
  driver.setup({});
  driver.mousemove();

  jest.runAllTimers();
});

for (const delay of [100, 1000]) {
  test(`hover calls getInfo within specified delay (${delay})`, async () => {
    const getInfo = jest.fn();
    driver.setup({ delay, getInfo });
    driver.mousemove();

    jest.advanceTimersByTime(delay);

    expect(getInfo).toBeCalled();
  });
}

test("hover hides tooltip after 100ms if async", async () => {
  driver.setup({ async: true, getInfo: jest.fn(), delay: 300 });

  driver.show();
  driver.cm.coordsChar.mockReturnValue({ line: 1, ch: 2 });
  driver.mousemove();
  jest.advanceTimersByTime(100);

  expect(Array.from(driver.tooltip.classList))
    .toContain("CodeMirror-infotip-hidden");
});

test("hover hides tooltip if not async and info is null", async () => {
  driver.setup({ getInfo: () => null, delay: 300 });

  driver.show();
  driver.cm.coordsChar.mockReturnValue({ line: 1, ch: 2 });
  driver.mousemove();
  jest.advanceTimersByTime(300);

  expect(Array.from(driver.tooltip.classList))
    .toContain("CodeMirror-infotip-hidden");
});