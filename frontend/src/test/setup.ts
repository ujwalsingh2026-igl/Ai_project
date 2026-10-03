import '@testing-library/jest-dom';

// Mock matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock scrollIntoView for jsdom
window.HTMLElement.prototype.scrollIntoView = function() {};

// Mock Web Audio API AudioContext for jsdom
class MockAudioContext {
  currentTime = 0;
  state = 'running';
  resume = () => Promise.resolve();
  close = () => Promise.resolve();
  createOscillator = () => ({
    type: 'sine',
    frequency: { setValueAtTime: () => {} },
    connect: () => {},
    start: () => {},
    stop: () => {},
  });
  createGain = () => ({
    gain: {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    },
    connect: () => {},
  });
  destination = {};
}
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

// Mock URL createObjectURL / revokeObjectURL and alert for jsdom
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = () => 'blob:mock-url';
}
if (!window.URL.revokeObjectURL) {
  window.URL.revokeObjectURL = () => {};
}
window.alert = () => {};
HTMLAnchorElement.prototype.click = function () {};

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: () => Promise.resolve(),
    readText: () => Promise.resolve(''),
  },
});
