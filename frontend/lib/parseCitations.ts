// lib/parseCitations.ts
// /api/chat が返す回答本文中の [1][2]... インライン引用マーカーを、
// 表示用のテキスト断片と引用番号に分割する（NotebookLM風のインライン出典表示のため）

export type ContentSegment =
  | { type: "text"; value: string }
  | { type: "citation"; number: number };

export function parseCitationSegments(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const regex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "citation", number: Number(match[1]) });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }
  return segments;
}
