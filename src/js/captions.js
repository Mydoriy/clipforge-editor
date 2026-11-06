/* ==========================================================================
   CLIPFORGE - CAPTION STUDIO & SRT PARSER
   ========================================================================== */
function parseSrt(srtText) {
  const entries = [];
  const blocks = srtText.trim().replace(/\r/g, '').split('\n\n');
  for (const b of blocks) {
    const lines = b.trim().split('\n');
    if (lines.length >= 2) {
      const timeMatch = lines[1].match(/(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/);
      if (timeMatch) {
        const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
        const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
        const content = lines.slice(2).join(' ');
        entries.push({ start, end, duration: Math.max(0.5, end - start), content });
      }
    }
  }
  return entries;
}

function generateCaptionsFromScript(scriptText, totalDur, startOffset = 0) {
  const lines = scriptText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const lineDur = (totalDur - startOffset) / lines.length;
  return lines.map((text, idx) => {
    const start = startOffset + idx * lineDur;
    const words = text.trim().split(/\s+/);
    const wordDur = lineDur / words.length;
    const tokens = words.map((w, wIdx) => ({
      word: w,
      start: start + wIdx * wordDur,
      end: start + (wIdx + 1) * wordDur
    }));
    return {
      start,
      duration: lineDur,
      content: text.trim(),
      tokens
    };
  });
}
