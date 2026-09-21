import { io } from 'socket.io-client'
import { API_BASE_URL } from './http.js'

/**
 * Socket.io service.
 *
 * Encapsulates `socket.io-client` so components and hooks never import the
 * library directly. Exposes a single shared connection and per-match
 * subscriptions that mirror the server's `subscribe:match` / `match:update`
 * contract.
 * @module services/sockets.service
 */

let socket = null

/**
 * Returns the shared socket, creating it on first use.
 * @returns {import('socket.io-client').Socket} Connected socket.
 */
export function getSocket() {
  if (!socket) {
    socket = io(API_BASE_URL, { autoConnect: true })
  }
  return socket
}

/**
 * Subscribes to one or more matches and registers a single update listener.
 *
 * The listener is attached once for the whole batch, so every followed match
 * shares it; the returned cleanup leaves each room and removes the listener.
 * @param {Array<number|string>} matchIds Match ids to follow.
 * @param {(match: object) => void} onUpdate Called on every `match:update`.
 * @returns {Function} Unsubscribe function; removes the listener and leaves the rooms.
 */
export function subscribeToMatches(matchIds, onUpdate) {
  const activeSocket = getSocket()
  const ids = matchIds ?? []

  for (const matchId of ids) {
    activeSocket.emit('subscribe:match', matchId)
  }
  activeSocket.on('match:update', onUpdate)

  return () => {
    for (const matchId of ids) {
      activeSocket.emit('unsubscribe:match', matchId)
    }
    activeSocket.off('match:update', onUpdate)
  }
}

/**
 * Subscribes to a single match. Thin wrapper over `subscribeToMatches`.
 * @param {number|string} matchId Match id.
 * @param {(match: object) => void} onUpdate Called on every `match:update`.
 * @returns {Function} Unsubscribe function; removes the listener and leaves the room.
 */
export function subscribeToMatch(matchId, onUpdate) {
  return subscribeToMatches([matchId], onUpdate)
}

/**
 * Closes the shared socket and resets it. Mainly for tests and teardown.
 * @returns {void}
 */
export function disconnectSocket() {
  if (!socket) return
  socket.disconnect()
  socket = null
}
