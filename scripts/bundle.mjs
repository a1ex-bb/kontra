#!/usr/bin/env node
// Build kontra.mcpb, the one-click bundle for Claude Desktop.
//
// We stage into a temp directory and install production dependencies only.
// Packing a node_modules that still contains dev dependencies (TypeScript) is
// slow and unreliable, so we never pack the working tree directly.

import { execFileSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

if (!existsSync(join(root, "dist", "index.js"))) {
  console.error("dist/index.js is missing. Run `npm run build` first.");
  process.exit(1);
}

const stage = mkdtempSync(join(tmpdir(), "kontra-bundle-"));
try {
  for (const file of ["manifest.json", "package.json", "README.md", "LICENSE"]) {
    copyFileSync(join(root, file), join(stage, file));
  }
  cpSync(join(root, "dist"), join(stage, "dist"), { recursive: true });

  console.log("Installing production dependencies...");
  execFileSync(npm, ["install", "--omit=dev", "--no-audit", "--no-fund", "--no-package-lock"], {
    cwd: stage,
    stdio: "inherit",
  });

  console.log("Packing kontra.mcpb...");
  execFileSync(npx, ["-y", "@anthropic-ai/mcpb", "pack", ".", join(root, "kontra.mcpb")], {
    cwd: stage,
    stdio: "inherit",
  });

  console.log("Done. Built kontra.mcpb");
} finally {
  rmSync(stage, { recursive: true, force: true });
}
