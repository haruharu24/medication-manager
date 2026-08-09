import { describe, it, expect } from 'vitest';
import { parseOcrTextToMedication } from './ocrParse';

describe('parseOcrTextToMedication', () => {
  it('extracts title, dosage, unit, and label from clean OCR text', () => {
    const result = parseOcrTextToMedication('テスト薬\n1回2錠\n朝食後');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('テスト薬');
    expect(result!.dosage).toBe(2);
    expect(result!.unit).toBe('錠');
    expect(result!.label).toBe('朝食後');
    expect(result!.stock).toBe(0);
    expect(result!.isFolder).toBe(false);
  });

  it('matches a dosage+unit pattern with no space between them', () => {
    const result = parseOcrTextToMedication('アムロジピン\n1錠');
    expect(result!.dosage).toBe(1);
    expect(result!.unit).toBe('錠');
  });

  it('matches decimal dosages', () => {
    const result = parseOcrTextToMedication('薬A\n0.5包 夕食後');
    expect(result!.dosage).toBe(0.5);
    expect(result!.unit).toBe('包');
  });

  it('falls back to dosage 1 / unit 錠 when no dosage+unit pattern is found', () => {
    const result = parseOcrTextToMedication('謎の薬\n朝食後');
    expect(result!.dosage).toBe(1);
    expect(result!.unit).toBe('錠');
  });

  it('falls back to label 朝食後 when no known timing keyword is found', () => {
    const result = parseOcrTextToMedication('謎の薬\n1回1錠');
    expect(result!.label).toBe('朝食後');
  });

  it('picks the earliest-occurring label when multiple timing keywords appear', () => {
    const result = parseOcrTextToMedication('薬B\n夕食後の分と朝食後の分');
    expect(result!.label).toBe('夕食後');
  });

  it('never detects カスタム as a timing (it is a UI-only placeholder, not real OCR text)', () => {
    const result = parseOcrTextToMedication('カスタム薬\nカスタム');
    expect(result!.label).toBe('朝食後');
  });

  it('skips leading noise lines (dates, punctuation-only) when picking the title', () => {
    const result = parseOcrTextToMedication('2026/08/09\n---\nホンモノの薬名\n1回1錠 朝食後');
    expect(result!.title).toBe('ホンモノの薬名');
  });

  it('returns null when the text has no meaningful line at all', () => {
    expect(parseOcrTextToMedication('')).toBeNull();
    expect(parseOcrTextToMedication('   \n\n')).toBeNull();
    expect(parseOcrTextToMedication('2026/08/09\n---\n123')).toBeNull();
  });

  it('leaves memo blank when both dosage and label were confidently detected', () => {
    const result = parseOcrTextToMedication('テスト薬\n1回2錠\n朝食後');
    expect(result!.memo).toBe('');
  });

  it('fills memo with the raw OCR text when neither dosage nor label could be detected (low confidence)', () => {
    const result = parseOcrTextToMedication('謎の薬\nよくわからない内容');
    expect(result!.memo).toContain('謎の薬');
    expect(result!.memo).toContain('よくわからない内容');
  });

  it('leaves memo blank if only one of dosage/label was detected (not low confidence)', () => {
    const withDosageOnly = parseOcrTextToMedication('薬C\n1回3錠');
    expect(withDosageOnly!.memo).toBe('');

    const withLabelOnly = parseOcrTextToMedication('薬D\n夕食後');
    expect(withLabelOnly!.memo).toBe('');
  });

  it('truncates an overly long low-confidence memo to 200 characters', () => {
    const longText = '謎の薬\n' + 'あ'.repeat(500);
    const result = parseOcrTextToMedication(longText);
    expect(result!.memo.length).toBe(200);
  });
});
