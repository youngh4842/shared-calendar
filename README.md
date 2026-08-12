# Shared Calendar

두 사람이 함께 사용하는 간단한 공유 캘린더 MVP입니다. Next.js App Router와 Route Handler로 화면과 REST API를 구성하고, Neon PostgreSQL을 데이터베이스로 사용합니다.

운영 배포 URL: [https://shared-calendar-mu.vercel.app](https://shared-calendar-mu.vercel.app)

## 주요 기능

- 월간 캘린더에서 A, B, 같이 일정을 함께 확인
- 일정 등록, 수정, 삭제
- 일정 구분: `A`, `B`, `COMMON`
- 확정 구분: `CONFIRMED`, `TENTATIVE`
- 메모는 선택 입력
- 스크롤 시 월 이동/년월 영역과 월~일 요일 영역이 함께 sticky 고정

## 최근 반영 내용

- FullCalendar 기본 헤더 대신 커스텀 캘린더 헤더를 사용하도록 수정
- `< 2026년 8월 >` 월 이동 영역과 `월 화 수 목 금 토 일` 요일 영역을 하나의 sticky header로 고정
- sticky 영역에 배경색과 z-index를 적용해 일정 카드가 위로 겹쳐 보이지 않도록 처리
- 일정 등록/수정 필수값을 명확화

필수값:

- 날짜 *
- 제목 *
- 일정 구분 *
- 확정 구분 *

선택값:

- 메모

Validation 순서:

1. 날짜
2. 제목
3. 일정 구분
4. 확정 구분
5. 정상인 경우 저장

API에서도 필수값이 누락되거나 허용되지 않는 값이 들어오면 `400 Bad Request`를 반환합니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

## 환경 변수

`.env.local` 파일을 만들고 Neon PostgreSQL 연결 문자열을 설정합니다.

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
```

`.env*` 파일은 `.gitignore`에 포함되어 Git에 커밋되지 않습니다. Vercel 배포 환경에서는 Project Settings의 Environment Variables에 동일한 `DATABASE_URL` 값을 등록해야 합니다.

## 데이터베이스

앱이 처음 API를 호출할 때 `schedules` 테이블을 `CREATE TABLE IF NOT EXISTS`로 자동 생성합니다. 수동으로 생성하려면 [db/schema.sql](db/schema.sql)을 Neon SQL Editor에서 실행할 수 있습니다.

핵심 제약 조건:

```sql
schedule_date DATE NOT NULL
title VARCHAR(200) NOT NULL
confirmation_status VARCHAR(10) NOT NULL
```

## API

- `GET /api/schedules?start=2026-08-01&end=2026-08-31`
- `POST /api/schedules`
- `GET /api/schedules/{id}`
- `PUT /api/schedules/{id}`
- `DELETE /api/schedules/{id}`

### POST/PUT 필수 필드

```json
{
  "scheduleDate": "2026-08-15",
  "title": "일정 제목",
  "scheduleType": "COMMON",
  "confirmationStatus": "CONFIRMED",
  "memo": ""
}
```

허용 값:

- `scheduleType`: `A`, `B`, `COMMON`
- `confirmationStatus`: `CONFIRMED`, `TENTATIVE`

Validation 메시지:

- 날짜 없음: `날짜를 선택해주세요.`
- 제목 없음 또는 공백만 입력: `제목을 입력해주세요.`
- 일정 구분 없음 또는 잘못된 값: `일정 구분을 선택해주세요.`
- 확정 구분 없음 또는 잘못된 값: `확정 여부를 선택해주세요.`

## 배포

GitHub `main` 브랜치에 push하면 Vercel production 배포가 자동으로 실행됩니다.

최근 확인된 배포:

- Commit: `4708ab5 fix: make calendar header sticky`
- Vercel 상태: `READY`
- Production URL: [https://shared-calendar-mu.vercel.app](https://shared-calendar-mu.vercel.app)

## 검증

로컬에서 다음 명령을 통과했습니다.

```bash
npm run lint
npm run build
```

운영 API에서도 다음 항목을 확인했습니다.

- 일정 조회 `GET /api/schedules` 정상 응답
- 날짜 누락 시 `400`
- 제목 공백 입력 시 `400`
- 일정 구분 누락 시 `400`
- 확정 구분 누락 시 `400`
- 메모 없이 정상 등록 가능
- 검증용 등록 일정 삭제 가능
