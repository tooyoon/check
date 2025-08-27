-- Complete recreation of mindmaps table
-- WARNING: This will DELETE all existing mindmap data!
-- Only use this if you want to start fresh

-- Drop existing table and policies
DROP TABLE IF EXISTS mindmaps CASCADE;

-- Create new mindmap table
CREATE TABLE mindmaps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Mindmap',
    nodes JSONB NOT NULL DEFAULT '[]',
    connections JSONB NOT NULL DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_mindmaps_user_id ON mindmaps(user_id);
CREATE INDEX idx_mindmaps_updated_at ON mindmaps(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_mindmaps_updated_at 
    BEFORE UPDATE ON mindmaps
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verify table structure
SELECT 'Table created successfully!' as message;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mindmaps'
ORDER BY ordinal_position;