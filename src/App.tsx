import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { initialAnalysisData, initialCalibrationData } from './data/initialData';
import { AnalysisSummary, CalibrationData, AuctionPropertyAnalysis } from './types';
import { evaluatePropertyScore } from './utils/scoringRules';
import { Header } from './components/Header';
import { PropertyCard } from './components/PropertyCard';
import { PastHistoryView } from './components/PastHistoryView';
import { BidSimulatorModal } from './components/BidSimulatorModal';
import { ScoreDetailModal } from './components/ScoreDetailModal';
import { Search, AlertCircle, ArrowUpDown, Coins } from 'lucide-react';
import { calcMinInitialInvestment } from './utils/calculator';

const REGIONS = ['전체', '서울', '경기', '인천'] as const;

export type SortCriterion = 'score' | 'profit' | 'roi' | 'min_cash' | 'price' | 'appraisal';

interface SortOptionConfig {
  key: SortCriterion;
  label: string;
}

const SORT_CRITERIA: readonly SortOptionConfig[] = [
  { key: 'score', label: '투자점수 높은 순' },
  { key: 'profit', label: '예상순익 높은 순' },
  { key: 'roi', label: '수익률(ROI) 높은 순' },
  { key: 'min_cash', label: '최소 투자금 적은 순' },
  { key: 'price', label: '추천입찰가 순' },
  { key: 'appraisal', label: '감정가 순' },
] as const;

export interface BudgetFilterOption {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

const BUDGET_FILTERS: readonly BudgetFilterOption[] = [
  { id: 'all', label: '전체 예산' },
  { id: 'under50m', label: '5천만 이하', max: 50000000 },
  { id: 'under100m', label: '1억 이하', max: 100000000 },
  { id: 'under200m', label: '2억 이하', max: 200000000 },
  { id: 'under300m', label: '3억 이하', max: 300000000 },
  { id: 'over300m', label: '3억 초과', min: 300000000 },
] as const;

/**
 * 안전한 숫자 파싱 유틸리티 (문자열 콤마, NaN, undefined, null 등을 안전한 유한 수로 변환)
 */
const toSafeNumber = (val: unknown): number => {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : 0;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
};

/**
 * 엄격한 숫자 내림차순(Descending) 비교 함수 (높은 값 우선: b - a)
 */
const compareNumericDesc = (valA: unknown, valB: unknown): number => {
  const numA = toSafeNumber(valA);
  const numB = toSafeNumber(valB);
  if (numB !== numA) {
    return numB - numA;
  }
  return 0;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'properties' | 'history'>('properties');
  const [analysisData] = useState<AnalysisSummary>(initialAnalysisData);
  const [calibrationData] = useState<CalibrationData>(initialCalibrationData);

  // 검색, 지역, 투자 예산 및 정렬 필터
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [selectedBudget, setSelectedBudget] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortCriterion>('score');
  const [visibleCount, setVisibleCount] = useState<number>(36);

  // 검색/필터/정렬 변경 시 표시 개수 리셋
  useEffect(() => {
    setVisibleCount(36);
  }, [search, selectedRegion, selectedBudget, sortBy]);

  // 모달 상태
  const [simulatorProperty, setSimulatorProperty] = useState<AuctionPropertyAnalysis | null>(null);
  const [scoreDetailProperty, setScoreDetailProperty] = useState<AuctionPropertyAnalysis | null>(null);

  // UI 드롭다운 변경 핸들러 (경쟁 상태 및 비정상 값 방지를 위한 useCallback과 엄격한 유효성 검사)
  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetValue = e.target.value as SortCriterion;
    if (SORT_CRITERIA.some((criterion) => criterion.key === targetValue)) {
      setSortBy(targetValue);
    }
  }, []);

  // 필터링 및 정렬된 매물 목록 (모든 숫자 필드 엄격한 정렬 보장)
  const filteredItems = useMemo(() => {
    // 1. 화면에 표시되는 룰 베이스 점수(evalResult.totalScore)와 매물 데이터 investment_score 완벽 동기화 및 최소 실투자금 계산
    const rawItems = analysisData.items || [];
    const enrichedList: AuctionPropertyAnalysis[] = rawItems.map((item) => {
      const evalScore = evaluatePropertyScore(item).totalScore;
      const minCash =
        item.min_initial_investment ??
        calcMinInitialInvestment(
          item.recommended_bid_price,
          item.acquisition_tax,
          item.operating_costs,
          item.rights_status?.estimated_assumed_deposit || 0,
          0.70
        ).minCash;

      return {
        ...item,
        investment_score: toSafeNumber(evalScore),
        min_initial_investment: minCash,
      };
    });

    let list = enrichedList;

    // 검색어 필터링
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (item) =>
          (item.case_no && item.case_no.toLowerCase().includes(q)) ||
          (item.address && item.address.toLowerCase().includes(q)) ||
          (item.court && item.court.toLowerCase().includes(q))
      );
    }

    // 지역 필터링
    if (selectedRegion !== '전체') {
      list = list.filter((item) => item.address && item.address.includes(selectedRegion));
    }

    // 투자 예산 필터링 (최소 실투자금 기준)
    if (selectedBudget !== 'all') {
      const bOpt = BUDGET_FILTERS.find((b) => b.id === selectedBudget);
      if (bOpt) {
        list = list.filter((item) => {
          const cash = toSafeNumber(item.min_initial_investment);
          if (bOpt.min !== undefined && cash <= bOpt.min) return false;
          if (bOpt.max !== undefined && cash > bOpt.max) return false;
          return true;
        });
      }
    }

    // 2. 선택 기준별 정렬
    list.sort((a, b) => {
      let primaryDiff = 0;

      switch (sortBy) {
        case 'score': {
          // 투자점수: 70점대 > 60점대 엄격한 내림차순
          primaryDiff = compareNumericDesc(a.investment_score, b.investment_score);
          break;
        }
        case 'profit': {
          // 예상순익: 큰 순익 우선 내림차순
          primaryDiff = compareNumericDesc(a.net_profit, b.net_profit);
          break;
        }
        case 'roi': {
          // 세후 수익률: 높은 ROI 우선 내림차순
          primaryDiff = compareNumericDesc(a.net_roi, b.net_roi);
          break;
        }
        case 'min_cash': {
          // 최소 투자금: 소액 투자 우선 오름차순 (a - b)
          const cashA = toSafeNumber(a.min_initial_investment);
          const cashB = toSafeNumber(b.min_initial_investment);
          primaryDiff = cashA - cashB;
          break;
        }
        case 'price': {
          // 추천입찰가: 금액 큰 순서 내림차순
          primaryDiff = compareNumericDesc(a.recommended_bid_price, b.recommended_bid_price);
          break;
        }
        case 'appraisal': {
          // 감정가: 감정액 큰 순서 내림차순
          primaryDiff = compareNumericDesc(a.appraisal_price, b.appraisal_price);
          break;
        }
        default:
          primaryDiff = 0;
      }

      if (primaryDiff !== 0) {
        return primaryDiff;
      }

      // 동률 발생 시 UI 흔들림 방지를 위한 안정적인 보조 정렬 (예상순익 > 추천입찰가 > ID)
      const secondaryProfitDiff = compareNumericDesc(a.net_profit, b.net_profit);
      if (secondaryProfitDiff !== 0) return secondaryProfitDiff;

      const secondaryPriceDiff = compareNumericDesc(a.recommended_bid_price, b.recommended_bid_price);
      if (secondaryPriceDiff !== 0) return secondaryPriceDiff;

      return String(a.id || '').localeCompare(String(b.id || ''));
    });

    return list;
  }, [analysisData.items, search, selectedRegion, selectedBudget, sortBy]);

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#191f28] flex flex-col selection:bg-[#03c75a]/20 selection:text-[#029a43]">
      {/* 헤더: 네이버 경매 매물 & 과거 이력 탭 */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 메인 컨테이너 (네이버 부동산 레이아웃) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-3.5 sm:space-y-4 min-w-0">
        {activeTab === 'properties' && (
          <div className="space-y-3.5 sm:space-y-4 min-w-0">
            {/* 상단 컨트롤 박스: 네이버 부동산 스타일 검색 및 필터 바 */}
            <div className="bg-white rounded-xl border border-[#e5e8eb] p-3 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 min-w-0">
                {/* 지역 필터 버튼 (네이버 그린 액센트) */}
                <div className="grid grid-cols-4 sm:flex items-center gap-1 bg-[#f4f6f8] p-1 rounded-lg text-xs shrink-0 min-w-0">
                  {REGIONS.map((region) => (
                    <button
                      key={region}
                      onClick={() => setSelectedRegion(region)}
                      className={`py-1.5 px-2 sm:px-3.5 text-xs rounded-md font-semibold transition-all text-center cursor-pointer touch-manipulation truncate ${
                        selectedRegion === region
                          ? 'bg-[#03c75a] text-white shadow-xs'
                          : 'text-[#4e5968] hover:text-[#191f28] hover:bg-[#eaecef]'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>

                {/* 검색창 및 정렬 선택 */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-4 h-4 text-[#8b95a1] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="단지명, 아파트명, 사건번호 검색"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#f8f9fa] border border-[#e5e8eb] rounded-lg text-xs text-[#191f28] placeholder-[#8b95a1] focus:outline-none focus:bg-white focus:border-[#03c75a] focus:ring-1 focus:ring-[#03c75a] transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#f8f9fa] border border-[#e5e8eb] rounded-lg px-2.5 py-2 text-xs text-[#333d4b] shrink-0">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#8b95a1] shrink-0" />
                    <select
                      id="property-sort-select"
                      name="sortBy"
                      value={sortBy}
                      onChange={handleSortChange}
                      className="bg-transparent text-[#333d4b] font-medium focus:outline-none cursor-pointer text-xs pr-1"
                      aria-label="정렬 기준"
                    >
                      {SORT_CRITERIA.map((criterion) => (
                        <option
                          key={criterion.key}
                          value={criterion.key}
                          className="bg-white text-[#333d4b]"
                        >
                          {criterion.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 최소 실투자금(내 자본금) 예산 필터 바 (네이버 페이 스타일) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-[#f2f4f6] text-xs">
                <span className="text-[11px] text-[#8b95a1] shrink-0 flex items-center gap-1 font-medium">
                  <Coins className="w-3.5 h-3.5 text-[#2b66f6] shrink-0" />
                  <span>내 실투자금:</span>
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {BUDGET_FILTERS.map((bf) => (
                    <button
                      key={bf.id}
                      onClick={() => setSelectedBudget(bf.id)}
                      className={`py-1 px-2.5 text-xs rounded-full font-medium transition-all text-center cursor-pointer touch-manipulation shrink-0 ${
                        selectedBudget === bf.id
                          ? 'bg-[#eaf8f0] text-[#03a84e] font-semibold border border-[#03c75a]/40 shadow-xs'
                          : 'bg-[#f4f6f8] text-[#6b7684] hover:bg-[#eaecef] border border-transparent'
                      }`}
                    >
                      {bf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 안내 텍스트 & 건수 표시 (네이버 부동산 결과 카운트) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs px-1 gap-1 min-w-0">
              <span className="font-medium text-[#4e5968]">
                추천 경매 물건 <strong className="font-bold text-[#03c75a]">{filteredItems.length}</strong>건
              </span>
              <span className="text-[11px] text-[#8b95a1] break-keep">
                사건번호 클릭 시 대법원 경매정보 원문 바로가기 · 물건 클릭 시 상세 시뮬레이터 실행
              </span>
            </div>

            {/* 심플한 그리드 카드 형태 매물 리스트 */}
            {filteredItems.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-xl border border-[#e5e8eb] shadow-xs space-y-2.5">
                <AlertCircle className="w-8 h-8 text-[#8b95a1] mx-auto opacity-70" />
                <h3 className="text-sm font-semibold text-[#333d4b]">
                  조건에 맞는 경매 매물이 없습니다.
                </h3>
                <p className="text-xs text-[#8b95a1]">
                  검색어 또는 지역/예산 필터를 변경해 보세요.
                </p>
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedRegion('전체');
                    setSelectedBudget('all');
                  }}
                  className="text-xs font-semibold text-[#03c75a] hover:text-[#029a43] cursor-pointer pt-1 underline underline-offset-4"
                >
                  필터 전체 초기화
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredItems.slice(0, visibleCount).map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onOpenSimulator={(prop) => setSimulatorProperty(prop)}
                      onOpenScoreDetail={(prop) => setScoreDetailProperty(prop)}
                    />
                  ))}
                </div>

                {visibleCount < filteredItems.length && (
                  <div className="pt-4 pb-8 flex flex-col items-center justify-center gap-2">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 36)}
                      className="px-8 py-3 bg-white hover:bg-[#f9fafb] text-[#191f28] hover:text-[#03c75a] font-bold text-xs rounded-xl border border-[#d3d9df] hover:border-[#03c75a] transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <span>경매 매물 더보기 (+36건)</span>
                      <span className="text-[#8b95a1] font-normal">
                        ({Math.min(visibleCount, filteredItems.length)} / {filteredItems.length})
                      </span>
                    </button>
                    <span className="text-[11px] text-[#8b95a1]">
                      남은 매물 {filteredItems.length - visibleCount}건
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 과거 이력 탭 */}
        {activeTab === 'history' && (
          <PastHistoryView calibration={calibrationData} />
        )}
      </main>

      {/* 푸터 (네이버 스타일 정돈된 푸터) */}
      <footer className="border-t border-[#e5e8eb] bg-white mt-10 py-6 text-xs text-[#8b95a1] text-center px-4 space-y-1">
        <p className="font-medium text-[#4e5968]">대한민국 법원경매정보(courtauction.go.kr) 및 국토교통부 실거래가 공개시스템 실시간 연동</p>
        <p className="text-[11px] text-[#8b95a1]">본 시스템의 예상 낙찰가 및 수익 분석은 통계적 추정치이며, 입찰 전 현장 임장 및 최종 권리분석은 입찰자 본인의 책임하에 진행되어야 합니다.</p>
      </footer>

      {/* 룰 베이스 점수 근거 팝업 모달 */}
      {scoreDetailProperty && (
        <ScoreDetailModal
          property={scoreDetailProperty}
          onClose={() => setScoreDetailProperty(null)}
        />
      )}

      {/* 입찰 시뮬레이터 모달 */}
      {simulatorProperty && (
        <BidSimulatorModal
          property={simulatorProperty}
          onClose={() => setSimulatorProperty(null)}
        />
      )}
    </div>
  );
}
