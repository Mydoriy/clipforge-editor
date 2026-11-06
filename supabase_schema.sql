-- =============================================================================
-- CLIPFORGE - SUPABASE DATABASE SCHEMA
-- Quản lý dữ liệu dự án video ngắn 9:16 và mẫu thiết kế trên Supabase Postgres
-- =============================================================================

-- 1. Bảng lưu trữ Dự án (Projects)
CREATE TABLE IF NOT EXISTS public.clipforge_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    duration NUMERIC NOT NULL DEFAULT 15,
    fps INTEGER NOT NULL DEFAULT 30,
    width INTEGER NOT NULL DEFAULT 1080,
    height INTEGER NOT NULL DEFAULT 1920,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index tối ưu truy vấn sắp xếp theo thời gian chỉnh sửa
CREATE INDEX IF NOT EXISTS idx_clipforge_projects_updated_at 
    ON public.clipforge_projects (updated_at DESC);

-- 2. Bảng lưu trữ Mẫu thiết kế (Templates)
CREATE TABLE IF NOT EXISTS public.clipforge_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    slots JSONB NOT NULL DEFAULT '[]'::jsonb,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Bật Row Level Security (RLS)
ALTER TABLE public.clipforge_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipforge_templates ENABLE ROW LEVEL SECURITY;

-- 4. Chính sách bảo mật (RLS Policies)
-- Cho phép đọc / ghi dự án trực tiếp qua Supabase Anon Key (client-side)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clipforge_projects' AND policyname = 'Public Access Projects'
    ) THEN
        CREATE POLICY "Public Access Projects" ON public.clipforge_projects
            FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clipforge_templates' AND policyname = 'Public Access Templates'
    ) THEN
        CREATE POLICY "Public Access Templates" ON public.clipforge_templates
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

