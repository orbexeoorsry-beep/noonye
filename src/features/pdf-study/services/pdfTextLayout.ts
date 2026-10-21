interface TextFragment {
  str?: string;
  dir?: unknown;
  transform?: unknown;
  hasEOL?: unknown;
  [key: string]: unknown;
}

/** PDF.js sometimes returns Arabic presentation glyphs in visual left-to-right order.
 * Reorder only demonstrably fragmented RTL lines with ascending X coordinates.
 * Whole logical strings (the normal PDF.js output) are left in their given order.
 */
export function textFromPdfItems(items: TextFragment[]): string {
  const lines: TextFragment[][] = [];
  let line: TextFragment[] = [];
  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    line.push(item);
    if (item.hasEOL) { lines.push(line); line = []; }
  }
  if (line.length) lines.push(line);
  return lines.map(parts => {
    const actual = parts.filter(part => part.str?.trim());
    const arabic = actual.filter(part => /\p{Script=Arabic}/u.test(part.str!));
    const fragmented = arabic.length >= 4 && arabic.filter(part => [...part.str!].length <= 2).length / arabic.length > 0.7;
    const xs = actual.map(part => Array.isArray(part.transform) ? part.transform[4] : undefined);
    const positioned = xs.every(x => typeof x === 'number');
    const ascending = positioned && xs.slice(1).filter((x, index) => (x as number) >= (xs[index] as number)).length / Math.max(1, xs.length - 1) > 0.85;
    let ordered = parts;
    if (fragmented && ascending) {
      // Keep contiguous Latin/numeric fragments in their own reading direction.
      const runs: TextFragment[][] = [];
      let latin: TextFragment[] = [];
      for (const part of parts) {
        if (part.str?.trim() && !/\p{Script=Arabic}/u.test(part.str) && part.dir === 'ltr') latin.push(part);
        else { if (latin.length) { runs.push(latin); latin = []; } runs.push([part]); }
      }
      if (latin.length) runs.push(latin);
      ordered = runs.reverse().flat();
    }
    const useExactFragments = positioned;
    return ordered.map(part => part.str || '').join(useExactFragments ? '' : ' ').normalize('NFKC').replace(/[ \t]+/g, ' ').trim();
  }).filter(Boolean).join('\n').trim();
}
