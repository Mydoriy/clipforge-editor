// Subtitle Import / Export and Timecode Utilities (SRT, VTT, LRC)

export interface SubtitleItem {
  id?: string;
  start: number; // in seconds
  duration: number; // in seconds
  text: string;
}

// Convert seconds to SRT timestamp: 00:01:23,456
export function secondsToSrtTime(sec: number): string {
  const s = Math.max(0, sec);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = Math.floor(s % 60);
  const milliseconds = Math.floor((s % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

// Convert seconds to VTT timestamp: 00:01:23.456
export function secondsToVttTime(sec: number): string {
  const s = Math.max(0, sec);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = Math.floor(s % 60);
  const milliseconds = Math.floor((s % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`;
}

// Convert seconds to LRC timestamp: [01:23.45]
export function secondsToLrcTime(sec: number): string {
  const s = Math.max(0, sec);
  const minutes = Math.floor(s / 60);
  const seconds = Math.floor(s % 60);
  const hundredths = Math.floor((s % 1) * 100);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `[${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}]`;
}

// Parse timestamp string into seconds
export function parseTimestampToSeconds(ts: string): number {
  const clean = ts.trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(clean) || 0;
}

// Parse .SRT file text
export function parseSrt(content: string): SubtitleItem[] {
  const items: SubtitleItem[] = [];
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 2) {
      // Find timecode line containing '-->'
      const timeLineIdx = lines.findIndex((l) => l.includes('-->'));
      if (timeLineIdx !== -1) {
        const timeLine = lines[timeLineIdx];
        const textLines = lines.slice(timeLineIdx + 1);
        const text = textLines.join('\n').trim();
        const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
        if (startStr && endStr && text) {
          const start = parseTimestampToSeconds(startStr);
          const end = parseTimestampToSeconds(endStr);
          const duration = Math.max(0.5, end - start);
          items.push({ start, duration, text });
        }
      }
    }
  }
  return items;
}

// Parse .VTT file text
export function parseVtt(content: string): SubtitleItem[] {
  const items: SubtitleItem[] = [];
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map((s) => s.trim().split(' ')[0]);
      let text = '';
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        text += (text ? '\n' : '') + lines[i].trim();
        i++;
      }
      if (startStr && endStr && text) {
        const start = parseTimestampToSeconds(startStr);
        const end = parseTimestampToSeconds(endStr);
        const duration = Math.max(0.5, end - start);
        items.push({ start, duration, text });
      }
    } else {
      i++;
    }
  }
  return items;
}

// Parse .LRC file text
export function parseLrc(content: string): SubtitleItem[] {
  const items: SubtitleItem[] = [];
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;

  for (const line of lines) {
    const match = regex.exec(line.trim());
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) / 1000 : 0;
      const start = min * 60 + sec + ms;
      const text = match[4].trim();
      if (text) {
        items.push({ start, duration: 3.5, text });
      }
    }
  }

  // Adjust durations according to next timestamp
  for (let i = 0; i < items.length; i++) {
    const next = items[i + 1];
    if (next) {
      items[i].duration = Math.max(1.0, Math.min(8.0, next.start - items[i].start));
    }
  }
  return items;
}

// Export subtitle items to SRT format
export function exportToSrt(items: SubtitleItem[]): string {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  return sorted
    .map((item, idx) => {
      const index = idx + 1;
      const start = secondsToSrtTime(item.start);
      const end = secondsToSrtTime(item.start + item.duration);
      return `${index}\n${start} --> ${end}\n${item.text}\n`;
    })
    .join('\n');
}

// Export subtitle items to VTT format
export function exportToVtt(items: SubtitleItem[]): string {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const cues = sorted
    .map((item) => {
      const start = secondsToVttTime(item.start);
      const end = secondsToVttTime(item.start + item.duration);
      return `${start} --> ${end}\n${item.text}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${cues}`;
}

// Export subtitle items to LRC format
export function exportToLrc(items: SubtitleItem[]): string {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  return sorted
    .map((item) => {
      const timeTag = secondsToLrcTime(item.start);
      return `${timeTag}${item.text}`;
    })
    .join('\n');
}

// Helper to trigger browser download of subtitle file
export function downloadSubtitleFile(content: string, filename: string, type: 'srt' | 'vtt' | 'lrc'): void {
  const mime = type === 'vtt' ? 'text/vtt' : 'text/plain';
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith(`.${type}`) ? filename : `${filename}.${type}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

