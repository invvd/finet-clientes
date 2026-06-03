declare module '@jest/globals' {
  const jest: {
    fn: typeof jest.fn;
    Mock: typeof jest.Mock;
    spyOn: typeof jest.spyOn;
    unstable_mockModule: typeof jest.unstable_mockModule;
  };
  const describe: typeof describe;
  const it: typeof it;
  const test: typeof test;
  const expect: typeof expect;
  const beforeEach: typeof beforeEach;
  const beforeAll: typeof beforeAll;
  const afterEach: typeof afterEach;
  const afterAll: typeof afterAll;
}
