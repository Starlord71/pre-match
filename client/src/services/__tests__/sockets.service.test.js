import { describe, it, expect, vi, beforeEach } from 'vitest'

const { ioMock } = vi.hoisted(() => ({ ioMock: vi.fn() }))

vi.mock('socket.io-client', () => ({ io: ioMock }))

const { getSocket, subscribeToMatch, subscribeToMatches, disconnectSocket } = await import(
  '../sockets.service.js'
)

/**
 * socket.io-client is mocked, so no real connection is opened. These tests
 * assert that the service mirrors the server's subscribe/update contract.
 */
describe('sockets.service', () => {
  let fakeSocket

  beforeEach(() => {
    fakeSocket = { emit: vi.fn(), on: vi.fn(), off: vi.fn(), disconnect: vi.fn() }
    ioMock.mockReset()
    ioMock.mockReturnValue(fakeSocket)
    disconnectSocket()
  })

  it('creates a single shared socket', () => {
    const first = getSocket()
    const second = getSocket()

    expect(first).toBe(second)
    expect(ioMock).toHaveBeenCalledTimes(1)
  })

  it('emits subscribe:match and listens for match:update', () => {
    const onUpdate = vi.fn()

    subscribeToMatch(45, onUpdate)

    expect(fakeSocket.emit).toHaveBeenCalledWith('subscribe:match', 45)
    expect(fakeSocket.on).toHaveBeenCalledWith('match:update', onUpdate)
  })

  it('unsubscribes by emitting unsubscribe:match and removing the listener', () => {
    const onUpdate = vi.fn()

    const unsubscribe = subscribeToMatch(45, onUpdate)
    unsubscribe()

    expect(fakeSocket.emit).toHaveBeenCalledWith('unsubscribe:match', 45)
    expect(fakeSocket.off).toHaveBeenCalledWith('match:update', onUpdate)
  })

  it('subscribes to every id with a single match:update listener', () => {
    const onUpdate = vi.fn()

    subscribeToMatches([45, 67], onUpdate)

    expect(fakeSocket.emit).toHaveBeenCalledWith('subscribe:match', 45)
    expect(fakeSocket.emit).toHaveBeenCalledWith('subscribe:match', 67)
    expect(fakeSocket.on).toHaveBeenCalledTimes(1)
    expect(fakeSocket.on).toHaveBeenCalledWith('match:update', onUpdate)
  })

  it('unsubscribes every id and removes the listener on cleanup', () => {
    const onUpdate = vi.fn()

    const unsubscribe = subscribeToMatches([45, 67], onUpdate)
    unsubscribe()

    expect(fakeSocket.emit).toHaveBeenCalledWith('unsubscribe:match', 45)
    expect(fakeSocket.emit).toHaveBeenCalledWith('unsubscribe:match', 67)
    expect(fakeSocket.off).toHaveBeenCalledWith('match:update', onUpdate)
  })

  it('disconnects and resets the shared socket', () => {
    const socket = getSocket()

    disconnectSocket()

    expect(socket.disconnect).toHaveBeenCalledTimes(1)
    getSocket()
    expect(ioMock).toHaveBeenCalledTimes(2)
  })
})
