/**
 * Audio Alert Utility for WorkShetu
 * Uses Web Audio API to generate reliable, high-quality audio notifications
 * without external audio asset dependencies.
 */

let audioCtx = null;
let repeatingInterval = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a pleasant modern 3-tone notification chime (C5 -> E5 -> G5)
 */
export function playBookingAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [
      { freq: 523.25, time: 0.0, duration: 0.18 }, // C5
      { freq: 659.25, time: 0.15, duration: 0.20 }, // E5
      { freq: 783.99, time: 0.32, duration: 0.35 }, // G5
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      // Smooth attack and exponential decay
      gain.gain.setValueAtTime(0.001, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + duration);
    });
  } catch (err) {
    console.warn("Could not play audio alert:", err);
  }
}

/**
 * Starts a repeating audible chime loop for active pending booking alerts
 * @param {number} intervalMs - interval between chimes (default 10 seconds)
 */
export function startRepeatingAlert(intervalMs = 10000) {
  if (repeatingInterval) return;
  playBookingAlertSound();
  repeatingInterval = setInterval(() => {
    playBookingAlertSound();
  }, intervalMs);
}

/**
 * Stops any repeating audible alerts
 */
export function stopRepeatingAlert() {
  if (repeatingInterval) {
    clearInterval(repeatingInterval);
    repeatingInterval = null;
  }
}

