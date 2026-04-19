#!/usr/bin/env node
/**
 * validate-lab-schema.js — Schema v3 validator for lab HTML files.
 *
 * Reads labs/<dir>/*.html, extracts <script id="lab-data">...</script>,
 * JSON.parse, enforces mandatory keys per lab-schema-v3.md §7.
 *
 * Exit 0 = all pass. Exit 1 = any lab has missing/empty mandatory fields.
 * Usage: node scripts/validate-lab-schema.js  (or npm run validate:schema)
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LABS_ROOT = join(ROOT, 'labs');

// Walk labs/<dir>/*.html excluding _shared and index.html.
function findLabHtmlFiles() {
  const results = [];
  for (const entry of readdirSync(LABS_ROOT)) {
    if (entry.startsWith('_')) continue;
    const sub = join(LABS_ROOT, entry);
    if (!statSync(sub).isDirectory()) continue;
    for (const file of readdirSync(sub)) {
      if (file.endsWith('.html') && file !== 'index.html') {
        results.push(join(sub, file));
      }
    }
  }
  return results;
}

// Extract <script id="lab-data" type="application/json">...</script>.
function extractLabData(html) {
  const m = html.match(/<script[^>]*id=["']lab-data["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  return m[1].trim();
}

// Non-empty check: rejects '', [], {}, null, undefined, whitespace-only strings.
function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function assertPresent(errs, obj, path, keys) {
  for (const key of keys) {
    if (isEmpty(obj?.[key])) errs.push(`${path}.${key} missing or empty`);
  }
}

function validateLab(labPath, data) {
  const errs = [];

  // Top-level mandatory.
  assertPresent(errs, data, '$', ['title']);

  // misconceptions ≥2.
  if (!Array.isArray(data.misconceptions) || data.misconceptions.length < 2) {
    errs.push('$.misconceptions must be array with ≥2 items');
  } else {
    data.misconceptions.forEach((m, i) => {
      assertPresent(errs, m, `$.misconceptions[${i}]`, ['wrong', 'right', 'why']);
    });
  }

  // tldr rows.
  if (!Array.isArray(data.tldr) || !data.tldr.length) {
    errs.push('$.tldr must be non-empty array');
  } else {
    // TLDR row must have why/whyBreaks/deploymentUse + ≥1 non-mandatory key as column label.
    data.tldr.forEach((r, i) => {
      assertPresent(errs, r, `$.tldr[${i}]`, ['why', 'whyBreaks', 'deploymentUse']);
      const reserved = new Set(['why', 'whyBreaks', 'deploymentUse', 'observeWith']);
      const labelKeys = Object.keys(r || {}).filter(k => !reserved.has(k));
      if (!labelKeys.length) errs.push(`$.tldr[${i}] needs ≥1 label column (e.g. "what")`);
    });
  }

  // walkthrough steps.
  if (!Array.isArray(data.walkthrough) || !data.walkthrough.length) {
    errs.push('$.walkthrough must be non-empty array');
  } else {
    data.walkthrough.forEach((s, i) => {
      assertPresent(errs, s, `$.walkthrough[${i}]`, ['step', 'what', 'why', 'whyBreaks', 'observeWith']);
    });
  }

  // quiz ≥4 (acceptable floor; quiz-bank external is v2 override).
  if (!Array.isArray(data.quiz) || data.quiz.length < 4) {
    errs.push('$.quiz must have ≥4 items');
  } else {
    data.quiz.forEach((q, i) => {
      assertPresent(errs, q, `$.quiz[${i}]`, ['q', 'options', 'whyCorrect', 'whyOthersWrong']);
      if (typeof q.correct !== 'number') errs.push(`$.quiz[${i}].correct must be number`);
    });
  }

  // flashcards ≥5.
  if (!Array.isArray(data.flashcards) || data.flashcards.length < 5) {
    errs.push('$.flashcards must have ≥5 items');
  } else {
    data.flashcards.forEach((c, i) => {
      assertPresent(errs, c, `$.flashcards[${i}]`, ['front', 'back', 'why']);
    });
  }

  // tryAtHome ≥2.
  if (!Array.isArray(data.tryAtHome) || data.tryAtHome.length < 2) {
    errs.push('$.tryAtHome must have ≥2 items');
  } else {
    data.tryAtHome.forEach((t, i) => {
      assertPresent(errs, t, `$.tryAtHome[${i}]`, ['why', 'cmd', 'observeWith']);
    });
  }

  return errs;
}

function main() {
  const files = findLabHtmlFiles();
  if (!files.length) {
    console.error('No lab HTML files found under labs/');
    process.exit(1);
  }

  let totalErrs = 0;
  const report = [];

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const html = readFileSync(file, 'utf8');
    const json = extractLabData(html);
    if (!json) {
      report.push({ file: rel, errs: ['no <script id="lab-data"> found'] });
      totalErrs++;
      continue;
    }
    let data;
    try { data = JSON.parse(json); }
    catch (e) {
      report.push({ file: rel, errs: [`JSON parse failed: ${e.message}`] });
      totalErrs++;
      continue;
    }
    const errs = validateLab(file, data);
    if (errs.length) {
      report.push({ file: rel, errs });
      totalErrs += errs.length;
    } else {
      report.push({ file: rel, errs: [] });
    }
  }

  // Print report.
  console.log('\n=== Schema v3 validation ===\n');
  for (const { file, errs } of report) {
    if (!errs.length) {
      console.log(`  ok   ${file}`);
    } else {
      console.log(`  FAIL ${file}`);
      errs.forEach(e => console.log(`       - ${e}`));
    }
  }

  const failed = report.filter(r => r.errs.length).length;
  console.log(`\n${report.length - failed}/${report.length} labs pass · ${totalErrs} errors\n`);
  process.exit(totalErrs ? 1 : 0);
}

main();
