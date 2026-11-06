-- =============================================================================
-- CLIPFORGE - SUPABASE DATABASE & AUTH SCHEMA
-- Quản lý xác thực người dùng (Auth) và phân quyền Row Level Security (RLS)
-- =============================================================================

-- 1. Bảng lưu trữ Dự án (Projects) gán với tài khoản người dùng
CREATE TABLE IF NOT EXISTS public.clipforge_projects (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    duration NUMERIC NOT NULL DEFAULT 15,
    fps INTEGER NOT NULL DEFAULT 30,
    width INTEGER NOT NULL DEFAULT 1080,
    height INTEGER NOT NULL DEFAULT 1920,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Thêm cột user_id nếu bảng đã tồn tại từ trước mà chưa có
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'clipforge_projects' 
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.clipforge_projects 
            ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
    END IF;
END $$;

-- Index tối ưu hóa truy vấn danh sách dự án của từng người dùng
CREATE INDEX IF NOT EXISTS idx_clipforge_projects_user_updated 
    ON public.clipforge_projects (user_id, updated_at DESC);

-- 2. Bật Row Level Security (RLS)
ALTER TABLE public.clipforge_projects ENABLE ROW LEVEL SECURITY;

-- 3. Xóa các chính sách cũ (nếu có) để nâng cấp lên chuẩn bảo mật Auth
DROP POLICY IF EXISTS "Public Access Projects" ON public.clipforge_projects;
DROP POLICY IF EXISTS "Public Read Projects" ON public.clipforge_projects;
DROP POLICY IF EXISTS "Public Insert Projects" ON public.clipforge_projects;
DROP POLICY IF EXISTS "Public Update Projects" ON public.clipforge_projects;
DROP POLICY IF EXISTS "Public Delete Projects" ON public.clipforge_projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.clipforge_projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.clipforge_projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.clipforge_projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.clipforge_projects;

-- 4. Chính sách bảo mật nghiêm ngặt (Strict RLS Policies)
-- Chỉ người dùng đã đăng nhập (TO authenticated) và sở hữu dòng dữ liệu (auth.uid() = user_id) mới được xem
CREATE POLICY "Users can view their own projects" ON public.clipforge_projects
    FOR SELECT 
    TO authenticated
    USING ((select auth.uid()) = user_id);

-- Chỉ cho phép chèn bản ghi với user_id của chính mình
CREATE POLICY "Users can insert their own projects" ON public.clipforge_projects
    FOR INSERT 
    TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

-- Chỉ cho phép cập nhật bản ghi của chính mình (kiểm tra cả USING và WITH CHECK để tránh IDOR / BOLA)
CREATE POLICY "Users can update their own projects" ON public.clipforge_projects
    FOR UPDATE 
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

-- Chỉ cho phép xóa bản ghi của chính mình
CREATE POLICY "Users can delete their own projects" ON public.clipforge_projects
    FOR DELETE 
    TO authenticated
    USING ((select auth.uid()) = user_id);
