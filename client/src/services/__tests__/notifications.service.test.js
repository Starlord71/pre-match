import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  isSupported,
  permissionState,
  requestPermission,
  notify,
} from '../notifications.service.js'

/**
 * The native Notification API is absent in jsdom, so it is stubbed. These tests
 * never show a real desktop notification.
 * @param {string} permission Initial permission.
 * @returns {object} Fake global plus the captured constructions.
 */
function stubNotification(permission = 'granted') {
  const calls = []
  function FakeNotification(title, options) {
    calls.push({ title, options })
  }
  FakeNotification.permission = permission
  FakeNotification.requestPermission = vi.fn(async () => permission)

  vi.stubGlobal('Notification', FakeNotification)
  return { calls, FakeNotification }
}

const match = {
  id: 7,
  status: 'IN_PLAY',
  homeTeam: { name: 'Home United' },
  awayTeam: { name: 'Away City' },
  fullTimeHome: 2,
  fullTimeAway: 1,
}

describe('notifications.service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects support and reads the current permission', () => {
    stubNotification('granted')

    expect(isSupported()).toBe(true)
    expect(permissionState()).toBe('granted')
  })

  it('is a no-op when the Notification API is unavailable', async () => {
    vi.stubGlobal('Notification', undefined)

    expect(isSupported()).toBe(false)
    expect(permissionState()).toBe('unsupported')
    expect(await requestPermission()).toBe('unsupported')
    expect(() => notify(match)).not.toThrow()
  })

  it('requests permission from a gesture', async () => {
    const { FakeNotification } = stubNotification('default')

    const result = await requestPermission()

    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1)
    expect(result).toBe('default')
  })

  it('builds the notification with a per-match tag when granted', () => {
    const { calls } = stubNotification('granted')

    notify(match)

    expect(calls).toHaveLength(1)
    expect(calls[0].title).toBe('Home United vs Away City')
    expect(calls[0].options).toEqual({ body: '2 - 1 · IN_PLAY', tag: 'match:7' })
  })

  it('does nothing when permission was not granted', () => {
    const { calls } = stubNotification('default')

    notify(match)

    expect(calls).toHaveLength(0)
  })
})
