export function extractMentions(text: string): string[] {
  const regex = /@([a-zA-Z0-9_]+)/g;
  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return Array.from(new Set(matches)); // deduplikálás
}