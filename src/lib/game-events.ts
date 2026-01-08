import { EventEmitter } from "node:events";

// Global event emitter for game state changes
// In production, this could be replaced with Redis pub/sub for multi-server support
export const gameEvents = new EventEmitter();

// Set max listeners higher since each active subscription adds a listener
gameEvents.setMaxListeners(100);

// Event types
export type GameEventType = "session:updated" | "session:deleted";

export interface GameEvent {
  type: GameEventType;
  pin: string;
  timestamp: number;
}

// Helper to emit game session updates
export function emitSessionUpdate(pin: string): void {
  const event: GameEvent = {
    type: "session:updated",
    pin: pin.toUpperCase(),
    timestamp: Date.now(),
  };
  gameEvents.emit(`session:${pin.toUpperCase()}`, event);
}

// Helper to create typed listener
export function onSessionUpdate(
  pin: string,
  callback: (event: GameEvent) => void,
): () => void {
  const channel = `session:${pin.toUpperCase()}`;
  gameEvents.on(channel, callback);
  return () => gameEvents.off(channel, callback);
}
