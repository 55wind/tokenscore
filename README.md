# TokenScore

AI 기업이 쓰는 LLM 토큰과 GPU 사용 기록으로 신용을 평가하고, 한도 안에서 다음 달 컴퓨트 청구서를 먼저 내주는 금융 플랫폼입니다. 핀테크 공모전 제출용 데모입니다.

- 기획안: [`공모전_기획안_토큰스코어.md`](./공모전_기획안_토큰스코어.md)
- 모든 기업, 인물, 수치는 시연용 가상 데이터입니다. 서비스명은 가칭이며 실제 금융상품이 아닙니다.

## 역할별 화면

| 역할 | 누구 | 하는 일 |
|---|---|---|
| **회사** (`/company`) | AI 응용기업의 대표·재무 담당 | 데이터 연동(정보 제공 동의), TokenScore 리포트, 한도 신청, 구성원 결제 요청 승인(Compute Pay), 매출연동 상환 일정, 정부 지원 매칭과 졸업 브릿지, 구성원 초대 |
| **사용자** (`/user`) | 그 기업의 엔지니어 | 무료 AI 비용 대시보드(모델별·GPU별 비용, 일별 지출, 예산), 비용 절감 제안, LLM·GPU 청구서 결제 요청 |
| **관리자** (`/admin`) | TokenScore 운영사 심사역·운영자 | 포트폴리오, 심사 큐와 상세 근거, 한도 승인·거절, 선결제 집행, 자동 상환 실행, 조기 경보, 심사 모델 설정, 감사 로그, 데모 초기화 |

결제는 세 역할을 거칩니다.

```
사용자: 청구서 결제 요청 → 회사: 한도 안에서 승인 → 관리자: 공급사에 대신 결제 → 다음 달부터 매출에서 자동 상환
```

## 실행

Node.js 22 이상(24 권장)이 필요합니다.

```bash
npm install
npm run dev        # 처음 실행하면 data/tokenscore.db 데모 DB를 자동으로 만듭니다
```

http://localhost:3000 에서 역할 카드를 누르면 바로 들어갑니다. 직접 로그인할 때 비밀번호는 모두 `demo1234`입니다.

| 역할 | 계정 |
|---|---|
| 회사 | ceo@replylab.ai (리플라이랩 대표) |
| 사용자 | dev@replylab.ai (리플라이랩 ML 엔지니어) |
| 관리자 | admin@tokenscore.kr (여신심사역) |

다른 기업 계정: ceo@pixelforge.ai, ceo@codemate.dev, ceo@lawyernote.kr, ceo@mediscan.ai, ceo@voicewave.ai, ceo@edubot.kr

로그인한 뒤에는 사이드바 아래 **다른 역할로 보기**에서 역할을 바로 바꿀 수 있습니다.

### 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드와 실행 |
| `npm run db:reset` | 데모 DB를 지우고 처음 상태로 다시 만듭니다 (관리자 > 심사 모델 > 데모 데이터 초기화와 같음) |
| `npm run score:report` | 기업별 점수·등급·한도를 콘솔에 출력합니다 |
| `npm test` | 심사 엔진 단위 테스트 (vitest) |
| `npm run typecheck` / `npm run lint` | 타입 검사, 린트 |

## 발표용 데모 순서 (약 3분)

1. **회사(한지수)** 개요: 정부 GPU 지원 종료 알림과 TokenScore **820점 A등급**, 산정 한도 **4,500만원**을 확인합니다.
2. **TokenScore 리포트**: 학습용 GPU와 정부 지원 사용분이 어떻게 빠졌는지, 워크로드별 판별 근거를 보여 줍니다.
3. **데이터 연동**: 기업은행 계좌를 연결합니다(동의 화면).
4. **한도 신청**: 4,500만원을 4개월로 신청합니다.
5. **관리자(강민서)**: 심사 상세에서 근거를 확인하고 승인합니다.
6. **사용자(서도윤)**: KT클라우드 청구서 680만원 결제를 요청합니다.
7. **회사**: Compute Pay에서 승인합니다. **관리자**: 선결제 집행에서 집행합니다. 상환 일정(매달 173만원, 매출의 약 4.3%)이 생깁니다.
8. 마무리: 관리자 포트폴리오와 조기 경보(보이스웨이브 사용량 급감·연체)를 보여 줍니다.

발표 전에 `npm run db:reset`이나 관리자 화면의 **데모 데이터 초기화**로 처음 상태로 되돌리세요.

## 심사 모델

기획안 4-3을 그대로 구현한 규칙 기반 모델입니다. 코드: [`src/lib/scoring/engine.ts`](./src/lib/scoring/engine.ts), 테스트: [`engine.test.ts`](./src/lib/scoring/engine.test.ts)

- **데이터 정제**: 공급사 청구 데이터만 씁니다. 자체 신고 데이터, 정부 지원·무료 크레딧 사용분, 학습용 GPU는 뺍니다.
- **추론/학습 판별**: 엔드포인트 트래픽이 있고 한 달의 60% 이상 가동하면 추론, 엔드포인트 없이 한 달의 절반 미만 동안 몰아서 돌면 학습, 그 밖은 판별 불가로 보고 보수적으로 뺍니다.
- **점수(1000점)**: 효율성 35%, 성장성 20%, 안정성 15%, 사업의 질 20%, 공급사 분산 10%를 더하고, 정부 지원 선정(+25)과 투자 유치(+15) 가점을 붙입니다. 성장성은 단가 하락을 보정한 사용량 기준입니다.
- **등급과 한도**: A 780 / B 680 / C 580 / D 480점 이상. 한도 = min(최근 3개월 평균 유료 컴퓨트 × 3 × 등급계수, 최근 3개월 평균 매출 × 2). 등급계수는 1.0~0.3입니다.
- 가중치, 기준점, 계수, 수수료, 자동 승인 등급은 **관리자 > 심사 모델**에서 바꾸면 바로 모든 기업에 다시 적용됩니다.

## 기술 스택

- Next.js 16 (App Router, Server Actions, `proxy.ts`), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui (Radix), Recharts, Wanted Sans
- SQLite (libSQL) + Drizzle ORM, 서명 쿠키 세션
- vitest, axe-core(접근성 점검)

```
src/
  app/
    page.tsx               랜딩
    login/                 로그인
    company/  user/  admin/   역할별 포털 (각 actions.ts에 서버 액션)
  components/              공용 UI (ScoreMeter, 차트, 앱 셸, shadcn ui/)
  lib/
    scoring/               심사 엔진 (순수 함수 + 테스트)
    services/              업무 로직 (신청·승인, 결제·집행·상환, 경보, 연동, 비용 분석)
    db/                    스키마, 시드 데이터
drizzle/                   SQL 마이그레이션
scripts/                   DB 생성, 점수 리포트
.claude/skills/            디자인 스킬 (출처: .claude/skills/SOURCES.md)
```

## 디자인

- **색은 의미로만**: 앰버는 컴퓨트 비용·사용량, 그린은 돈(매출·한도·상환), 레드는 위험에만 씁니다. 차트 색은 색각이상 구분과 대비 검사를 통과한 값입니다.
- **TokenScore 미터**: 10점 단위 눈금 100개가 토큰처럼 쌓이는 계량기 모양입니다. 화면에서 유일하게 들어올 때 움직이는 요소입니다.
- 접근성: axe-core 기준 WCAG 2.2 AA 위반 0건, 375px 가로 넘침 0건, 터치 기기에서 누르는 요소 44px 이상, 본문 건너뛰기 링크.
- 적용한 디자인 스킬: frontend-design, shadcn, beautiful-shadows, emil-design-eng, interaction-design, adapt, accessibility, design-crit, better-interface, dataviz.

## 배포 메모

로컬 SQLite 파일은 서버리스 환경에서 유지되지 않습니다. Vercel 등에 올릴 때는 libSQL 호환 DB(예: Turso)를 쓰고 환경변수를 설정하세요. 예시는 [`.env.example`](./.env.example)에 있습니다.

| 변수 | 설명 |
|---|---|
| `DATABASE_URL` | 기본값 `file:./data/tokenscore.db` |
| `DATABASE_AUTH_TOKEN` | 원격 libSQL 토큰 |
| `SESSION_SECRET` | 세션 쿠키 서명 키. 배포할 때 반드시 바꾸세요 |
| `ALLOW_DEMO_RESET` | `false`면 관리자 화면의 데모 초기화를 막습니다 |
