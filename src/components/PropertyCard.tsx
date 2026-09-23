import React, { useState } from 'react';
import { AuctionPropertyAnalysis } from '../types';
import { formatWon, calcMinInitialInvestment } from '../utils/calculator';
import { evaluatePropertyScore } from '../utils/scoringRules';
import { getCourtAuctionUrl, copyCaseNumberToClipboard } from '../utils/courtUrl';
import {
  MapPin,
  Target,
  TrendingUp,
  Coins,
  Calculator,
  ChevronRight,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface PropertyCardProps {
  property: AuctionPropertyAnalysis;
  onOpenSimulator: (property: AuctionPropertyAnalysis) => void;
  onOpenScoreDetail?: (property: AuctionPropertyAnalysis) => void;
  onOpenRightsDetail?: (property: AuctionPropertyAnalysis) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onOpenSimulator,
  onOpenScoreDetail,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const p = property;
  const evalResult = evaluatePropertyScore(p);
  const courtUrl = getCourtAuctionUrl(p.court, p.case_no);

  const minCash =
    p.min_initial_investment ??
    calcMinInitialInvestment(
      p.recommended_bid_price,
      p.acquisition_tax,
      p.operating_costs,
      p.rights_status?.estimated_assumed_deposit || 0,
      0.70
    ).minCash;

  const handleCaseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyCaseNumberToClipboard(p.case_no);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getScoreBadgeStyle = (score: number) => {
    if (score >= 90) return 'text-[#03a84e] bg-[#eaf8f0] border-[#03c75a]/30';
    if (score >= 80) return 'text-[#2b66f6] bg-[#f0f4fd] border-[#2b66f6]/30';
    if (score >= 70) return 'text-[#d97706] bg-[#fff8ea] border-[#f59e0b]/30';
    return 'text-[#6b7684] bg-[#f4f6f8] border-[#e5e8eb]';
  };

  return (
    <div
      onClick={() => onOpenSimulator(p)}
      className="group bg-white hover:bg-white border border-[#e5e8eb] hover:border-[#03c75a] rounded-xl p-3.5 sm:p-4 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex flex-col justify-between cursor-pointer touch-manipulation min-w-0"
    >
      <div>
        {/* 1. 상단 메타: 용도 태그 · 사건번호 링크 & 룰 베이스 점수 배지 */}
        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* 네이버 부동산 시그니처 용도 태그 */}
            <span className="bg-[#edf4fe] text-[#2b66f6] font-semibold text-[11px] px-2 py-0.5 rounded shrink-0">
              {p.usage}
            </span>

            {/* 사건번호 (대법원 원문 링크) */}
            <a
              href={courtUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleCaseClick}
              aria-label={`대법원 법원경매정보 실제 사건 조회: ${p.case_no}`}
              title={`대법원 법원경매정보(courtauction.go.kr) ${p.case_no} 사건검색 페이지 이동 (새 창)`}
              className="inline-flex items-center gap-1 font-mono text-xs text-[#4e5968] hover:text-[#03c75a] font-medium py-0.5 px-1 rounded hover:bg-[#f4f6f8] transition-colors group/link min-w-0"
            >
              <span className="truncate underline decoration-[#d1d5db] underline-offset-2 group-hover/link:decoration-[#03c75a]">
                {p.case_no}
              </span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-50 group-hover/link:opacity-100" />
              {isCopied && (
                <span className="text-[10px] font-sans font-medium text-[#03a84e] bg-[#eaf8f0] px-1 rounded shrink-0">
                  복사됨
                </span>
              )}
            </a>
          </div>

          {/* 룰 베이스 점수 배지 (클릭 시 점수 산출 근거 팝업) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenScoreDetail?.(p);
            }}
            title="룰 베이스 점수 산출 근거 확인"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold border transition-colors cursor-pointer active:scale-95 shrink-0 ${getScoreBadgeStyle(
              evalResult.totalScore
            )}`}
          >
            <span>{evalResult.totalScore}점</span>
            <span className="text-[10px] font-normal opacity-80">({evalResult.grade})</span>
            <HelpCircle className="w-3 h-3 opacity-60 shrink-0" />
          </button>
        </div>

        {/* 2. 주소 (네이버 부동산 물건 제목 스타일) */}
        <div className="flex items-start gap-1.5 mb-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-[#8b95a1] shrink-0 mt-0.5" />
          <h3 className="text-sm sm:text-[15px] font-bold text-[#191f28] group-hover:text-[#03c75a] transition-colors line-clamp-2 leading-snug break-keep min-w-0">
            {p.address}
          </h3>
        </div>

        {/* 법원명 · 매각기일 서브 텍스트 */}
        <div className="text-[11px] text-[#8b95a1] mb-2.5 truncate pl-5">
          <span>{p.court}</span>
          <span className="mx-1 text-[#d1d5db]">·</span>
          <span>매각기일 {p.sale_date}</span>
        </div>

        {/* 3. 3열 핵심 지표 (네이버 부동산 정밀 가격 분석) */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2.5 border-t border-[#f2f4f6] min-w-0">
          {/* 적정 입찰가 */}
          <div className="p-2 bg-[#f8f9fa] rounded-lg border border-[#eef0f2] min-w-0 flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] font-medium text-[#6b7684] mb-0.5 flex items-center gap-1 truncate">
              <Target className="w-3 h-3 text-[#03c75a] shrink-0" />
              <span>적정 입찰가</span>
            </span>
            <div className="text-xs sm:text-sm font-bold font-mono text-[#191f28] tabular-nums truncate">
              {formatWon(p.recommended_bid_price)}
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#03a84e] font-semibold font-mono block mt-0.5 truncate">
              낙찰가율 {(p.recommended_bid_ratio * 100).toFixed(1)}%
            </span>
          </div>

          {/* 최소 실투자금 (대출 70% 가정) */}
          <div className="p-2 bg-[#f0f6ff] rounded-lg border border-[#d6e4ff] min-w-0 flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] font-medium text-[#2b66f6] mb-0.5 flex items-center gap-1 truncate">
              <Coins className="w-3 h-3 text-[#2b66f6] shrink-0" />
              <span>최소 실투자금</span>
            </span>
            <div className="text-xs sm:text-sm font-bold font-mono text-[#1a56db] tabular-nums truncate">
              {formatWon(minCash)}
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#5c7cfa] font-medium font-mono block mt-0.5 truncate">
              대출 70% 기준
            </span>
          </div>

          {/* 예상 순이익 (한국 부동산/네이버 금융 스타일 붉은색 상승 표기) */}
          <div className="p-2 bg-[#fff5f5] rounded-lg border border-[#fed7d7] min-w-0 flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] font-medium text-[#e03131] mb-0.5 flex items-center gap-1 truncate">
              <TrendingUp className="w-3 h-3 text-[#e03131] shrink-0" />
              <span>예상 순이익</span>
            </span>
            <div className="text-xs sm:text-sm font-bold font-mono text-[#e03131] tabular-nums truncate">
              +{formatWon(p.net_profit)}
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#c92a2a] font-bold font-mono block mt-0.5 truncate">
              세후 ROI +{p.net_roi}%
            </span>
          </div>
        </div>
      </div>

      {/* 4. 카드 하단: 감정가 및 입찰 시뮬레이터 실행 버튼 */}
      <div className="mt-3 pt-2.5 border-t border-[#f2f4f6] flex items-center justify-between text-xs min-w-0">
        <span className="text-[#8b95a1] font-mono text-[11px] truncate">
          감정가 {formatWon(p.appraisal_price)}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSimulator(p);
          }}
          className="bg-[#03c75a] hover:bg-[#02b350] text-white font-bold flex items-center gap-1 cursor-pointer py-1.5 px-3 rounded-lg text-xs shadow-xs transition-colors"
        >
          <Calculator className="w-3.5 h-3.5 shrink-0" />
          <span>입찰 시뮬레이터</span>
        </button>
      </div>
    </div>
  );
};
