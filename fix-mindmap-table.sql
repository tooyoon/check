-- Fix existing mindmaps table
-- Run this if you already have a mindmaps table but getting errors

-- First, check if table exists and add missing columns
ALTER TABLE mindmaps ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE mindmaps ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE mindmaps ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Untitled Mindmap';

-- Ensure all columns have proper defaults
ALTER TABLE mindmaps ALTER COLUMN nodes SET DEFAULT '[]';
ALTER TABLE mindmaps ALTER COLUMN connections SET DEFAULT '[]';
ALTER TABLE mindmaps ALTER COLUMN title SET DEFAULT 'Untitled Mindmap';
ALTER TABLE mindmaps ALTER COLUMN title SET NOT NULL;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_mindmaps_user_id ON mindmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_mindmaps_updated_at ON mindmaps(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can insert own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can update own mindmaps" ON mindmaps;
DROP POLICY IF EXISTS "Users can delete own mindmaps" ON mindmaps;

-- Recreate policies with proper column reference
-- Users can see their own mindmaps
CREATE POLICY "Users can view own mindmaps" ON mindmaps
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own mindmaps
CREATE POLICY "Users can insert own mindmaps" ON mindmaps
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own mindmaps
CREATE POLICY "Users can update own mindmaps" ON mindmaps
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own mindmaps
CREATE POLICY "Users can delete own mindmaps" ON mindmaps
    FOR DELETE USING (auth.uid() = user_id);

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_mindmaps_updated_at ON mindmaps;
CREATE TRIGGER update_mindmaps_updated_at 
    BEFORE UPDATE ON mindmaps
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Show table structure for verification
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mindmaps'
ORDER BY ordinal_position;