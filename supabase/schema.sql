-- Supabase Production Security Schema for ClipForge Desktop Web
-- Enables Row Level Security (RLS), Private Storage Buckets, and Least-Privilege Policies

-- 1. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    title TEXT NOT NULL,
    duration NUMERIC NOT NULL DEFAULT 10,
    aspect TEXT NOT NULL DEFAULT '9:16',
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects RLS Policies: Users can only select, insert, update, delete their own projects
CREATE POLICY "Users can only view their own projects"
    ON public.projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own projects"
    ON public.projects FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own projects"
    ON public.projects FOR DELETE
    USING (auth.uid() = user_id);

-- 2. MEDIA METADATA TABLE
CREATE TABLE IF NOT EXISTS public.media (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size BIGINT NOT NULL,
    storage_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on media
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Media RLS Policies: Users can only access their own media records
CREATE POLICY "Users can only view their own media"
    ON public.media FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own media"
    ON public.media FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own media"
    ON public.media FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own media"
    ON public.media FOR DELETE
    USING (auth.uid() = user_id);

-- 3. PRIVATE STORAGE BUCKET CONFIGURATION
-- Insert private bucket (public: false) for user media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'clipforge_vault',
    'clipforge_vault',
    false, -- Private bucket: access requires short-lived Signed URLs
    52428800, -- 50MB file size limit in bytes
    ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/webm', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800;

-- 4. STORAGE OBJECTS RLS POLICIES
-- Only authenticated users can access files in their personal folder within clipforge_vault
CREATE POLICY "Allow authenticated users to read their own vault files via Signed URL"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'clipforge_vault' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow authenticated users to upload to their own folder in vault"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'clipforge_vault' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Allow authenticated users to delete their own vault files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'clipforge_vault' AND (storage.foldername(name))[1] = auth.uid()::text);

