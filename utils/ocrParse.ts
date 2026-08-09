import { Medication, UnitType, LabelType } from '../types';
import { UNITS, LABELS } from '../constants';

// 'カスタム' is a UI-only placeholder timing, not something OCR text could ever
// contain literally — excluded from the label-detection vocabulary.
const REAL_LABELS = LABELS.filter((l) => l !== 'カスタム');

const DOSAGE_UNIT_PATTERN = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNITS.join('|')})`);

const MEMO_MAX_LENGTH = 200;

// Lines that are only digits/punctuation/whitespace are almost always OCR noise
// (dates, ruling-line misreads) rather than a medication name.
const isMeaningfulLine = (line: string): boolean => /[^\d\s\-.:/年月日()（）]/.test(line);

const findTitle = (text: string): string | null => {
  const line = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0 && isMeaningfulLine(l));
  return line || null;
};

const findDosageAndUnit = (text: string): { dosage: number; unit: UnitType } => {
  const match = text.match(DOSAGE_UNIT_PATTERN);
  if (match) {
    return { dosage: parseFloat(match[1]), unit: match[2] as UnitType };
  }
  return { dosage: 1, unit: '錠' };
};

const findLabel = (text: string): LabelType | null => {
  let earliestIndex = Infinity;
  let found: LabelType | null = null;
  for (const label of REAL_LABELS) {
    const index = text.indexOf(label);
    if (index !== -1 && index < earliestIndex) {
      earliestIndex = index;
      found = label;
    }
  }
  return found;
};

// Converts one image's raw OCR text into a best-effort Medication draft. Returns
// null when the text has nothing usable (empty scan, blank page) so the caller
// can skip that image entirely rather than adding an empty draft.
export const parseOcrTextToMedication = (rawText: string): Medication | null => {
  const title = findTitle(rawText);
  if (!title) return null;

  const { dosage, unit } = findDosageAndUnit(rawText);
  const detectedLabel = findLabel(rawText);
  const label: LabelType = detectedLabel || '朝食後';

  // Low confidence when neither the dosage/unit nor the label could actually be
  // detected (both fell back to defaults) — in that case, keep the raw OCR text
  // around in memo as a hint for manual correction instead of silently guessing.
  const lowConfidence = !DOSAGE_UNIT_PATTERN.test(rawText) && !detectedLabel;
  const memo = lowConfidence ? rawText.trim().slice(0, MEMO_MAX_LENGTH) : '';

  return {
    id: crypto.randomUUID(),
    title,
    dosage,
    unit,
    label,
    stock: 0,
    memo,
    color: 'emerald',
    startDate: Date.now(),
    isFolder: false,
  };
};
