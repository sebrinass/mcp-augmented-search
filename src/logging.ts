import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { LoggingLevel } from "@modelcontextprotocol/sdk/types.js";

// Logging state
let currentLogLevel: LoggingLevel = "info";

// Logging helper function
export function logMessage(server: Server, level: LoggingLevel, message: string, data?: unknown): void {
  if (shouldLog(level)) {
    try {
      // Merge message and data together for the notification body
      const notificationData = data !== undefined
        ? (typeof data === 'object' && data !== null ? { message, ...data } : { message, data })
        : { message };

      // Always output to console for Docker container logging
      const timestamp = new Date().toISOString();
      const logPrefixMap: { [key in LoggingLevel]?: string } = {
        debug: '🔍',
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌'
      };
      const logPrefix = logPrefixMap[level] || '📝';

      if (data) {
        console.log(`${timestamp} ${logPrefix} [${level.toUpperCase()}] ${message}`, JSON.stringify(data, null, 2));
      } else {
        console.log(`${timestamp} ${logPrefix} [${level.toUpperCase()}] ${message}`);
      }

      // Also send via MCP protocol for client-side logging
      server.notification({
        method: "notifications/message",
        params: {
          level,
          data: notificationData
        }
      }).catch((error) => {
        // Silently ignore "Not connected" errors during server startup
        // This can happen when logging occurs before the transport is fully connected
        if (error instanceof Error && error.message !== "Not connected") {
          console.error("Logging error:", error);
        }
      });
    } catch (error) {
      // Handle synchronous errors as well
      if (error instanceof Error && error.message !== "Not connected") {
        console.error("Logging error:", error);
      }
    }
  }
}

export function shouldLog(level: LoggingLevel): boolean {
  const levels: LoggingLevel[] = ["debug", "info", "warning", "error"];
  return levels.indexOf(level) >= levels.indexOf(currentLogLevel);
}

export function setLogLevel(level: LoggingLevel): void {
  currentLogLevel = level;
}

export function getCurrentLogLevel(): LoggingLevel {
  return currentLogLevel;
}
