#!/usr/bin/env node

/**
 * CapFX CLI Entry Point
 * ClipForge vertical video extension package validation, build, and management utility.
 */

import { runCapfxCli } from '../scripts/capfxTool.mjs';

const exitCode = await runCapfxCli(process.argv.slice(2));
process.exit(exitCode);
