# TodoMaster Supabase 설정 가이드

## 🚀 빠른 시작

### 1. Supabase 대시보드 설정

1. [Supabase Dashboard](https://app.supabase.com/project/oryaquouelpqwzarhjdn) 접속
2. **Authentication → Providers** 메뉴로 이동
3. **Email** 프로바이더 활성화 (테스트용)
4. **Google** 프로바이더 활성화 (아래 설정 필요)

### 2. Google OAuth 설정

#### Google Cloud Console 설정:
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **APIs & Services → Credentials** 이동
4. **Create Credentials → OAuth client ID** 클릭
5. 설정:
   - Application type: **Web application**
   - Name: **TodoMaster**
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     http://127.0.0.1:3000
     https://your-netlify-app.netlify.app
     ```
   - Authorized redirect URIs:
     ```
     https://oryaquouelpqwzarhjdn.supabase.co/auth/v1/callback
     ```
6. **Create** 클릭 후 Client ID와 Client Secret 복사

#### Supabase에 Google 설정 입력:
1. Supabase Dashboard → Authentication → Providers → Google
2. 입력:
   - **Client ID**: (위에서 복사한 값)
   - **Client Secret**: (위에서 복사한 값)
3. **Save** 클릭

### 3. 데이터베이스 테이블 생성

1. Supabase Dashboard → **SQL Editor** 이동
2. **New query** 클릭
3. `database-schema.sql` 파일의 전체 내용 복사/붙여넣기
4. **Run** 클릭

### 4. URL 설정

1. Supabase Dashboard → **Settings → API**
2. **Site URL** 설정:
   - 로컬 테스트: `http://localhost:3000`
   - Netlify 배포 후: `https://your-app.netlify.app`
3. **Redirect URLs** 추가:
   ```
   http://localhost:3000
   http://127.0.0.1:3000
   https://your-app.netlify.app
   ```

### 5. 로컬 테스트 서버 실행

파일을 직접 열면 CORS 에러가 발생합니다. 로컬 서버를 실행하세요:

#### Python (가장 간단):
```bash
# Python 3
python -m http.server 3000

# Python 2
python -m SimpleHTTPServer 3000
```

#### Node.js:
```bash
# http-server 설치
npm install -g http-server

# 실행
http-server -p 3000
```

#### VS Code:
Live Server 확장 프로그램 설치 후 index.html 우클릭 → "Open with Live Server"

### 6. 테스트

1. 브라우저에서 `http://localhost:3000` 접속
2. Google 로그인 버튼 클릭
3. Google 계정으로 로그인
4. 자동으로 앱으로 리다이렉트

## 🔧 문제 해결

### "Unsupported provider" 에러:
- Supabase Dashboard에서 Google 프로바이더가 활성화되어 있는지 확인
- Client ID와 Secret이 올바르게 입력되었는지 확인

### CORS 에러:
- 파일을 직접 열지 말고 로컬 서버를 통해 접속
- Supabase Dashboard의 URL 설정 확인

### 로그인 후 리다이렉트 안됨:
- Authorized redirect URIs 확인
- Site URL 설정 확인

## 📱 Netlify 배포

1. Netlify에 배포 후 도메인 확인
2. Google Cloud Console에서 Authorized origins과 redirect URIs에 Netlify 도메인 추가
3. Supabase Dashboard에서 Site URL과 Redirect URLs 업데이트

## 🔐 보안 주의사항

- `supabase-config.js`의 ANON KEY는 공개되어도 안전 (RLS 정책으로 보호)
- 하지만 SERVICE KEY는 절대 프론트엔드에 노출하지 마세요
- 관리자 기능은 서버사이드 함수(Supabase Edge Functions)로 구현 권장

## 📧 이메일 로그인 (테스트용)

Google 설정이 복잡하다면 먼저 이메일 로그인으로 테스트:

1. Supabase Dashboard → Authentication → Providers → Email 활성화
2. `supabase-config.js` 수정:

```javascript
// Email 로그인 추가
async signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    return { data, error };
}

// Email 회원가입 추가  
async signUpWithEmail(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });
    return { data, error };
}
```

## 🎉 완료!

모든 설정이 완료되면:
- ✅ 모든 기기에서 데이터 동기화
- ✅ Google 계정으로 로그인
- ✅ 실시간 업데이트
- ✅ 관리자 패널 접근 (role이 admin인 사용자)