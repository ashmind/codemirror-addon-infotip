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