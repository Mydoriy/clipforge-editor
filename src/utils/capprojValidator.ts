import { z } from 'zod';

// Maximum allowed .capproj JSON file size (50MB) to prevent denial-of-service
export const MAX_CAPPROJ_SIZE_BYTES = 50 * 1024 * 1024;

// Single Timeline Clip Schema
export const ClipSchema = z.object({
  id: z.string().min(1),
  track: z.string().min(1),
  name: z.string().optional().default('Clip'),
  start: z.number().nonnegative(),
  duration: z.number().positive(),
  type: z.enum(['video', 'audio', 'text', 'image', 'sticker', 'effect', 'filter', 'adjustment']).or(z.string()),
  inPoint: z.number().nonnegative().optional(),
  outPoint: z.number().nonnegative().optional(),
  speed: z.number().positive().optional().default(1),
  volume: z.number().min(0).max(2).optional().default(1),
  opacity: z.number().min(0).max(1).optional().default(1),
  src: z.string().optional(),
  mediaId: z.string().optional(),
  text: z.string().optional(),
  scale: z.number().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  rotation: z.number().optional(),
  filter: z.any().optional(),
  adjustments: z.record(z.string(), z.number()).optional(),
  effects: z.array(z.any()).optional(),
  locked: z.boolean().optional(),
  reverse: z.boolean().optional()
}).passthrough();

// Single Project Schema
export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  title: z.string().min(1),
  width: z.number().int().positive().optional().default(1080),
  height: z.number().int().positive().optional().default(1920),
  fps: z.number().int().positive().optional().default(30),
  duration: z.number().nonnegative(),
  thumbnail: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  isDeleted: z.boolean().optional().default(false),
  settings: z.record(z.string(), z.any()).optional(),
  timelines: z.array(z.any()).optional(),
  activeTimelineId: z.string().optional(),
  tracksData: z.object({
    clips: z.array(ClipSchema).default([])
  }).optional().default({ clips: [] })
}).passthrough();

// Multi-project backup bundle schema
export const CapprojPackageSchema = z.object({
  app: z.string().optional(),
  version: z.string().or(z.number()),
  exportedAt: z.string().optional(),
  projects: z.array(ProjectSchema).min(1),
  mediaCount: z.number().optional()
}).passthrough();

export type ValidatedProject = z.infer<typeof ProjectSchema>;
export type ValidatedPackage = z.infer<typeof CapprojPackageSchema>;

export interface ValidationResult {
  valid: boolean;
  type?: 'single' | 'package';
  project?: ValidatedProject;
  projects?: ValidatedProject[];
  error?: string;
}

// Synchronous / JSON object validator
export function validateCapprojData(json: unknown): ValidationResult {
  if (!json || typeof json !== 'object') {
    return { valid: false, error: 'Dữ liệu không phải là một đối tượng JSON hợp lệ' };
  }

  // 1. Try parsing as multi-project package
  const pkgParsed = CapprojPackageSchema.safeParse(json);
  if (pkgParsed.success) {
    return {
      valid: true,
      type: 'package',
      projects: pkgParsed.data.projects
    };
  }

  // 2. Try parsing as single project
  const singleParsed = ProjectSchema.safeParse(json);
  if (singleParsed.success) {
    return {
      valid: true,
      type: 'single',
      project: singleParsed.data,
      projects: [singleParsed.data]
    };
  }

  // 3. Return informative error
  const issues = (singleParsed.error?.issues || pkgParsed.error?.issues || [])
    .slice(0, 3)
    .map((iss) => `${iss.path.join('.')}: ${iss.message}`)
    .join('; ');

  return {
    valid: false,
    error: `Cấu trúc file .capproj không hợp lệ hoặc thiếu trường bắt buộc: ${issues || 'Sai định dạng'}`
  };
}

// Asynchronous File validator with size & safe JSON parsing check
export async function validateCapprojFile(file: File): Promise<ValidationResult> {
  // Check file size limit
  if (file.size > MAX_CAPPROJ_SIZE_BYTES) {
    return {
      valid: false,
      error: `Kích thước tệp quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Giới hạn tối đa cho phép là 50MB.`
    };
  }

  try {
    const text = await file.text();
    // Pure JSON.parse only - never evaluates script
    const data = JSON.parse(text);
    return validateCapprojData(data);
  } catch (err: any) {
    return {
      valid: false,
      error: `Tệp hỏng hoặc không thể đọc cú pháp JSON: ${err.message}`
    };
  }
}
