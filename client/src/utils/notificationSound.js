/**
 * Short notification beep generated with the Web Audio API.
 *
 * Using an oscillator instead of an embedded audio file avoids a binary asset
 * and its licensing. Following a match always implies a prior click, which is
 * the user gesture most browsers require to allow audio, so no permission is
 * needed. When the API is missing or blocked this is a silent no-op.
 * @module utils/notificationSound
 */

/** Beep duration in seconds. */
const DURATION_SECONDS = 0.2

/** Oscillator frequency in hertz. */
const FREQUENCY_HZ = 880

/**
 * Plays a short beep, best-effort.
 * @returns {void}
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return

  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
  if (!AudioContextClass) return

  try {
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = FREQUENCY_HZ
    oscillator.connect(gain)
    gain.connect(context.destination)

    const now = context.currentTime
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + DURATION_SECONDS)

    oscillator.start(now)
    oscillator.stop(now + DURATION_SECONDS)
    oscillator.onended = () => {
      try {
        context.close()
      } catch {
        // Nothing to do if the context is already gone.
      }
    }
  } catch {
    // Audio can be blocked or unavailable; never let it break the update flow.
  }
}

export default playNotificationSound
