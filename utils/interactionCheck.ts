import { GoogleGenAI, Type } from '@google/genai';
import { Medication } from '../types';

export type InteractionSeverity = 'high' | 'medium' | 'low';

export interface InteractionPair {
  medA: string;
  medB: string;
  severity: InteractionSeverity;
  description: string;
}

export interface InteractionCheckResult {
  pairs: InteractionPair[];
  summary: string;
}

// Uses the same Gemini integration already wired up for お薬手帳 scanning (App.tsx
// handleScan). Results are general-knowledge flags, not a medical judgement — the
// UI must always pair this with a disclaimer to consult a doctor/pharmacist.
export const checkInteractions = async (medications: Medication[]): Promise<InteractionCheckResult> => {
  const targets = medications.filter(m => !m.isFolder);
  const medList = targets
    .map(m => `- ${m.title}(${m.dosage}${m.unit}, ${m.label}${m.memo ? `, メモ: ${m.memo}` : ''})`)
    .join('\n');

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          text:
            '以下は現在服用中のお薬のリストです。一般的に知られている飲み合わせ(併用注意・併用禁忌)のリスクを日本語で確認してください。\n' +
            '医学的な最終判断は医師・薬剤師に委ねるべき一般的な注意喚起であることを前提に、リスクがあると考えられる組み合わせのみpairsに列挙してください。リスクが見つからない場合はpairsを空配列にしてください。\n\n' +
            medList,
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: '全体的な注意点のまとめ(日本語)' },
          pairs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                medA: { type: Type.STRING },
                medB: { type: Type.STRING },
                severity: { type: Type.STRING, description: 'high, medium, low のいずれか' },
                description: { type: Type.STRING, description: '日本語でのリスクの説明' },
              },
              required: ['medA', 'medB', 'severity', 'description'],
            },
          },
        },
        required: ['summary', 'pairs'],
      },
    },
  });

  const jsonStr = response.text?.trim();
  if (!jsonStr) throw new Error('AIからの応答を取得できませんでした');

  const parsed = JSON.parse(jsonStr);
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    pairs: Array.isArray(parsed.pairs) ? parsed.pairs : [],
  };
};
