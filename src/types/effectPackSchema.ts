/**
 * Zod Schema Validation for EffectPack (.capfx) and EffectSpec Items
 * ============================================================================
 * Enforces declarative integrity, bounds on shader passes, thumbnail size,
 * and deterministic parameters.
 * ============================================================================
 */

import { z } from 'zod';
import type { EffectPack, EffectSpecItem } from './effectPack.ts';

// 1. Param Schema Zod
export const ParamSchemaItemZod = z.object({
  type: z.enum(['number', 'boolean', 'color', 'select', 'vec2', 'vec4']),
  label: z
    .object({
      vi: z.string(),
      en: z.string(),
    })
    .optional(),
  default: z.any(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  easing: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut']).optional(),
  options: z
    .array(
      z.object({
        label: z.object({ vi: z.string(), en: z.string() }),
        value: z.any(),
      })
    )
    .optional(),
});

export const ParamSchemaZod = z.record(z.string(), ParamSchemaItemZod);

// 2. Shader Spec Zod
export const ShaderUniformDefZod = z.object({
  type: z.enum(['float', 'int', 'vec2', 'vec3', 'vec4', 'sampler2D']),
  default: z.any().optional(),
  label: z.object({ vi: z.string(), en: z.string() }).optional(),
});

export const ShaderSpecZod = z.object({
  language: z.literal('glsl300es'),
  fragmentBody: z.string().min(1, 'fragmentBody không được rỗng'),
  uniforms: z.record(z.string(), ShaderUniformDefZod).optional(),
  passes: z.number().int().min(1).max(3, 'Số passes shader tối đa là 3').default(1).optional(),
});

// 3. Composite Graph Zod
export const GraphNodeZod = z.object({
  id: z.string(),
  ref: z.string(), // namespaced id
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export const GraphEdgeZod = z.object({
  from: z.string(),
  to: z.string(),
  port: z.string().optional(),
});

export const EffectGraphZod = z.object({
  nodes: z.array(GraphNodeZod),
  edges: z.array(GraphEdgeZod),
});

// 4. Asset references
export const ItemAssetsZod = z.record(z.string(), z.string()).optional();

// 5. EffectSpec Item Zod
export const EffectSpecItemZod = z.object({
  id: z.string().regex(/^[a-z0-9-_]+$/i, 'Item ID phải là slug hợp lệ (chữ, số, gạch ngang, gạch dưới)'),
  kind: z.enum([
    'transition',
    'effect',
    'filter',
    'animation',
    'textPreset',
    'sticker',
    'sfx',
    'captionStyle',
    'template',
  ]),
  paramSchema: ParamSchemaZod.default({}),
  shader: ShaderSpecZod.optional(),
  graph: EffectGraphZod.optional(),
  assets: ItemAssetsZod,
  tags: z.array(z.string()).default([]),
  aliases: z.object({
    vi: z.array(z.string()).default([]),
    en: z.array(z.string()).default([]),
  }),
  preview: z.object({
    thumb: z.string().refine(
      (val) => {
        // If data URL base64, check size <= 8KB (8192 bytes approx ~11000 base64 chars)
        if (val.startsWith('data:')) {
          const base64Content = val.split(',')[1] || '';
          const byteLength = (base64Content.length * 3) / 4;
          return byteLength <= 8192;
        }
        return true; // Path reference validated against assets
      },
      { message: 'Thumbnail ảnh WebP xem trước phải ≤ 8KB' }
    ),
    loopFrames: z.number().int().min(1).optional(),
  }),
  requires: z
    .object({
      webgl2: z.boolean().default(true),
      floatTextures: z.boolean().optional(),
      webgpu: z.boolean().optional(),
    })
    .optional(),
  cost: z.object({
    samplesPerPixel: z.number().int().min(1).default(1),
    passes: z.number().int().min(1).max(3).default(1),
  }),
  fallbackId: z.string().optional(),
  deprecatedBy: z.string().optional(),
  since: z.string().default('1.0.0'),
});

// 6. EffectPack Zod
export const EffectPackZod = z.object({
  formatVersion: z.union([z.string(), z.number()]),
  id: z.string().regex(/^[a-z0-9.-]+$/i, 'Pack ID phải là slug hợp lệ (vd: official.glitch-pack)'),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version phải theo chuẩn SemVer (vd: 1.0.0)'),
  name: z.object({
    vi: z.string().min(1),
    en: z.string().min(1),
  }),
  author: z.string().min(1),
  license: z.string().min(1), // SPDX
  redistributable: z.boolean().default(true),
  sourceUrl: z.string().url().optional(),
  createdAt: z.string(),
  items: z.array(EffectSpecItemZod).min(1, 'Gói EffectPack phải chứa ít nhất 1 item'),
  assets: z.array(
    z.object({
      path: z.string(),
      sha256: z.string(),
      size: z.number().int().nonnegative(),
    })
  ).default([]),
  signature: z.string().optional(),
});

/**
 * Validates unknown data against the EffectPack specification
 */
export function validateEffectPack(data: unknown): {
  success: boolean;
  data?: EffectPack;
  errors?: string[];
} {
  const result = EffectPackZod.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as EffectPack };
  }
  const issues = result.error.issues || (result.error as any).errors || [];
  const errors = issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
  return { success: false, errors };
}
