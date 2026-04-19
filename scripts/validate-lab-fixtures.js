// Validate all lab fixtures against Zod schema.
// Phase 00 gate: ≥ 95% of labs must parse cleanly.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LabFixtureSchema } from './lab-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIX_DIR = resolve(__dirname, '..', 'fixtures', 'labs');

const files = readdirSync(FIX_DIR).filter((f) => f.endsWith('.json'));

let pass = 0;
let fail = 0;
const failures = [];

for (const file of files) {
  const raw = JSON.parse(readFileSync(resolve(FIX_DIR, file), 'utf8'));
  const result = LabFixtureSchema.safeParse(raw);
  if (result.success) {
    console.log(`✓ ${file}`);
    pass++;
  } else {
    console.log(`✗ ${file}`);
    for (const issue of result.error.issues) {
      console.log(`   ${issue.path.join('.')}: ${issue.message}`);
    }
    failures.push({ file, issues: result.error.issues });
    fail++;
  }
}

const total = pass + fail;
const rate = total > 0 ? ((pass / total) * 100).toFixed(1) : '0.0';
console.log(`\n=== Summary ===`);
console.log(`Pass: ${pass}/${total} (${rate}%)`);
console.log(`Fail: ${fail}`);
console.log(`Gate (≥95%): ${pass / total >= 0.95 ? 'PASS ✓' : 'FAIL ✗'}`);

process.exit(fail === 0 ? 0 : 1);
