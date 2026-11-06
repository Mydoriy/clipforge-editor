export interface EditPilotAction {
  type: 'speed' | 'cut' | 'filter' | 'text' | 'mute' | 'export' | 'hook';
  payload?: any;
  message: string;
}

// Local natural language command parser (Vietnamese & English)
export function parseLocalEditCommand(prompt: string): EditPilotAction[] {
  const p = prompt.toLowerCase().trim();
  const actions: EditPilotAction[] = [];

  // 1. Tốc độ / Speed
  if (p.includes('tăng tốc') || p.includes('speed up') || p.includes('nhanh')) {
    const is2x = p.includes('2x') || p.includes('gấp đôi');
    const speed = is2x ? 2.0 : 1.5;
    actions.push({
      type: 'speed',
      payload: speed,
      message: `Đã tăng tốc độ video lên ${speed}x`
    });
  } else if (p.includes('chậm') || p.includes('slow') || p.includes('slowmo')) {
    actions.push({
      type: 'speed',
      payload: 0.75,
      message: 'Đã giảm tốc độ video xuống 0.75x (Slow-motion)'
    });
  }

  // 2. Cắt / Trim
  if (p.includes('cắt') || p.includes('trim') || p.includes('cut')) {
    actions.push({
      type: 'cut',
      payload: 2,
      message: 'Đã cắt 2 giây đầu của clip'
    });
  }

  // 3. Bộ lọc màu / Filter
  if (p.includes('cinematic') || p.includes('điện ảnh')) {
    actions.push({
      type: 'filter',
      payload: 'cinematic',
      message: 'Đã áp dụng bộ lọc màu Cinematic Moody (Teal & Orange)'
    });
  } else if (p.includes('vhs') || p.includes('retro')) {
    actions.push({
      type: 'filter',
      payload: 'vhs',
      message: 'Đã áp dụng bộ lọc màu Retro VHS 1990'
    });
  } else if (p.includes('đen trắng') || p.includes('noir') || p.includes('monochrome')) {
    actions.push({
      type: 'filter',
      payload: 'noir',
      message: 'Đã áp dụng bộ lọc đen trắng Noir B&W'
    });
  }

  // 4. Thêm chữ / Phụ đề / Text
  if (p.includes('thêm chữ') || p.includes('add text') || p.includes('chèn chữ') || p.includes('subtitle') || p.includes('phụ đề')) {
    actions.push({
      type: 'text',
      payload: '🔥 HOOK GIẬT GÂN 2026',
      message: 'Đã chèn mẫu chữ nổi bật vào video'
    });
  }

  // 5. Tắt tiếng / Mute
  if (p.includes('tắt tiếng') || p.includes('mute') || p.includes('im lặng')) {
    actions.push({
      type: 'mute',
      payload: 0,
      message: 'Đã tắt tiếng audio của video'
    });
  }

  // 6. Xuất video / Export
  if (p.includes('xuất video') || p.includes('export') || p.includes('tải về') || p.includes('render')) {
    actions.push({
      type: 'export',
      message: 'Mở cửa sổ xuất video 9:16'
    });
  }

  return actions;
}

// Call optional remote LLM API (OpenAI or Gemini) if API key provided in settings
export async function callRemoteLLM(
  prompt: string,
  apiKey: string,
  provider: 'openai' | 'gemini' = 'openai'
): Promise<string> {
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are EditPilot, an AI video editing assistant for CapCut Web. Answer concisely in Vietnamese with practical video editing advice.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'Không nhận được phản hồi từ AI.';
  }

  return 'Phản hồi từ AI cục bộ.';
}

