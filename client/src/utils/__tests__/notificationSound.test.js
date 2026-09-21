import { describe, it, expect, vi, afterEach } from 'vitest'
import { playNotificationSound } from '../notificationSound.js'

/**
 * The Web Audio API is not implemented in jsdom, so it is stubbed with a fake
 * captured graph. These tests never play real audio.
 */
function createFakeAudioContext() {
  const oscillator = {
    type: '',
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  }
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }
  const context = {
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
    close: vi.fn(),
  }

  return { context, oscillator, gain }
}

describe('playNotificationSound', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('plays a short oscillator tone when the Web Audio API is available', () => {
    const { context, oscillator, gain } = createFakeAudioContext()
    vi.stubGlobal('AudioContext', function FakeAudioContext() {
      return context
    })

    playNotificationSound()

    expect(oscillator.connect).toHaveBeenCalledWith(gain)
    expect(gain.connect).toHaveBeenCalledWith(context.destination)
    expect(oscillator.start).toHaveBeenCalledTimes(1)
    expect(oscillator.stop).toHaveBeenCalledTimes(1)
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledTimes(2)
  })

  it('is a silent no-op when the Web Audio API is missing', () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)

    expect(() => playNotificationSound()).not.toThrow()
  })

  it('swallows errors raised while creating the audio context', () => {
    vi.stubGlobal('AudioContext', function BrokenAudioContext() {
      throw new Error('audio blocked')
    })

    expect(() => playNotificationSound()).not.toThrow()
  })
})
