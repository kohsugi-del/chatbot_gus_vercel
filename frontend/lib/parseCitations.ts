// lib/parseCitations.ts
// /api/chat が返す回答本文中の [1][2]... インライン引用マーカーを、
// 表示用のテキスト断片と引用番号に分割する（NotebookLM風のインライン出典表示のため）

export type ContentSegment =
  | { type: "text"; value: string }
  | { type: "citation"; number: number; occurrence: number };

// occurrence: content中に出てくる[n]マーカーの通し番号（0始まり）。
// 同じ資料番号nが複数箇所で引用されても、箇所ごとに異なる抜粋を紐付けられるようにするため
// （出典自体はnで決まるが、ホバーで見せる抜粋はその引用箇所の文脈に応じて変わる）
export function parseCitationSegments(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const regex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let occurrence = 0;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "citation", number: Number(match[1]), occurrence: occurrence++ });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }
  return segments;
}
