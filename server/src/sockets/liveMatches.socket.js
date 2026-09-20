/**
 * Socket.io handlers for live match updates.
 *
 * Clients subscribe to a single match by id; each match maps to a room named
 * `match:{id}`. Updates are broadcast to that room only, so a subscriber never
 * receives events for other matches.
 * @module sockets/liveMatches
 */

/** Prefix used to build the per-match room name. */
export const MATCH_ROOM_PREFIX = 'match:';

/**
 * Builds the room name for a match.
 * @param {number|string} matchId Match id.
 * @returns {string} Room name (e.g. `match:123`).
 */
export function matchRoom(matchId) {
  return `${MATCH_ROOM_PREFIX}${matchId}`;
}

/**
 * Normalizes a client-provided match id.
 * @param {unknown} matchId Raw id received over the socket.
 * @returns {number|null} Positive integer id, or null when invalid.
 */
function normalizeMatchId(matchId) {
  const id = Number(matchId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Registers the subscription handlers on a Socket.io server.
 * @param {import('socket.io').Server} io Socket.io server.
 * @returns {import('socket.io').Server} The same server, for chaining.
 */
export function registerLiveMatchHandlers(io) {
  io.on('connection', (socket) => {
    /**
     * Joins the socket to a match room.
     * @param {unknown} matchId Match id.
     * @param {Function} [ack] Optional acknowledgement callback.
     * @returns {void}
     */
    socket.on('subscribe:match', (matchId, ack) => {
      const id = normalizeMatchId(matchId);
      if (id === null) {
        if (typeof ack === 'function') ack({ ok: false });
        return;
      }

      const room = matchRoom(id);
      socket.join(room);
      if (typeof ack === 'function') ack({ ok: true, room });
    });

    /**
     * Leaves the match room.
     * @param {unknown} matchId Match id.
     * @param {Function} [ack] Optional acknowledgement callback.
     * @returns {void}
     */
    socket.on('unsubscribe:match', (matchId, ack) => {
      const id = normalizeMatchId(matchId);
      if (id === null) {
        if (typeof ack === 'function') ack({ ok: false });
        return;
      }

      const room = matchRoom(id);
      socket.leave(room);
      if (typeof ack === 'function') ack({ ok: true, room });
    });
  });

  return io;
}

/**
 * Broadcasts a match update to its subscribers.
 * @param {import('socket.io').Server} io Socket.io server.
 * @param {object} match Persisted match row; its `id` selects the room.
 * @returns {void}
 */
export function emitMatchUpdate(io, match) {
  io.to(matchRoom(match.id)).emit('match:update', match);
}

export default registerLiveMatchHandlers;
