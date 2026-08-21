<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Agent Rules

이 문서는 Codex 또는 다른 AI 개발 에이전트가 이 프로젝트에서 작업할 때 항상 따라야 하는 규칙입니다.

## 1. 작업 시작 전 확인

- 코드 수정 전에 `docs/PROJECT_CONTEXT.md`를 먼저 읽고 프로젝트 목적, 현재 구현 상태, 진행 중인 작업, 다음 작업을 확인합니다.
- Next.js 관련 코드를 수정하기 전에는 `node_modules/next/dist/docs/` 안의 관련 문서를 확인합니다. 이 프로젝트는 Next.js 16 계열을 사용하므로 과거 버전 지식만으로 판단하지 않습니다.
- 변경 전 `git status --short`로 현재 작업 트리를 확인하고, 사용자가 만든 변경사항을 되돌리지 않습니다.
- 구현 방식은 기존 파일 구조와 네이밍, 검증 방식, API 응답 형태를 우선 따릅니다.

## 2. 기술 스택 기준

- Framework: Next.js App Router
- Language: TypeScript
- UI: React Client Components, FullCalendar
- Database: Neon PostgreSQL
- Styling: Tailwind CSS and global CSS
- API: Next.js Route Handler

새 라이브러리는 꼭 필요한 경우에만 추가하고, 추가 이유를 명확히 남깁니다.

## 3. 코드 작성 규칙

- TypeScript 타입을 명확히 사용하고, `any` 사용은 피합니다.
- API 입력값은 클라이언트와 서버 양쪽에서 검증합니다.
- DB에 저장되는 값은 허용 가능한 enum 값인지 확인합니다.
- 날짜 값은 `YYYY-MM-DD` 문자열을 기준으로 다루며, 한국 시간 기준 표시가 필요한 경우 기존 유틸을 우선 사용합니다.
- 일정 기간은 `start_date`, `end_date` 구조를 유지합니다. 단일 날짜 일정도 두 값이 같은 기간 일정으로 처리합니다.
- 기존 legacy 데이터 보정 로직은 함부로 제거하지 않습니다.
- 사용자에게 보이는 에러 메시지는 가능하면 한국어로 작성합니다.
- 코드 주석은 복잡한 의사결정이나 마이그레이션 의도를 설명해야 할 때만 짧게 작성합니다.

## 4. API / Database 규칙

- API Route Handler는 `try/catch`로 실패를 처리하고 `logApiError`를 사용합니다.
- DB 접근 전 필요한 테이블 보장 함수가 있다면 먼저 호출합니다.
- `schedules`, `calendar_settings`, `date_decorations`, `checklist_items`, `dday_items` 테이블 구조를 유지합니다.
- 일정 조회는 화면 범위와 일정 기간이 겹치는 조건을 사용합니다.
  - `start_date <= 조회_종료일`
  - `end_date >= 조회_시작일`
- checklist 정렬은 완료 상태가 같은 항목끼리만 변경하는 현재 정책을 유지합니다.
- 외부 공휴일 API 실패가 일정 CRUD 장애로 이어지지 않게 합니다.

## 5. UI / UX 규칙

- 첫 화면은 캘린더 사용 경험이 바로 보이도록 유지합니다.
- 일정 등록, 수정, 삭제 흐름은 모달 기반 UX를 유지합니다.
- 변경 중인 내용이 있는 모달을 닫을 때는 현재처럼 확인 흐름을 유지합니다.
- 일정 구분 색상, 확정/미정 상태, 공휴일/주말 표시가 시각적으로 구분되어야 합니다.
- 모바일 화면에서 버튼, 입력창, 캘린더 텍스트가 겹치지 않도록 확인합니다.
- 설정 페이지에서는 A, B, COMMON의 표시 이름과 색상 변경 기능을 유지합니다.

## 6. 환경 변수 / 보안

- `.env.local`은 커밋하지 않습니다.
- `DATABASE_URL`, `HOLIDAY_API_KEY` 같은 값은 문서에 실제 값으로 기록하지 않습니다.
- 외부 API 키가 없어도 앱의 핵심 일정 기능은 동작해야 합니다.

## 7. 검증

코드 변경 후 가능한 범위에서 아래 명령을 실행합니다.

```bash
npm run lint
npm run build
```

프론트엔드 UI를 변경한 경우 브라우저에서 다음 흐름을 확인합니다.

- 캘린더 월 이동
- 일정 생성
- 일정 수정
- 일정 삭제
- 기간 일정 표시
- D-Day 생성 또는 수정
- 체크리스트 추가, 완료 처리, 삭제
- 설정 페이지 저장

## 8. 문서 업데이트

- 프로젝트 목적, 구현 상태, 주요 결정, 진행 중인 작업, 다음 작업이 바뀌면 `docs/PROJECT_CONTEXT.md`를 함께 업데이트합니다.
- README는 외부 사용자용 설명, `PROJECT_CONTEXT.md`는 개발자와 에이전트를 위한 작업 맥락 문서로 구분합니다.
