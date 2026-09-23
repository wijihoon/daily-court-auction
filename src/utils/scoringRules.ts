import { AuctionPropertyAnalysis } from '../types';

export interface ScoreRuleBreakdown {
  ruleName: string;
  category: 'profitability' | 'safety' | 'liquidity' | 'competition';
  score: number;
  maxScore: number;
  reason: string;
  isPositive: boolean;
}

export interface RuleBasedScoreResult {
  totalScore: number;
  grade: 'S' | 'A' | 'B' | 'C';
  gradeLabel: string;
  summary: string;
  breakdowns: ScoreRuleBreakdown[];
}

/**
 * 법원경매 검증된 4대 룰 베이스 가치평가 점수 산출 함수
 * 1. 수익성 및 할인율 (40점)
 * 2. 권리 안전성 및 인수부담 (30점)
 * 3. 환금성 및 입지 선호도 (20점)
 * 4. 경쟁강도 및 낙찰성공률 (10점)
 * 총 100점 만점
 */
export function evaluatePropertyScore(property: AuctionPropertyAnalysis): RuleBasedScoreResult {
  const p = property;
  const breakdowns: ScoreRuleBreakdown[] = [];

  // 1. 수익성 및 할인율 평가 (최대 40점)
  let profitScore = 0;
  let profitReason = '';
  if (p.net_roi >= 20) {
    profitScore = 38;
    profitReason = `세후 ROI +${p.net_roi}% (목표 20% 초과, 고수익 구간)`;
  } else if (p.net_roi >= 15) {
    profitScore = 34;
    profitReason = `세후 ROI +${p.net_roi}% (안정적 두 자릿수 수익률 확보)`;
  } else if (p.net_roi >= 10) {
    profitScore = 28;
    profitReason = `세후 ROI +${p.net_roi}% (준수한 수익률이나 자금비용 감안 필요)`;
  } else if (p.net_roi >= 5) {
    profitScore = 20;
    profitReason = `세후 ROI +${p.net_roi}% (수익 마진 다소 협소)`;
  } else {
    profitScore = 12;
    profitReason = `세후 ROI +${p.net_roi}% (실수익 마진 부족, 보수적 접근 권장)`;
  }

  // 감정가 대비 추천 입찰가 할인율 보너스 (최대 +2점)
  if (p.recommended_bid_ratio <= 0.82) {
    profitScore = Math.min(40, profitScore + 2);
    profitReason += ` · 감정가 대비 ${(100 - p.recommended_bid_ratio * 100).toFixed(0)}% 할인선`;
  }

  breakdowns.push({
    ruleName: '수익성 및 할인율',
    category: 'profitability',
    score: profitScore,
    maxScore: 40,
    reason: profitReason,
    isPositive: profitScore >= 28,
  });

  // 2. 권리 안전성 및 인수부담 평가 (최대 30점)
  let safetyScore = 0;
  let safetyReason = '';
  const assumedCost = p.rights_status.estimated_assumed_deposit || 0;

  if (p.rights_status.risk_level === '낮음' && assumedCost === 0) {
    safetyScore = 30;
    safetyReason = '말소기준 이후 권리 전액 소멸, 매수인 인수 금액 0원 (안전 물건)';
  } else if (p.rights_status.risk_level === '보통') {
    safetyScore = 20;
    safetyReason = assumedCost > 0
      ? `인수 예상액 ${Math.round(assumedCost / 100000000 * 10) / 10}억원 반영 필요, 현장 확인 권장`
      : '점유자 명도 협의 일정 소요 가능성 (인수 권리 없음)';
  } else {
    safetyScore = 8;
    safetyReason = '선순위 대항력 또는 특수 권리 존재 위험, 입찰 시 정밀 법률 확인 필수';
  }

  breakdowns.push({
    ruleName: '권리 안전성',
    category: 'safety',
    score: safetyScore,
    maxScore: 30,
    reason: safetyReason,
    isPositive: safetyScore >= 20,
  });

  // 3. 환금성 및 입지 선호도 평가 (최대 20점)
  let liquidityScore = 14;
  let liquidityReason = '';
  const isApt = p.usage.includes('아파트');
  const isSeoul = p.address.includes('서울');
  const isGyeonggi = p.address.includes('경기');
  const isSmallMedium = p.building_area_sqm <= 85;

  if (isApt && isSeoul) {
    liquidityScore = 20;
    liquidityReason = '서울 소재 아파트, 매매 거래량 및 전월세 환금성 최상';
  } else if (isApt && isGyeonggi) {
    liquidityScore = 18;
    liquidityReason = '경기 주요권 아파트, 실거래 회전율 우수 및 실수요 탄탄';
  } else if (isApt) {
    liquidityScore = 16;
    liquidityReason = '수도권 아파트, 인근 단지 실거래 기반 시세 형성';
  } else if (p.usage.includes('오피스텔')) {
    liquidityScore = 14;
    liquidityReason = '역세권 오피스텔, 임대수익률 양호하나 시세차익형 매도에 시일 소요 가능';
  } else {
    liquidityScore = 11;
    liquidityReason = '다세대/연립, 개별 호수 상태 및 거래 회전율 확인 필요';
  }

  if (isSmallMedium && isApt) {
    liquidityReason += ' · 85㎡ 이하 국민평형 수요 풍부';
  }

  breakdowns.push({
    ruleName: '환금성 및 입지',
    category: 'liquidity',
    score: liquidityScore,
    maxScore: 20,
    reason: liquidityReason,
    isPositive: liquidityScore >= 16,
  });

  // 4. 경쟁강도 및 낙찰 성공률 평가 (최대 10점)
  let compScore = 6;
  let compReason = '';

  if (p.win_probability >= 65) {
    compScore = 10;
    compReason = `추천 입찰가 기준 낙찰 확률 ${p.win_probability}% (적정 경쟁도, 예상 응찰자 ${p.expected_bidders}명)`;
  } else if (p.win_probability >= 45) {
    compScore = 8;
    compReason = `추천가 기준 낙찰 확률 ${p.win_probability}%, 예상 응찰자 ${p.expected_bidders}명 (경쟁권 진입 가능)`;
  } else {
    compScore = 5;
    compReason = `예상 응찰자 ${p.expected_bidders}명 집중으로 과열 입찰 주의 (보수적 응찰 권장)`;
  }

  breakdowns.push({
    ruleName: '낙찰 적중도',
    category: 'competition',
    score: compScore,
    maxScore: 10,
    reason: compReason,
    isPositive: compScore >= 8,
  });

  // 종합 점수 계산
  const totalScore = profitScore + safetyScore + liquidityScore + compScore;

  let grade: 'S' | 'A' | 'B' | 'C' = 'B';
  let gradeLabel = '보통';
  let summary = '';

  if (totalScore >= 90) {
    grade = 'S';
    gradeLabel = '최우수';
    summary = '수익률, 권리 안전, 입지 환금성을 모두 충족한 최상급 물건입니다.';
  } else if (totalScore >= 80) {
    grade = 'A';
    gradeLabel = '우수';
    summary = '우수한 세후 수익성과 안전성을 확보한 유망 입찰 물건입니다.';
  } else if (totalScore >= 70) {
    grade = 'B';
    gradeLabel = '보통';
    summary = '수익 마진이 양호하나 현장 점유상태 확인이 권장됩니다.';
  } else {
    grade = 'C';
    gradeLabel = '신중';
    summary = '경쟁 과열 또는 마진 협소로 보수적인 가격 입찰이 필요합니다.';
  }

  return {
    totalScore,
    grade,
    gradeLabel,
    summary,
    breakdowns,
  };
}
