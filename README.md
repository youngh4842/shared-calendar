# 우리 캘린더

A와 B가 함께 쓰는 2인용 공유 캘린더 MVP입니다. Next.js Route Handler가 화면과 REST API를 모두 담당하고, Neon PostgreSQL의 무료 플랜을 데이터베이스로 사용합니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 환경 변수

`.env.local` 파일을 만들고 Neon PostgreSQL 연결 문자열을 넣습니다.

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
```

`.env*` 파일은 `.gitignore`에 포함되어 Git에 커밋되지 않습니다. Vercel 배포 시에는 Project Settings의 Environment Variables에 같은 값을 등록합니다.

## 데이터베이스

앱이 처음 API를 호출할 때 `schedules` 테이블을 `CREATE TABLE IF NOT EXISTS`로 자동 생성합니다. 수동으로 만들고 싶다면 [db/schema.sql](db/schema.sql)을 Neon SQL Editor에서 실행해도 됩니다.

## API

- `GET /api/schedules?start=2026-08-01&end=2026-09-01`
- `POST /api/schedules`
- `GET /api/schedules/{id}`
- `PUT /api/schedules/{id}`
- `DELETE /api/schedules/{id}`

날짜와 시간은 한국 시간(`Asia/Seoul`) 기준 입력 흐름에 맞춰 처리합니다.
