-- Simple version for creating mindmap table
-- Run this in Supabase SQL Editor

-- Create mindmap table
CREATE TABLE IF NOT EXISTS mindmaps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Mindmap',
    nodes JSONB NOT NULL DEFAULT '[]',
    connections JSONB NOT NULL DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_public BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mindmaps_user_id ON mindmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_mindmaps_updated_at ON mindmaps(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can insert own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can update own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can delete own mindmaps" ON mindmaps;

-- Create RLS policies
-- Users can see their own mindmaps or public mindmaps
CREATE POLICY "Users can view own mindmaps" ON mindmaps
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

-- Users can insert their own mindmaps
CREATE POLICY "Users can insert own mindmaps" ON mindmaps
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own mindmaps
CREATE POLICY "Users can update own mindmaps" ON mindmaps
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own mindmaps
CREATE POLICY "Users can delete own mindmaps" ON mindmaps
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_mindmaps_updated_at ON mindmaps;
CREATE TRIGGER update_mindmaps_updated_at 
    BEFORE UPDATE ON mindmaps
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();