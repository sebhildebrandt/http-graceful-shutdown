// Type definitions for http-graceful-shutdown 2.4
// Project: https://github.com/sebhildebrandt/http-graceful-shutdown
// Definitions by: sebhildebrandt <https://github.com/sebhildebrandt>

/// <reference types="node" />

declare function GracefulShutdown(
  server: any,
  options?: GracefulShutdown.Options
): () => Promise<void>

declare namespace GracefulShutdown {
  interface Options {
    signals?: string;
    timeout?: number;
    development?: boolean;
    forceExit?: boolean;
    preShutdown?: (signal?: string) => Promise<void>;
    onShutdown?: (signal?: string) => Promise<void>;
    finally?: () => void;
  }
}

export = GracefulShutdown;
