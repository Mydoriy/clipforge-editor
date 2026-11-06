// 3D LUT Parser (.cube) & 30+ Color Grading Filters Library

export interface Lut3DData {
  title: string;
  size: number;
  data: Float32Array; // Flattened r,g,b floats in [0, 1]
}

export interface FilterPreset {
  id: string;
  name: string;
  category: 'Featured' | 'Life' | 'Cinematic' | 'Scenery' | 'Retro' | 'B&W' | 'Food';
  color: string;
  desc: string;
  cssFilter: (intensity: number) => string;
}

// Parse Adobe / DaVinci Resolve .cube 3D LUT files
export function parseCubeLut(text: string): Lut3DData {
  const lines = text.split('\n');
  let title = 'Custom LUT';
  let size = 0;
  const rawData: number[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('TITLE')) {
      title = trimmed.replace(/^TITLE\s*"?([^"]*)"?$/i, '$1').trim();
    } else if (trimmed.startsWith('LUT_3D_SIZE')) {
      const match = trimmed.match(/LUT_3D_SIZE\s+(\d+)/i);
      if (match) size = parseInt(match[1], 10);
    } else {
      const parts = trimmed.split(/\s+/).map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        rawData.push(parts[0], parts[1], parts[2]);
      }
    }
  }

  if (size === 0) {
    size = Math.round(Math.cbrt(rawData.length / 3)) || 17;
  }

  return {
    title,
    size,
    data: new Float32Array(rawData)
  };
}

// 30+ Filters Divided into 7 Requested Categories
export const FILTER_PRESETS: FilterPreset[] = [
  // 1. FEATURED
  {
    id: 'none',
    name: 'Gốc (Standard)',
    category: 'Featured',
    color: '#64748b',
    desc: 'Màu gốc tự nhiên không chỉnh sửa',
    cssFilter: () => 'none'
  },
  {
    id: 'cinematic',
    name: 'Teal & Orange',
    category: 'Featured',
    color: '#0ea5e9',
    desc: 'Màu điện ảnh Hollywood kinh điển',
    cssFilter: (i) => `contrast(${100 + i * 0.2}%) saturate(${100 + i * 0.25}%) sepia(${i * 0.15}%) hue-rotate(-${i * 0.08}deg)`
  },
  {
    id: 'moody_film',
    name: 'Moody Film',
    category: 'Featured',
    color: '#6366f1',
    desc: 'Màu phim u trầm cảm xúc',
    cssFilter: (i) => `contrast(${100 + i * 0.15}%) brightness(${100 - i * 0.08}%) saturate(${100 - i * 0.15}%)`
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    category: 'Featured',
    color: '#ec4899',
    desc: 'Xanh tím phát quang neon rực rỡ',
    cssFilter: (i) => `saturate(${100 + i * 0.7}%) contrast(${100 + i * 0.2}%) hue-rotate(${i * 0.9}deg)`
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    category: 'Featured',
    color: '#f59e0b',
    desc: 'Nắng chiều vàng rực lãng mạn',
    cssFilter: (i) => `sepia(${i * 0.35}%) saturate(${100 + i * 0.3}%) brightness(${100 + i * 0.08}%)`
  },
  {
    id: 'vhs',
    name: 'Retro 90s VHS',
    category: 'Featured',
    color: '#a855f7',
    desc: 'Băng từ analog cổ điển',
    cssFilter: (i) => `contrast(${100 + i * 0.15}%) saturate(${100 + i * 0.2}%) hue-rotate(${i * 0.15}deg)`
  },

  // 2. LIFE (Đời sống & Vlog)
  {
    id: 'warm_morning',
    name: 'Warm Morning',
    category: 'Life',
    color: '#f97316',
    desc: 'Sáng mai ấm áp, trong trẻo',
    cssFilter: (i) => `sepia(${i * 0.2}%) saturate(${100 + i * 0.15}%) brightness(${100 + i * 0.05}%)`
  },
  {
    id: 'aesthetic_pastel',
    name: 'Aesthetic Pastel',
    category: 'Life',
    color: '#f472b6',
    desc: 'Tông màu pastel dịu nhẹ',
    cssFilter: (i) => `brightness(${100 + i * 0.1}%) contrast(${100 - i * 0.1}%) saturate(${100 + i * 0.1}%)`
  },
  {
    id: 'crisp_clean',
    name: 'Crisp Clean',
    category: 'Life',
    color: '#38bdf8',
    desc: 'Trong vắt, sắc nét hiện đại',
    cssFilter: (i) => `contrast(${100 + i * 0.18}%) brightness(${100 + i * 0.06}%) saturate(${100 + i * 0.1}%)`
  },
  {
    id: 'cozy_cafe',
    name: 'Cozy Cafe',
    category: 'Life',
    color: '#b45309',
    desc: 'Quán cafe tĩnh lặng ấm cúng',
    cssFilter: (i) => `sepia(${i * 0.3}%) contrast(${100 + i * 0.1}%) brightness(${100 - i * 0.05}%)`
  },
  {
    id: 'rose_petal',
    name: 'Rose Petal',
    category: 'Life',
    color: '#fb7185',
    desc: 'Cánh hồng ngọt ngào, da sáng',
    cssFilter: (i) => `brightness(${100 + i * 0.08}%) saturate(${100 + i * 0.2}%) hue-rotate(-${i * 0.05}deg)`
  },
  {
    id: 'soft_glow',
    name: 'Soft Glow',
    category: 'Life',
    color: '#e2e8f0',
    desc: 'Ánh sáng mịn màng mơ màng',
    cssFilter: (i) => `brightness(${100 + i * 0.12}%) contrast(${100 - i * 0.15}%)`
  },

  // 3. CINEMATIC (Điện ảnh)
  {
    id: 'hollywood_blockbuster',
    name: 'Hollywood Blockbuster',
    category: 'Cinematic',
    color: '#0284c7',
    desc: 'Màu phim bom tấn độ tương phản cao',
    cssFilter: (i) => `contrast(${100 + i * 0.3}%) saturate(${100 + i * 0.2}%) sepia(${i * 0.1}%)`
  },
  {
    id: 'blade_runner',
    name: 'Blade Runner 2049',
    category: 'Cinematic',
    color: '#d97706',
    desc: 'Bão cát cam vàng hậu tận thế',
    cssFilter: (i) => `sepia(${i * 0.55}%) saturate(${100 + i * 0.5}%) hue-rotate(-${i * 0.1}deg)`
  },
  {
    id: 'matrix_green',
    name: 'The Matrix',
    category: 'Cinematic',
    color: '#15803d',
    desc: 'Ánh xanh lục đặc trưng thế giới ma trận',
    cssFilter: (i) => `hue-rotate(${i * 0.35}deg) saturate(${100 + i * 0.3}%) contrast(${100 + i * 0.15}%)`
  },
  {
    id: 'wes_anderson',
    name: 'Wes Anderson Pastel',
    category: 'Cinematic',
    color: '#fbbf24',
    desc: 'Màu vàng phấn đối xứng phong cách Wes',
    cssFilter: (i) => `sepia(${i * 0.25}%) saturate(${100 + i * 0.2}%) brightness(${100 + i * 0.06}%)`
  },
  {
    id: 'godfather_sepia',
    name: 'Godfather Sepia',
    category: 'Cinematic',
    color: '#78350f',
    desc: 'Màu vàng nâu cổ kính Bố Già',
    cssFilter: (i) => `sepia(${i * 0.6}%) contrast(${100 + i * 0.2}%) brightness(${100 - i * 0.1}%)`
  },
  {
    id: 'noir_cinema',
    name: 'Noir Monochrome',
    category: 'Cinematic',
    color: '#52525b',
    desc: 'Đen trắng trinh thám bóng đổ sâu',
    cssFilter: (i) => `grayscale(${i}%) contrast(${100 + i * 0.35}%)`
  },

  // 4. SCENERY (Phong cảnh & Thiên nhiên)
  {
    id: 'forest_emerald',
    name: 'Forest Emerald',
    category: 'Scenery',
    color: '#059669',
    desc: 'Rừng xanh ngọc tươi mát',
    cssFilter: (i) => `saturate(${100 + i * 0.35}%) hue-rotate(-${i * 0.12}deg) contrast(${100 + i * 0.1}%)`
  },
  {
    id: 'deep_ocean',
    name: 'Deep Ocean Blue',
    category: 'Scenery',
    color: '#0369a1',
    desc: 'Đại dương xanh thẳm huyền bí',
    cssFilter: (i) => `contrast(${100 + i * 0.15}%) hue-rotate(${i * 0.2}deg) saturate(${100 + i * 0.2}%)`
  },
  {
    id: 'sunset_glow',
    name: 'Sunset Glow',
    category: 'Scenery',
    color: '#ea580c',
    desc: 'Rực rỡ ráng chiều hoàng hôn',
    cssFilter: (i) => `sepia(${i * 0.4}%) saturate(${100 + i * 0.45}%) contrast(${100 + i * 0.15}%)`
  },
  {
    id: 'desert_amber',
    name: 'Desert Amber',
    category: 'Scenery',
    color: '#d97706',
    desc: 'Sa mạc cát hổ phách vàng',
    cssFilter: (i) => `sepia(${i * 0.45}%) brightness(${100 + i * 0.08}%) contrast(${100 + i * 0.12}%)`
  },
  {
    id: 'autumn_maple',
    name: 'Autumn Maple',
    category: 'Scenery',
    color: '#c2410c',
    desc: 'Rừng lá phong mùa thu đỏ thắm',
    cssFilter: (i) => `saturate(${100 + i * 0.4}%) hue-rotate(-${i * 0.15}deg) contrast(${100 + i * 0.12}%)`
  },
  {
    id: 'snowy_mountain',
    name: 'Snowy Mountain',
    category: 'Scenery',
    color: '#bae6fd',
    desc: 'Núi tuyết băng giá tinh khiết',
    cssFilter: (i) => `brightness(${100 + i * 0.15}%) contrast(${100 + i * 0.12}%) saturate(${100 - i * 0.2}%)`
  },

  // 5. RETRO (Cổ điển & Hoài niệm)
  {
    id: 'kodachrome',
    name: 'Kodachrome 64',
    category: 'Retro',
    color: '#dc2626',
    desc: 'Màu phim Kodak kinh điển thập niên 70',
    cssFilter: (i) => `contrast(${100 + i * 0.22}%) saturate(${100 + i * 0.28}%) sepia(${i * 0.12}%)`
  },
  {
    id: 'polaroid',
    name: 'Polaroid 1980',
    category: 'Retro',
    color: '#facc15',
    desc: 'Ảnh chụp lấy liền màu ấm viền mờ',
    cssFilter: (i) => `brightness(${100 + i * 0.1}%) contrast(${100 - i * 0.12}%) sepia(${i * 0.22}%)`
  },
  {
    id: 'super_8',
    name: '70s Super 8',
    category: 'Retro',
    color: '#b45309',
    desc: 'Máy quay phim gia đình Super 8mm',
    cssFilter: (i) => `sepia(${i * 0.35}%) contrast(${100 + i * 0.18}%) brightness(${100 - i * 0.05}%)`
  },
  {
    id: 'technicolor',
    name: '35mm Technicolor',
    category: 'Retro',
    color: '#16a34a',
    desc: 'Màu phim nhựa rực rỡ thập niên 50',
    cssFilter: (i) => `saturate(${100 + i * 0.5}%) contrast(${100 + i * 0.25}%)`
  },
  {
    id: 'vintage_fade',
    name: 'Vintage Fade',
    category: 'Retro',
    color: '#ca8a04',
    desc: 'Màu phai cũ theo thời gian',
    cssFilter: (i) => `brightness(${100 + i * 0.08}%) contrast(${100 - i * 0.2}%) sepia(${i * 0.2}%)`
  },
  {
    id: 'old_newspaper',
    name: 'Old Newspaper',
    category: 'Retro',
    color: '#a1a1aa',
    desc: 'Trang báo giấy ngả vàng cổ xưa',
    cssFilter: (i) => `grayscale(${i * 0.75}%) sepia(${i * 0.4}%) brightness(${100 - i * 0.08}%)`
  },

  // 6. B&W (Đen trắng nghệ thuật)
  {
    id: 'noir_classic',
    name: 'Classic Noir B&W',
    category: 'B&W',
    color: '#ffffff',
    desc: 'Đen trắng cổ điển cân bằng hoàn hảo',
    cssFilter: (i) => `grayscale(${i}%) contrast(${100 + i * 0.1}%)`
  },
  {
    id: 'high_contrast_bw',
    name: 'High Contrast B&W',
    category: 'B&W',
    color: '#000000',
    desc: 'Đen trắng tương phản cực cao',
    cssFilter: (i) => `grayscale(${i}%) contrast(${100 + i * 0.55}%)`
  },
  {
    id: 'silky_silver',
    name: 'Silky Silver',
    category: 'B&W',
    color: '#d4d4d8',
    desc: 'Ánh bạc lụa mượt mà tinh tế',
    cssFilter: (i) => `grayscale(${i}%) brightness(${100 + i * 0.15}%) contrast(${100 - i * 0.05}%)`
  },
  {
    id: 'charcoal_dark',
    name: 'Charcoal Dark',
    category: 'B&W',
    color: '#27272a',
    desc: 'Màu than chì u tối mạnh mẽ',
    cssFilter: (i) => `grayscale(${i}%) brightness(${100 - i * 0.2}%) contrast(${100 + i * 0.2}%)`
  },
  {
    id: 'dramatic_shadow',
    name: 'Dramatic Shadow',
    category: 'B&W',
    color: '#3f3f46',
    desc: 'Bóng tối kịch tính, sắc độ sâu',
    cssFilter: (i) => `grayscale(${i}%) contrast(${100 + i * 0.4}%) brightness(${100 - i * 0.12}%)`
  },

  // 7. FOOD (Ẩm thực & Đồ uống)
  {
    id: 'warm_delicious',
    name: 'Warm Delicious',
    category: 'Food',
    color: '#ea580c',
    desc: 'Ấm áp, tôn màu món ăn hấp dẫn',
    cssFilter: (i) => `saturate(${100 + i * 0.4}%) sepia(${i * 0.18}%) brightness(${100 + i * 0.05}%)`
  },
  {
    id: 'juicy_berry',
    name: 'Juicy Berry',
    category: 'Food',
    color: '#e11d48',
    desc: 'Màu quả mọng đỏ ngọt ngào',
    cssFilter: (i) => `saturate(${100 + i * 0.45}%) hue-rotate(-${i * 0.08}deg) contrast(${100 + i * 0.12}%)`
  },
  {
    id: 'fresh_salad',
    name: 'Fresh Garden Salad',
    category: 'Food',
    color: '#22c55e',
    desc: 'Rau củ tươi xanh mát mắt',
    cssFilter: (i) => `saturate(${100 + i * 0.35}%) brightness(${100 + i * 0.06}%) hue-rotate(-${i * 0.1}deg)`
  },
  {
    id: 'espresso_cafe',
    name: 'Cafe Espresso',
    category: 'Food',
    color: '#713f12',
    desc: 'Cà phê nâu đậm đà quyến rũ',
    cssFilter: (i) => `sepia(${i * 0.45}%) contrast(${100 + i * 0.22}%) brightness(${100 - i * 0.08}%)`
  },
  {
    id: 'golden_crust',
    name: 'Golden Crust',
    category: 'Food',
    color: '#f59e0b',
    desc: 'Bánh mì vàng giòn thơm nức',
    cssFilter: (i) => `sepia(${i * 0.3}%) saturate(${100 + i * 0.35}%) brightness(${100 + i * 0.08}%)`
  }
];

