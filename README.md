# 🏢 대한민국 법원경매 자동 수집 · 권리분석 & 재매매 순이익 예측 플랫폼

> **Automated Court Auction Analytics & Backtesting Platform**  
> 대법원 법원경매정보(Court Auction)와 국토교통부 실거래가(MOLIT API)를 매일 자동 수집하고, 권리분석(대항력·말소기준·인수보증금)과 세금·명도비용을 정밀 계산하여 **적정 입찰가, 낙찰 확률,
> 재매매 순이익(ROI)**을 산출하는 풀스택 경매 인텔리전스 시스템입니다.

---

## 📌 핵심 기능 및 시스템 특징 (Key Features)

### 1. 🤖 매일 자동 수집 & 분석 파이프라인 (GitHub Actions)

- **일일 스케줄 실행**: 매일 KST 06:00 (UTC 21:00) GitHub Actions 워크플로가 자동 가동됩니다.
- **다중 법원 크롤링**: 서울중앙·남부·동부·북부·서부, 의정부, 고양, 인천, 수원, 성남 등 수도권 핵심 관할 법원의 경매 매물을 일괄 수집합니다.
- **국토부 실거래가(MOLIT API) 결합**: 아파트, 오피스텔, 빌라 등 매물의 실거래가 컴프스(Comps)를 바탕으로 급매가 및 보수적 시장가를 자동 추정합니다.

### 2. ⚖️ 딥 권리분석 엔진 (Legal & Rights Analysis)

- **말소기준권리 판별**: 근저당권, 가압류, 담보가등기 등 최선순위 설정일자와 임차인 전입일자/확정일자를 자동 대조.
- **임차인 대항력 및 배당요구 분석**:
    - 대항력 유무(`대항력있음` / `없음`) 자동 판정.
    - 배당요구 여부에 따른 예상 **인수보증금(Assumed Deposit)** 산출.
    - 고위험 물건(가처분, 유치권, 법정지상권 여지 등) 필터링 및 리스크 등급(`낮음` / `보통` / `높음`) 부여.

### 3. 💰 7개 부대비용 및 정밀 세제 계산기 (Financial Valuation)

- **실전형 부대비용 반영**:
    1. 취득세 및 지방교육세 (주택 수 및 규제지역 감안 기본 1.1%~3.5%)
    2. 양도소득세 (단기 보유 세율 또는 일반 과세율 적용)
    3. 명도 협상 및 강제집행 예비비 (평당/전용면적 기준 명도비)
    4. 미납 공용관리비 (통상 3~6개월분 추정)
    5. 인테리어/수리 비용 (경락 매물 컨디션 복구 비용)
    6. 법무사 보수 및 등기 제비용
    7. 중개수수료 (취득 및 매도 쌍방)
- **경락잔금대출 시뮬레이션**: LTV(60~80%) 및 금리를 반영하여 실제 필요한 **최소 자기자본(Total Cash Required)**과 레버리지 순이익률을 자동 계산.

### 4. 📈 100점 만점 투자 매력도 스코어링 (Auction Valuation Score)

- **수익성 (40점)**: 예상 순이익률(ROI) 및 절대 차익
- **안전성 (30점)**: 인수 권리 유무, 임차인 명도 난이도, 등기부 리스크
- **환금성/입지 (20점)**: 역세권, 층수, 대단지 세대수, 거래 회전율
- **가격 메리트 (10점)**: 감정가 및 실거래가 대비 최저입찰가 할인율

### 5. 🎯 과거 낙찰 사례 기반 자기고도화 (Self-Calibration Loop)

- 실제 법원 낙찰 결과(낙찰가율, 응찰자 수, 유찰 여부)를 수집하여 모델 예측치와 오차(MAE, RMSE)를 계산합니다.
- 법원별·용도별 낙찰가율 편향(Bias)을 정기적으로 보정하여 시간이 지날수록 예측 신뢰도가 향상됩니다.

### 6. 📰 네이버/티스토리 맞춤형 블로그 포스팅 자동 생성

- 매일 추천 Top 10 매물에 대해 블로그 포스팅용 전문 HTML 및 마크다운(`data/blog_posts/`)을 자동 발행.
- 클릭 한 번으로 복사 가능한 **네이버 블로그 HTML 클립보드 복사 모드** 및 미리보기 제공.

### 7. 🔔 슬랙 알림 시스템 (Slack Webhook)

- 배치 분석 완료 시 추천 Top 10 매물 요약(순위, 단지명, 사건번호, 감정가, 수익률 등)을 웹훅(Slack Webhook)으로 즉시 알림 발송.

---

## 📂 디렉토리 구조 (Directory Structure)

```plaintext
├── .github/
│   └── workflows/
│       ├── daily-auction-pipeline.yml  # 매일 법원 크롤링 및 분석 자동화 파이프라인
│       └── deploy-pages.yml           # GitHub Pages 자동 빌드 및 배포 워크플로
├── scripts/
│   ├── crawl.py          # 대법원 경매정보 수집 스크립트
│   ├── analyze.py        # 국토부 실거래가 결합, 권리분석, 세금/수익률 계산기
│   ├── track.py          # 낙찰 결과 수집 및 모델 자기고도화(Calibration)
│   ├── generate_blog.py  # Top 10 추천 매물 블로그 포스팅 자동 생성기
│   └── notify_slack.py   # Slack 웹훅 전송 스크립트
├── data/
│   ├── properties.json   # 수집된 법원경매 매물 원천 데이터
│   ├── analysis.json     # 권리분석 및 수익률 산출 결과 데이터
│   ├── predictions.json  # 적정 입찰가 및 예상 응찰자 수 예측치
│   ├── calibration.json  # 법원별/지역별 보정 계수
│   ├── outcomes.json     # 실제 낙찰 이력 데이터 (사후 검증용)
│   ├── blog_posts/       # 생성된 블로그 게시글 파일 (HTML, MD)
│   └── blog_posts.json   # 블로그 생성 메타데이터
├── src/
│   ├── components/
│   │   ├── Header.tsx             # 상단 내비게이션, 검색, 정렬 및 뷰 전환
│   │   ├── PropertyCard.tsx       # 경매 물건 카드 (점수, 수익률, 태그, 대법원 직링크)
│   │   ├── BidSimulatorModal.tsx  # 인터랙티브 입찰가·대출·수익률 실시간 시뮬레이터
│   │   ├── ScoreDetailModal.tsx   # 100점 만점 스코어링 상세 분석 팝업
│   │   ├── BlogView.tsx           # 블로그 원고 열람 및 네이버 HTML 복사 도구
│   │   └── PastHistoryView.tsx    # 과거 낙찰 및 모델 적중률 사후분석 뷰
│   ├── utils/
│   │   ├── calculator.ts          # 세금, 취득비용, ROI 계산 유틸
│   │   ├── scoringRules.ts        # 점수 계산 및 뱃지 로직
│   │   └── courtUrl.ts            # 대법원 법원경매 공식 사이트 상세 링크 생성
│   ├── types.ts                   # 시스템 종합 TypeScript 타입 정의
│   ├── App.tsx                    # 메인 대시보드 컴포넌트
│   └── index.css                  # Tailwind CSS 스타일
├── metadata.json         # 앱 메타데이터
└── package.json          # 의존성 및 실행 스크립트
```

---

## 🚀 빠른 시작 (Local Development)

### 1. 요구 사항 (Prerequisites)

- **Node.js**: v18 이상 (권장 v20+)
- **Python**: 3.10 이상
- **npm** 또는 **bun**

### 2. 설치 및 실행 (Frontend)

```bash
# 1. 저장소 클론
git clone https://github.com/your-repo/auction-platform.git
cd auction-platform

# 2. Node 의존성 설치
npm install

# 3. 로컬 개발 서버 실행 (포트 3000)
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하여 인터랙티브 대시보드를 확인합니다.

### 3. Python 데이터 파이프라인 수동 실행

```bash
# 1. 파이썬 의존성 설치 (필요시)
pip install requests beautifulsoup4

# 2. 경매 매물 수집
python3 scripts/crawl.py

# 3. 권리분석 및 수익률 계산
python3 scripts/analyze.py

# 4. 블로그 포스팅 생성
python3 scripts/generate_blog.py

# 5. 낙찰 결과 추적 및 고도화
python3 scripts/track.py
```

---

## ⚙️ 환경 변수 및 시크릿 설정 (Environment Variables)

GitHub 저장소의 **Settings > Secrets and variables > Actions**에 다음 환경 변수를 등록하면 외부 API 및 알림 연동이 활성화됩니다.

| 환경변수 (Secret Key)   |  필수 여부  | 설명                                                                   |
|---------------------|:-------:|----------------------------------------------------------------------|
| `MOLIT_SERVICE_KEY` | 선택 (권장) | 공공데이터포털(data.go.kr) 국토교통부 실거래가 오픈 API 인증키 (미입력 시 보수적 감정가 알고리즘 자동 작동) |
| `SLACK_WEBHOOK_URL` |   선택    | 배치 분석 완료 시 추천 Top 10 요약 리포트를 수신할 Slack Incoming Webhook URL          |

---

## 🌐 배포 (Deployment)

### GitHub Pages 배포 (권장)

본 저장소에는 `.github/workflows/deploy-pages.yml` 워크플로가 포함되어 있습니다.

1. GitHub 저장소의 **Settings > Pages** 메뉴로 이동합니다.
2. **Build and deployment > Source**를 **GitHub Actions**로 선택합니다.
3. `main` 브랜치에 코드가 푸시되거나, 일일 파이프라인이 완료되면 자동으로 GitHub Pages에 최신 상태로 빌드 및 배포됩니다.

---

## 🔒 면책 조항 (Disclaimer)

- 본 플랫폼에서 제공하는 권리분석 결과, 예상 낙찰가, 세금 및 재매매 순이익 예측치는 공개된 공공데이터와 통계적 알고리즘에 기초한 **참고용 추정치**입니다.
- 실제 법원 입찰 전에는 반드시 **대법원 법원경매정보 매각물건명세서**, **현황조사서**, **등기사항전부증명서(말소기준권리 및 임차인 전입/확정일자)**를 직접 열람하시고 현장 임장을 거쳐 최종 판단하시기
  바랍니다.
- 시스템 이용으로 인한 투자 결과에 대한 법적 책임은 투자자 본인에게 있습니다.

---

## 📄 라이선스 (License)

This project is licensed under the [MIT License](LICENSE).
