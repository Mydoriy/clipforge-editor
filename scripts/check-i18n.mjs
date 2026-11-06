#!/usr/bin/env node
import { translations } from '../src/i18n/index.ts';

console.log('🔍 Checking i18n translation completeness & key parity...');

const vnKeys = Object.keys(translations.VN);
const enKeys = Object.keys(translations.EN);

const missingInEn = vnKeys.filter((k) => !(k in translations.EN));
const missingInVn = enKeys.filter((k) => !(k in translations.VN));

let hasErrors = false;

if (missingInEn.length > 0) {
  console.error(`❌ Missing ${missingInEn.length} translation keys in EN:`, missingInEn);
  hasErrors = true;
}

if (missingInVn.length > 0) {
  console.error(`❌ Missing ${missingInVn.length} translation keys in VN:`, missingInVn);
  hasErrors = true;
}

// Check for empty string values
for (const [key, value] of Object.entries(translations.VN)) {
  if (typeof value !== 'string' || value.trim() === '') {
    console.error(`❌ Empty or invalid value for key "${key}" in VN translation.`);
    hasErrors = true;
  }
}

for (const [key, value] of Object.entries(translations.EN)) {
  if (typeof value !== 'string' || value.trim() === '') {
    console.error(`❌ Empty or invalid value for key "${key}" in EN translation.`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('❌ i18n check failed. Please ensure all translation dictionaries have identical keys.');
  process.exit(1);
} else {
  console.log(`✅ i18n parity check passed! All ${vnKeys.length} keys in VN match EN with 100% completeness.`);
  process.exit(0);
}
