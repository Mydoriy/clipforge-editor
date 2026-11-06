import test from 'node:test';
import assert from 'node:assert/strict';
import { detectShortcutConflict } from '../utils/shortcuts.ts';
import { translations, formatLocaleDate, formatLocaleNumber } from '../i18n/index.ts';

test('W7: Shortcut Conflict Detection', () => {
  // 1. Conflict on default key 'Space'
  const conflictSpace = detectShortcutConflict('split', 'Space');
  assert.strictEqual(conflictSpace.hasConflict, true);
  assert.strictEqual(conflictSpace.conflictingActionId, 'playPause');

  // 2. Conflict normalization with modifier order (e.g. 'z+ctrl' vs 'Ctrl+Z')
  const conflictUndo = detectShortcutConflict('split', 'z+ctrl');
  assert.strictEqual(conflictUndo.hasConflict, true);
  assert.strictEqual(conflictUndo.conflictingActionId, 'undo');

  // 3. Custom shortcuts override conflict detection
  const customShortcuts = { split: 'X', delete: 'Delete' };
  const conflictCustom = detectShortcutConflict('deleteLeft', 'X', customShortcuts);
  assert.strictEqual(conflictCustom.hasConflict, true);
  assert.strictEqual(conflictCustom.conflictingActionId, 'split');

  // 4. No conflict for a unique key combo
  const noConflict = detectShortcutConflict('split', 'Ctrl+Alt+U');
  assert.strictEqual(noConflict.hasConflict, false);
});

test('W7: i18n Translation Completeness & Locale Formatters', () => {
  // 1. Key Parity
  const vnKeys = Object.keys(translations.VN);
  const enKeys = Object.keys(translations.EN);
  assert.strictEqual(vnKeys.length, enKeys.length, 'VN and EN dictionaries must have identical key count');

  for (const k of vnKeys) {
    assert.ok(k in translations.EN, `Key "${k}" missing in EN translation`);
    assert.ok(translations.VN[k].length > 0, `Key "${k}" in VN must not be empty`);
    assert.ok(translations.EN[k].length > 0, `Key "${k}" in EN must not be empty`);
  }

  // 2. Locale Date Formatter
  const timestamp = new Date('2026-11-06T12:00:00Z').getTime();
  const dateVn = formatLocaleDate(timestamp, 'VN');
  const dateEn = formatLocaleDate(timestamp, 'EN');
  assert.ok(typeof dateVn === 'string' && dateVn.length > 0);
  assert.ok(typeof dateEn === 'string' && dateEn.length > 0);

  // 3. Locale Number Formatter
  const formattedVn = formatLocaleNumber(1250000, 'VN');
  const formattedEn = formatLocaleNumber(1250000, 'EN');
  assert.ok(typeof formattedVn === 'string' && formattedVn.length > 0);
  assert.ok(typeof formattedEn === 'string' && formattedEn.length > 0);
});

