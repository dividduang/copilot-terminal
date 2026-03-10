#!/usr/bin/env node
/**
 * tmux-shim.js - Fake tmux shim for Copilot Terminal
 *
 * This script masquerades as the real tmux binary. When Claude Code invokes
 * "tmux <args>", this shim intercepts the call, sends an RPC request to the
 * Copilot Terminal main process via named pipe (Windows) or Unix socket,
 * and relays the response back to stdout/stderr with the correct exit code.
 *
 * Required environment variables (injected by ProcessManager):
 *   AUSOME_TMUX_RPC        - Named pipe / Unix socket path for RPC
 *   AUSOME_TERMINAL_WINDOW_ID - Internal window ID
 *   AUSOME_TERMINAL_PANE_ID   - Internal pane ID
 *
 * Optional:
 *   AUSOME_TMUX_DEBUG=1    - Enable debug logging to stderr
 */

'use strict';

const net = require('net');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Debug helper
// ---------------------------------------------------------------------------

const DEBUG = process.env.AUSOME_TMUX_DEBUG === '1';

function debug(msg) {
  if (DEBUG) {
    process.stderr.write(`[tmux-shim] ${msg}\n`);
  }
}

// ---------------------------------------------------------------------------
// Handle special flags that don't need RPC
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);

debug(`argv: ${JSON.stringify(argv)}`);

// "tmux -V" — version query. Return a fake version string immediately.
if (argv.length === 1 && argv[0] === '-V') {
  process.stdout.write('tmux 3.4\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Read environment
// ---------------------------------------------------------------------------

const rpcPath = process.env.AUSOME_TMUX_RPC;
const windowId = process.env.AUSOME_TERMINAL_WINDOW_ID;
const paneId = process.env.AUSOME_TERMINAL_PANE_ID;

if (!rpcPath) {
  process.stderr.write('tmux-shim: AUSOME_TMUX_RPC not set\n');
  process.exit(1);
}

debug(`rpc=${rpcPath} window=${windowId} pane=${paneId}`);

// ---------------------------------------------------------------------------
// Build RPC request
// ---------------------------------------------------------------------------

function generateRequestId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

const request = {
  type: 'request',
  requestId: generateRequestId(),
  request: {
    argv: argv,
    windowId: windowId || undefined,
    paneId: paneId || undefined,
    cwd: process.cwd(),
  },
};

const payload = JSON.stringify(request) + '\n';

debug(`request: ${payload.trim()}`);

// ---------------------------------------------------------------------------
// Send RPC and handle response
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 30000; // 30 seconds

const socket = net.createConnection(rpcPath, () => {
  debug('connected to RPC server');
  socket.write(payload);
});

let responseData = '';

socket.on('data', (chunk) => {
  responseData += chunk.toString();
});

socket.on('end', () => {
  debug(`raw response: ${responseData.trim()}`);

  // Parse the newline-delimited JSON response (take the last non-empty line)
  const lines = responseData.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    process.stderr.write('tmux-shim: empty response from RPC server\n');
    process.exit(1);
  }

  let response;
  try {
    response = JSON.parse(lines[lines.length - 1]);
  } catch (e) {
    process.stderr.write(`tmux-shim: invalid JSON response: ${e.message}\n`);
    debug(`parse error on: ${lines[lines.length - 1]}`);
    process.exit(1);
  }

  // Handle error response
  if (response.error) {
    process.stderr.write(`${response.error}\n`);
    process.exit(1);
  }

  // Handle success response
  if (response.response) {
    const { exitCode, stdout, stderr } = response.response;

    if (stdout) {
      process.stdout.write(stdout);
    }
    if (stderr) {
      process.stderr.write(stderr);
    }

    process.exit(exitCode != null ? exitCode : 0);
  }

  // Unexpected format
  process.stderr.write('tmux-shim: unexpected response format\n');
  debug(`unexpected: ${JSON.stringify(response)}`);
  process.exit(1);
});

socket.on('error', (err) => {
  debug(`socket error: ${err.message}`);
  process.stderr.write(`tmux-shim: cannot connect to RPC server: ${err.message}\n`);
  process.exit(1);
});

// Timeout guard
const timer = setTimeout(() => {
  debug('timeout reached');
  process.stderr.write('tmux-shim: RPC request timed out\n');
  socket.destroy();
  process.exit(1);
}, TIMEOUT_MS);

// Don't let the timer keep the process alive if socket closes first
timer.unref();
