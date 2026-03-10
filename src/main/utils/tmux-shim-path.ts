/**
 * tmux-shim-path.ts - Resolve the fake tmux shim directory
 *
 * Returns the absolute path to the directory containing the tmux shim scripts.
 * This path is prepended to PATH when spawning PTY processes with tmux compat enabled.
 *
 * - Development: <project-root>/resources/bin
 * - Production:  <app.asar.unpacked>/resources/bin
 */

import * as path from 'path';
import { app } from 'electron';

/**
 * Get the absolute path to the tmux shim bin directory.
 */
export function getTmuxShimDir(): string {
  if (process.env.NODE_ENV === 'development') {
    // In dev, resources/bin is at the project root
    return path.join(app.getAppPath(), 'resources', 'bin');
  }

  // In production, asar-unpacked resources are at:
  //   <install>/resources/app.asar.unpacked/resources/bin
  const appPath = app.getAppPath(); // e.g. .../app.asar
  const unpackedPath = appPath.replace(/app\.asar$/, 'app.asar.unpacked');
  return path.join(unpackedPath, 'resources', 'bin');
}
