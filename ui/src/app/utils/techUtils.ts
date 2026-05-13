/**
 * Extracts key technology labels mentioned in a block of text using regular expression testing.
 */
export function extractTechKeywords(text: string): string[] {
  if (!text) return [];
  const keywords = [
    { label: "Go", patterns: [/\bgo\b/i, /\bgolang\b/i] },
    { label: "TypeScript", patterns: [/\btypescript\b/i, /\bts\b/i] },
    { label: "Python", patterns: [/\bpython\b/i] },
    { label: "Docker", patterns: [/\bdocker\b/i, /\bdockerfile\b/i] },
    { label: "Next.js", patterns: [/\bnext\.js\b/i, /\bnextjs\b/i] },
    { label: "React", patterns: [/\breact\b/i] },
    { label: "JavaScript", patterns: [/\bjavascript\b/i, /\bjs\b/i] },
    { label: "Tailwind CSS", patterns: [/\btailwind\b/i, /\btailwindcss\b/i] },
    { label: "SQLite", patterns: [/\bsqlite\b/i] },
    { label: "SQL", patterns: [/\bsql\b/i] },
    { label: "Git", patterns: [/\bgit\b/i] },
    { label: "Rust", patterns: [/\brust\b/i] },
  ];

  const found: string[] = [];
  keywords.forEach((kw) => {
    for (const pattern of kw.patterns) {
      if (pattern.test(text)) {
        found.push(kw.label);
        break;
      }
    }
  });
  return found;
}

/**
 * Parses tech tags lists compiled by AI deep scans or summaries into clean trimmed arrays.
 */
export function parseTechTags(tagStr: string): string[] {
  if (!tagStr) return [];
  return tagStr
    .split(/[,\n]/)
    .map((s) => s.replace(/^[-*•\s]+/, "").trim())
    .filter((s) => s.length > 0 && s.length < 30);
}
