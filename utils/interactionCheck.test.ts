import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Medication } from '../types';

const generateContentMock = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function (this: any) {
    this.models = { generateContent: generateContentMock };
  }),
  Type: { OBJECT: 'OBJECT', ARRAY: 'ARRAY', STRING: 'STRING' },
}));

import { checkInteractions } from './interactionCheck';

const med = (overrides: Partial<Medication> = {}): Medication => ({
  id: 'm1',
  title: 'Med A',
  unit: '錠',
  dosage: 1,
  label: '朝食後',
  stock: 10,
  memo: '',
  color: 'emerald',
  startDate: Date.now(),
  isFolder: false,
  ...overrides,
});

describe('checkInteractions', () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it('parses a well-formed JSON response into pairs + summary', async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        summary: '全体的に大きな問題はありません',
        pairs: [{ medA: 'Med A', medB: 'Med B', severity: 'medium', description: '眠気が強まる可能性があります' }],
      }),
    });

    const result = await checkInteractions([med({ id: 'a', title: 'Med A' }), med({ id: 'b', title: 'Med B' })]);

    expect(result.summary).toBe('全体的に大きな問題はありません');
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].severity).toBe('medium');
  });

  it('excludes folders from the medication list sent to the model', async () => {
    generateContentMock.mockResolvedValue({ text: JSON.stringify({ summary: '', pairs: [] }) });

    await checkInteractions([med({ id: 'a', title: 'Real Med' }), med({ id: 'f', title: 'Folder', isFolder: true })]);

    const call = generateContentMock.mock.calls[0][0];
    const promptText = call.contents.parts[0].text;
    expect(promptText).toContain('Real Med');
    expect(promptText).not.toContain('Folder');
  });

  it('defaults to an empty result when fields are missing from the response', async () => {
    generateContentMock.mockResolvedValue({ text: JSON.stringify({}) });
    const result = await checkInteractions([med()]);
    expect(result).toEqual({ summary: '', pairs: [] });
  });

  it('throws a clear error when the model returns no text at all', async () => {
    generateContentMock.mockResolvedValue({ text: '' });
    await expect(checkInteractions([med()])).rejects.toThrow('AIからの応答を取得できませんでした');
  });
});
