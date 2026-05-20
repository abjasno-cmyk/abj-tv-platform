#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT_DIR = process.cwd();
const CANONICAL_HOST = "abj-tv-platform-n7e8.vercel.app";
const REQUIRED_FILES = [
  "app/layout.tsx",
  "components/auth/AuthProvider.tsx",
  "app/auth/callback/route.ts",
  "middleware.ts",
];
const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".env",
]);
const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  ".vercel",
  "node_modules",
  "coverage",
  "dist",
  "build",
  "docs",
]);
const PREVIEW_HOST_REGEX = /abj-tv-platform-n7e8-[a-z0-9-]+\.vercel\.app/gi;
const WILDCARD_VERCEL_REGEX = /(?:https?:\/\/)?\*\.vercel\.app/gi;

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const absolutePath = join(dir, entry);
    const relPath = relative(ROOT_DIR, absolutePath);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      if (IGNORED_DIRS.has(entry)) continue;
      files.push(...walk(absolutePath));
      continue;
    }

    const extension = extname(entry);
    if (!ALLOWED_EXTENSIONS.has(extension)) continue;
    files.push(relPath);
  }
  return files;
}

function findMatches(content, regex) {
  const matches = [];
  const normalized = new RegExp(regex.source, regex.flags);
  let match = normalized.exec(content);
  while (match) {
    matches.push(match[0]);
    match = normalized.exec(content);
  }
  return [...new Set(matches)];
}

const scanFiles = walk(ROOT_DIR);
const violations = [];

for (const relPath of scanFiles) {
  const absPath = join(ROOT_DIR, relPath);
  const content = readFileSync(absPath, "utf8");
  const previewMatches = findMatches(content, PREVIEW_HOST_REGEX);
  if (previewMatches.length > 0) {
    violations.push(`${relPath}: preview host found (${previewMatches.join(", ")})`);
  }

  const wildcardMatches = findMatches(content, WILDCARD_VERCEL_REGEX);
  if (wildcardMatches.length > 0) {
    violations.push(`${relPath}: wildcard Vercel domain found (${wildcardMatches.join(", ")})`);
  }
}

for (const requiredFile of REQUIRED_FILES) {
  const absPath = join(ROOT_DIR, requiredFile);
  const content = readFileSync(absPath, "utf8");
  if (!content.includes(CANONICAL_HOST)) {
    violations.push(`${requiredFile}: missing canonical host "${CANONICAL_HOST}"`);
  }
}

if (violations.length > 0) {
  console.error("Canonical host guard failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Canonical host guard passed.");
