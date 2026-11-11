# Project Context

이 문서는 다른 개발 환경이나 다른 AI 개발 에이전트가 프로젝트를 이어서 작업할 때 필요한 핵심 맥락을 정리한 문서입니다.

## 프로젝트 목적

`Between Days`는 소규모 사용자가 함께 일정을 확인하고 관리하기 위한 공유 캘린더 MVP입니다.

복잡한 계정/권한 시스템보다 실제 사용에 필요한 공유 일정 관리 경험을 먼저 구현하는 것을 목표로 합니다. 사용자는 월간 캘린더에서 일정을 등록, 수정, 삭제할 수 있고, 일정 구분, 확정 여부, 색상, 메모, 기간 일정을 함께 관리할 수 있습니다.

현재 프로젝트의 핵심 목적은 다음과 같습니다.

- 함께 보는 월간 캘린더 제공
- A, B, COMMON 기준의 일정 구분
- 하루 일정과 기간 일정 모두 지원
- 확정 일정과 미정 일정 구분
- 공휴일, D-Day, 공유 체크리스트, 날짜 꾸미기 등 생활형 보조 기능 제공
- Vercel + Neon PostgreSQL 환경에서 실제 사용 가능한 MVP 유지

## 현재 구현 상태

### 기술 스택

- Next.js App Router
- React Client Components
- TypeScript
- FullCalendar
- Neon PostgreSQL
- Tailwind CSS and global CSS
- Vercel deployment

### 구현된 화면

- `/`
  - 월간 공유 캘린더
  - 일정 등록/상세/수정 모달
  - 날짜 꾸미기 모드
  - 공유 데이터 새로고침
  - D-Day 영역
  - 공유 체크리스트 영역

- `/settings`
  - A, B, COMMON 일정 구분별 표시 이름 변경
  - 일정 구분별 기본 색상 변경

### 구현된 API

- `GET /api/schedules`
- `POST /api/schedules`
- `GET /api/schedules/[id]`
- `PUT /api/schedules/[id]`
- `DELETE /api/schedules/[id]`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/holidays`
- `GET /api/decorations`
- `POST /api/decorations`
- `DELETE /api/decorations`
- `GET /api/checklist`
- `POST /api/checklist`
- `PUT /api/checklist/[id]`
- `DELETE /api/checklist/[id]`
- `PUT /api/checklist/reorder`
- `GET /api/ddays`
- `POST /api/ddays`
- `PUT /api/ddays/[id]`
- `DELETE /api/ddays/[id]`

### 주요 테이블

- `schedules`
  - 일정 데이터
  - `start_date`, `end_date` 기반 기간 일정 구조

- `calendar_settings`
  - A, B, COMMON의 표시 이름과 기본 색상

- `date_decorations`
  - 사용자가 꾸민 날짜

- `checklist_items`
  - 공유 체크리스트

- `dday_items`
  - D-Day 항목

## 주요 결정사항

### 1. 계정 시스템 없이 MVP 우선 구현

현재는 로그인, 사용자 초대, 권한 관리를 구현하지 않았습니다.

MVP 단계에서는 공유 캘린더의 핵심 사용성을 빠르게 검증하는 것이 우선이므로 A, B, COMMON이라는 고정 일정 구분을 사용합니다. 대신 `/settings`에서 표시 이름과 색상을 변경할 수 있게 하여 최소한의 유연성을 제공합니다.

### 2. 일정은 기간 기반으로 저장

일정은 단일 날짜가 아니라 `start_date`, `end_date`로 저장합니다.

하루 일정은 `start_date`와 `end_date`가 같은 일정으로 처리합니다. 일정 조회 시에는 현재 캘린더 화면 범위와 일정 기간이 겹치는지 확인합니다.

```sql
WHERE start_date <= 조회_종료일
  AND end_date >= 조회_시작일
```

이 구조는 한 달을 넘어가는 일정도 안정적으로 표시할 수 있게 합니다.

### 3. 런타임 DB 보정 로직 유지

`src/lib/db.ts`에는 테이블 생성, 컬럼 추가, legacy 데이터 보정, 제약 조건 추가, 인덱스 생성 로직이 포함되어 있습니다.

이 로직은 배포 환경에서 DB 스키마가 최신 코드와 다를 때 앱이 깨지는 위험을 줄이기 위한 것입니다. 명시적인 마이그레이션 도구를 도입하기 전까지는 함부로 제거하지 않습니다.

### 4. 공휴일은 DB에 저장하지 않음

공휴일은 사용자가 직접 관리하는 데이터가 아니므로 DB에 저장하지 않고 `/api/holidays`에서 화면 표시용으로 제공합니다.

`HOLIDAY_API_KEY`가 있으면 KASI 공공데이터 API를 사용하고, 없거나 실패하면 Nager.Date와 고정 공휴일 fallback을 사용합니다. 외부 API 실패 시에도 일정 CRUD는 정상 동작해야 합니다.

### 5. 체크리스트 정렬은 같은 완료 상태 내에서만 허용

공유 체크리스트는 미완료 항목과 완료 항목을 분리해서 보여줍니다.

정렬도 같은 완료 상태의 항목끼리만 허용합니다. 이렇게 하면 진행 중인 항목과 완료 항목이 섞이지 않고, 사용자가 현재 해야 할 일을 쉽게 확인할 수 있습니다.

## 현재 작업 중

현재 기능 개발보다는 프로젝트를 다른 개발 환경에서도 이어서 작업할 수 있도록 문서화와 에이전트 규칙을 정리하는 단계입니다.

진행 중인 정리 작업은 다음과 같습니다.

- `docs/PROJECT_CONTEXT.md` 작성
- `AGENTS.md`에 프로젝트 전용 개발 규칙 추가
- 포트폴리오용 프로젝트 설명 정리

## 다음 작업

우선순위가 높은 다음 작업 후보는 다음과 같습니다.

1. 사용자 인증 추가
   - 로그인
   - 사용자별 일정 구분
   - 공유 캘린더 초대

2. 권한 모델 설계
   - 캘린더 소유자
   - 편집 가능 사용자
   - 읽기 전용 사용자

3. 반복 일정 기능
   - 매주/매월 반복
   - 반복 일정 수정 정책

4. 알림 기능
   - 일정 전 알림
   - D-Day 알림

5. 테스트 보강
   - API validation 테스트
   - 기간 일정 조회 테스트
   - 체크리스트 정렬 테스트

6. DB 마이그레이션 체계 개선
   - 현재 런타임 보정 로직을 유지하되, 장기적으로 명시적 마이그레이션 도구 도입 검토

7. UI/UX 개선
   - 모바일 캘린더 가독성 개선
   - 일정이 많은 날짜의 표시 방식 개선
   - 색상/상태 범례 추가 검토

## 작업 시 주의사항

- Next.js 16 계열이므로 Next.js 코드를 수정하기 전 관련 로컬 문서를 확인합니다.
- 기존 `AGENTS.md`의 Next.js 자동 생성 블록은 삭제하지 않습니다.
- `.env.local`은 커밋하지 않습니다.
- DB 연결 정보와 API 키는 문서에 실제 값으로 기록하지 않습니다.
- 일정 날짜는 `YYYY-MM-DD` 문자열을 기준으로 다룹니다.
- 기존 한국어 UI 문구가 깨져 보이는 파일이 있을 수 있으므로, 텍스트를 수정할 때는 인코딩 영향을 확인합니다.
- 기능 변경 시 README와 이 문서의 내용이 달라지지 않도록 함께 업데이트합니다.
