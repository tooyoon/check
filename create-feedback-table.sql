-- Feedback 테이블 생성
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- 기존 테이블 삭제 (있으면)
DROP TABLE IF EXISTS feedback CASCADE;

-- feedback 테이블 생성
CREATE TABLE feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'improvement', 'other')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    name TEXT,
    email TEXT,
    votes INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'rejected')),
    admin_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성

-- 모든 사용자가 피드백을 볼 수 있음
CREATE POLICY "Anyone can view feedback" ON feedback
    FOR SELECT USING (true);

-- 모든 사용자가 피드백을 작성할 수 있음 (로그인 안 해도 가능)
CREATE POLICY "Anyone can insert feedback" ON feedback
    FOR INSERT WITH CHECK (true);

-- 사용자는 자신의 피드백만 수정 가능
CREATE POLICY "Users can update own feedback" ON feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 피드백만 삭제 가능
CREATE POLICY "Users can delete own feedback" ON feedback
    FOR DELETE USING (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX idx_feedback_category ON feedback(category);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- 트리거: updated_at 자동 업데이트
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 샘플 데이터 (선택사항)
INSERT INTO feedback (category, title, content, email, votes, status) VALUES
    ('feature', '구글 캘린더 연동 기능', '구글 캘린더와 연동해서 일정을 관리할 수 있으면 좋겠습니다.', 'example1@gmail.com', 15, 'reviewing'),
    ('bug', '모바일에서 체크박스 클릭이 잘 안됨', '아이폰에서 체크박스를 클릭하면 가끔 반응이 없습니다.', null, 8, 'pending'),
    ('improvement', '다크 모드 지원', '눈이 편한 다크 모드를 추가해주세요.', 'example2@gmail.com', 23, 'pending'),
    ('feature', '팀 협업 기능', '여러 사람이 같은 프로젝트를 공유하고 협업할 수 있으면 좋겠습니다.', null, 12, 'pending'),
    ('bug', '새로고침 시 데이터 사라짐', '가끔 페이지 새로고침하면 작성한 내용이 사라집니다.', 'example3@gmail.com', 5, 'resolved');

-- 투표 기록 테이블 (선택사항 - 더 정확한 투표 추적을 원할 경우)
CREATE TABLE IF NOT EXISTS feedback_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(feedback_id, user_id)
);

-- RLS for votes table
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes" ON feedback_votes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON feedback_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their votes" ON feedback_votes
    FOR DELETE USING (auth.uid() = user_id);