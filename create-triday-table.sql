-- TriDay Calendar 테이블 생성
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- 기존 테이블 삭제 (있으면)
DROP TABLE IF EXISTS triday_tasks CASCADE;
DROP TABLE IF EXISTS triday_routines CASCADE;
DROP TABLE IF EXISTS triday_goals CASCADE;
DROP TABLE IF EXISTS triday_settings CASCADE;

-- 1. TriDay 작업 테이블
CREATE TABLE triday_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    section TEXT NOT NULL CHECK (section IN ('morning', 'lunch', 'evening')),
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    icon TEXT,
    task_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 루틴 관리 테이블
CREATE TABLE triday_routines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    time TEXT NOT NULL CHECK (time IN ('morning', 'lunch', 'evening')),
    icon TEXT DEFAULT '📌',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 목표 관리 테이블
CREATE TABLE triday_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('yearly', 'monthly', 'weekly')),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, goal_type)
);

-- 4. 시간 설정 테이블
CREATE TABLE triday_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    morning_start TIME DEFAULT '06:00',
    morning_end TIME DEFAULT '12:00',
    lunch_start TIME DEFAULT '12:00',
    lunch_end TIME DEFAULT '18:00',
    evening_start TIME DEFAULT '18:00',
    evening_end TIME DEFAULT '24:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- RLS (Row Level Security) 활성화
ALTER TABLE triday_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE triday_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE triday_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE triday_settings ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성

-- Tasks 정책
CREATE POLICY "Users can view own triday tasks" ON triday_tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own triday tasks" ON triday_tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own triday tasks" ON triday_tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own triday tasks" ON triday_tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Routines 정책
CREATE POLICY "Users can view own routines" ON triday_routines
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routines" ON triday_routines
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines" ON triday_routines
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routines" ON triday_routines
    FOR DELETE USING (auth.uid() = user_id);

-- Goals 정책
CREATE POLICY "Users can view own goals" ON triday_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON triday_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON triday_goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON triday_goals
    FOR DELETE USING (auth.uid() = user_id);

-- Settings 정책
CREATE POLICY "Users can view own settings" ON triday_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON triday_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON triday_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX idx_triday_tasks_user_date ON triday_tasks(user_id, task_date);
CREATE INDEX idx_triday_tasks_section ON triday_tasks(section);
CREATE INDEX idx_triday_routines_user ON triday_routines(user_id);
CREATE INDEX idx_triday_goals_user ON triday_goals(user_id);

-- 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_triday_tasks_updated_at BEFORE UPDATE ON triday_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_triday_goals_updated_at BEFORE UPDATE ON triday_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_triday_settings_updated_at BEFORE UPDATE ON triday_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();