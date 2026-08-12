# Shared Calendar

두 사람이 함께 사용하는 간단한 공유 캘린더 MVP입니다. Next.js App Router와 Route Handler로 화면과 REST API를 구성하고, Neon PostgreSQL을 데이터베이스로 사용합니다.

운영 배포 URL: [https://shared-calendar-mu.vercel.app](https://shared-calendar-mu.vercel.app)

## 주요 기능

- 월간 캘린더에서 A, B, 같이 일정을 함께 확인
- 일정 등록, 수정, 삭제
- 하루 일정과 기간 일정 등록
- 일정 구분: `A`, `B`, `COMMON`
- 확정 구분: `CONFIRMED`, `TENTATIVE`
- 메모는 선택 입력
- 스크롤 시 월 이동/년월 영역과 월~일 요일 영역이 함께 sticky 고정
- `/settings`에서 일정 구분별 표시 이름과 색상 변경
- 일요일/공휴일은 빨간색, 토요일은 파란색으로 표시
- 대한민국 공휴일명을 날짜 셀 안에 작게 표시

## 최근 반영 내용

- 일정 날짜 구조를 `schedule_date`에서 `start_date`, `end_date`로 변경
- 기존 `schedule_date` 데이터는 삭제하지 않고 `start_date = schedule_date`, `end_date = schedule_date`로 자동 마이그레이션
- FullCalendar 기간 일정은 하나의 row로 저장하고, 화면에서는 연결된 일정으로 표시
- 월 이동 영역, 설정 버튼, 월~일 요일 영역을 하나의 sticky header로 고정
- 일정 등록/수정 필수값을 명확화
- `calendar_settings` 테이블과 `/api/settings`를 추가해 표시 이름과 색상 설정을 저장
- `/api/holidays`를 추가해 대한민국 공휴일 표시

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
HOLIDAY_API_KEY=""
```

`.env*` 파일은 `.gitignore`에 포함되어 Git에 커밋되지 않습니다. Vercel 배포 환경에서는 Project Settings의 Environment Variables에 동일한 `DATABASE_URL` 값을 등록해야 합니다.

`HOLIDAY_API_KEY`는 공공데이터포털 한국천문연구원 특일 정보 OpenAPI 키입니다. 값이 없거나 API 호출에 실패해도 캘린더와 일정 CRUD는 정상 동작하며, 공휴일 표시만 fallback 또는 빈 목록으로 처리됩니다.

## 데이터베이스

앱이 처음 API를 호출할 때 `schedules` 테이블을 `CREATE TABLE IF NOT EXISTS`로 자동 생성합니다. 수동으로 생성하려면 [db/schema.sql](db/schema.sql)을 Neon SQL Editor에서 실행할 수 있습니다.

핵심 제약 조건:

```sql
start_date DATE NOT NULL
end_date DATE NOT NULL
title VARCHAR(200) NOT NULL
confirmation_status VARCHAR(10) NOT NULL
```

## API

- `GET /api/schedules?start=2026-08-01&end=2026-08-31`
- `POST /api/schedules`
- `GET /api/schedules/{id}`
- `PUT /api/schedules/{id}`
- `DELETE /api/schedules/{id}`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/holidays?year=2026`
- `GET /api/holidays?year=2026&month=8`

### POST/PUT 필수 필드

```json
{
  "startDate": "2026-08-15",
  "endDate": "2026-08-17",
  "title": "일정 제목",
  "scheduleType": "COMMON",
  "confirmationStatus": "CONFIRMED",
  "memo": ""
}
```

허용 값:

- `scheduleType`: `A`, `B`, `COMMON`
- `confirmationStatus`: `CONFIRMED`, `TENTATIVE`

기간 조건:

- 하루 일정: `startDate`와 `endDate`를 같은 날짜로 저장
- 기간 일정: 사용자가 선택한 실제 종료일을 `endDate`로 저장
- API에서는 `endDate >= startDate` 조건을 검증

Validation 메시지:

- 날짜 없음: `날짜를 선택해주세요.`
- 제목 없음 또는 공백만 입력: `제목을 입력해주세요.`
- 일정 구분 없음 또는 잘못된 값: `일정 구분을 선택해주세요.`
- 확정 구분 없음 또는 잘못된 값: `확정 여부를 선택해주세요.`
- 종료일이 시작일보다 빠름: `종료일은 시작일 이후 날짜를 선택해주세요.`

### Settings API

```json
[
  {
    "scheduleType": "A",
    "displayName": "A",
    "colorKey": "sky"
  },
  {
    "scheduleType": "B",
    "displayName": "B",
    "colorKey": "purple"
  },
  {
    "scheduleType": "COMMON",
    "displayName": "같이",
    "colorKey": "lime"
  }
]
```

허용 색상:

- `sky`
- `purple`
- `pink`
- `yellow`
- `lime`
- `gray`

### Holidays API

응답 형식:

```json
[
  {
    "date": "2026-08-15",
    "name": "광복절",
    "isHoliday": true
  }
]
```

공휴일은 `schedules` 테이블에 저장하지 않고 화면 표시용 데이터로만 사용합니다. API 호출 실패 시 `[]`를 반환해 기존 일정 기능에 영향을 주지 않습니다.

## 배포

GitHub `main` 브랜치에 push하면 Vercel production 배포가 자동으로 실행됩니다.

Production URL: [https://shared-calendar-mu.vercel.app](https://shared-calendar-mu.vercel.app)

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
