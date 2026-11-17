const hasLiveParam = new URLSearchParams(window.location.search).has("live");

export const DEMO_MODE =
  localStorage.getItem("LIVE_MODE") !== "true" &&
  !hasLiveParam;

// Automatically enable live mode if ?live is in URL
if (hasLiveParam && localStorage.getItem("LIVE_MODE") !== "true") {
  localStorage.setItem("LIVE_MODE", "true");
}

export const toggleLiveMode = () => {
  if (localStorage.getItem("LIVE_MODE") === "true") {
    localStorage.removeItem("LIVE_MODE");
  } else {
    localStorage.setItem("LIVE_MODE", "true");
  }
  window.location.reload();
};

// Tap detection logic
let tapCount = 0;
let tapTimer: any;

export const handleSecretTap = () => {
  tapCount++;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => {
    tapCount = 0;
  }, 1500);

  if (tapCount >= 5) {
    toggleLiveMode();
  }
};

// Keyboard shortcut handler
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      toggleLiveMode();
    }
  });
}
