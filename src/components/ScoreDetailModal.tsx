import React from 'react';
import { AuctionPropertyAnalysis } from '../types';
import { evaluatePropertyScore, RuleBasedScoreResult } from '../utils/scoringRules';
import { getCourtAuctionUrl, copyCaseNumberToClipboard } from '../utils/courtUrl';
import { X, CheckCircle2, Shield, TrendingUp, Building, Users, ExternalLink } from 'lucide-react';

interface ScoreDetailModalProps {
  property: AuctionPropertyAnalysis | null;
  onClose: () => void;
}

export const ScoreDetailModal: React.FC<ScoreDetailModalProps> = ({ property, onClose }) => {
  if (!property) return null;

  const evaluation: RuleBasedScoreResult = evaluatePropertyScore(property);
  const courtUrl = getCourtAuctionUrl(property.court, property.case_no);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'profitability':
        return <TrendingUp className="w-3.5 h-3.5 text-[#03c75a] shrink-0" />;
      case 'safety':
        return <Shield className="w-3.5 h-3.5 text-[#2b66f6] shrink-0" />;
      case 'liquidity':
        return <Building className="w-3.5 h-3.5 text-[#e67e22] shrink-0" />;
      case 'competition':
        return <Users className="w-3.5 h-3.5 text-[#8e44ad] shrink-0" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#8b95a1] shrink-0" />;
    }
  };

  const getGradeBadgeClass = (grade: string) => {
    switch (grade) {
      case 'S':
        return 'bg-[#eaf8f0] text-[#03a84e] border-[#03c75a]/30';
      case 'A':
        return 'bg-[#f0f4fd] text-[#2b66f6] border-[#2b66f6]/30';
      case 'B':
        return 'bg-[#fff8ea] text-[#d97706] border-[#f59e0b]/30';
      default:
        return 'bg-[#f4f6f8] text-[#6b7684] border-[#e5e8eb]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white border border-[#e5e8eb] rounded-2xl shadow-xl overflow-hidden my-auto min-w-0">
        {/* 헤더: 네이버 스타일 정돈된 상단 바 */}
        <div className="px-4 sm:px-5 py-3 border-b border-[#e5e8eb] flex items-center justify-between bg-[#f9fafb] shrink-0 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-[#8b95a1] mb-0.5 min-w-0">
              <a
                href={courtUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => copyCaseNumberToClipboard(property.case_no)}
                title="대법원 법원경매정보 사건검색(PGJ159M00) 이동 (새 창)"
                className="inline-flex items-center gap-1 font-mono text-[#03c75a] hover:underline font-semibold cursor-pointer truncate"
              >
                <span>{property.case_no}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-75" />
              </a>
              <span className="text-[#d1d5db]">·</span>
              <span className="truncate text-[#6b7684]">{property.court}</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[#191f28] line-clamp-1 break-keep">
              투자 분석 점수 산출 근거
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="p-1.5 text-[#8b95a1] hover:text-[#191f28] hover:bg-[#f2f4f6] rounded-lg transition-colors cursor-pointer shrink-0 ml-2 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 바디 */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto min-w-0">
          {/* 종합 점수 및 등급 카드 */}
          <div className="p-4 bg-[#f8f9fa] rounded-xl border border-[#e5e8eb] flex items-center justify-between min-w-0 gap-2">
            <div>
              <span className="text-xs text-[#6b7684] block mb-0.5 font-medium">검증 룰 종합 점수</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold font-mono text-[#191f28] tabular-nums">
                  {evaluation.totalScore}
                </span>
                <span className="text-xs font-mono text-[#8b95a1]">/ 100점</span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${getGradeBadgeClass(
                  evaluation.grade
                )}`}
              >
                {evaluation.grade}등급 · {evaluation.gradeLabel}
              </span>
              <span className="text-[11px] text-[#8b95a1] block mt-1">
                4대 검증 룰 종합
              </span>
            </div>
          </div>

          {/* 종합 요약 한 줄 */}
          <div className="text-xs text-[#333d4b] bg-[#f4f6f8] p-3 rounded-lg border border-[#eef0f3] leading-relaxed break-keep">
            {evaluation.summary}
          </div>

          {/* 4대 룰 항목별 상세 점수 & 이유 */}
          <div className="space-y-2 min-w-0">
            <span className="text-xs font-bold text-[#191f28] block">
              점수 산출 항목별 상세 내역
            </span>

            {evaluation.breakdowns.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-white rounded-xl border border-[#e5e8eb] shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-1 min-w-0"
              >
                <div className="flex items-center justify-between text-xs min-w-0 gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-[#191f28] min-w-0">
                    {getCategoryIcon(item.category)}
                    <span className="truncate">{item.ruleName}</span>
                  </div>
                  <div className="font-mono font-bold text-xs text-[#191f28] tabular-nums shrink-0">
                    <span className={item.isPositive ? 'text-[#03c75a]' : 'text-[#6b7684]'}>
                      {item.score}점
                    </span>
                    <span className="text-[#8b95a1] font-normal ml-0.5">/ {item.maxScore}점</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#6b7684] pl-5 leading-relaxed break-keep">
                  {item.reason}
                </p>
              </div>
            ))}
          </div>

          {/* 법적 고지 */}
          <div className="p-2.5 bg-[#f8f9fa] rounded-lg text-[10px] text-[#8b95a1] leading-relaxed break-keep">
            * 본 점수는 국토교통부 실거래가 데이터 및 대법원 법원경매정보 매각물건명세서의 표준화된 룰을 기준으로 자동 산출되었습니다.
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-4 sm:px-5 py-3 border-t border-[#e5e8eb] bg-[#f9fafb] flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-[#8b95a1] truncate">4대 룰 기반 분석 완료</span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-[#03c75a] hover:bg-[#02b350] rounded-lg transition-colors cursor-pointer shrink-0 touch-manipulation shadow-xs"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
