import React, { useState, useMemo } from 'react';
import { AuctionPropertyAnalysis } from '../types';
import {
  calcAcquisitionTax,
  calcTransferTax,
  calcMinInitialInvestment,
  formatWon,
  formatNumber,
  normalCdf,
} from '../utils/calculator';
import { X, TrendingUp, AlertTriangle, ShieldCheck, Check, RotateCcw, ExternalLink, Coins } from 'lucide-react';
import { getCourtAuctionUrl, copyCaseNumberToClipboard } from '../utils/courtUrl';

interface BidSimulatorModalProps {
  property: AuctionPropertyAnalysis | null;
  onClose: () => void;
}

export const BidSimulatorModal: React.FC<BidSimulatorModalProps> = ({ property, onClose }) => {
  if (!property) return null;

  const p = property;
  const isOfficetel = p.usage.includes('오피스텔');
  const marketPrice = p.estimated_market_price;
  const minBid = p.min_bid_price;
  const appraisal = p.appraisal_price;

  // State
  const [bidPrice, setBidPrice] = useState<number>(p.recommended_bid_price);
  const [presetType, setPresetType] = useState<'min' | 'conservative' | 'balanced' | 'aggressive' | 'custom'>('balanced');
  const [holdingPeriod, setHoldingPeriod] = useState<'under1' | 'under2' | 'over2'>('under1');
  const [customRenovation, setCustomRenovation] = useState<number>(p.costs_breakdown.renovation_cost);
  const [customEviction, setCustomEviction] = useState<number>(p.costs_breakdown.eviction_cost);

  // Assumed rights (e.g. unreturned deposit for opposing tenant)
  const assumedRights = p.rights_status.estimated_assumed_deposit;

  // Real-time calculations
  const simulation = useMemo(() => {
    const acqTaxInfo = calcAcquisitionTax(bidPrice, p.building_area_sqm, isOfficetel);

    // Operating expenses
    const brokerageBuy = Math.round(bidPrice * 0.004);
    const brokerageSell = Math.round(marketPrice * 0.004);
    const arrearsMgmt = p.costs_breakdown.arrears_mgmt_cost;
    const regFee = 800000;
    const contingency = Math.round(bidPrice * 0.01);

    const totalSubCosts =
      customEviction +
      arrearsMgmt +
      customRenovation +
      brokerageBuy +
      brokerageSell +
      regFee +
      contingency;

    const totalOperatingCost = totalSubCosts + assumedRights;
    const totalCashRequired = bidPrice + acqTaxInfo.total + totalOperatingCost;
    const grossGain = marketPrice - totalCashRequired;

    // Transfer tax
    const transferTaxInfo = calcTransferTax(grossGain, holdingPeriod);
    const netProfit = grossGain - transferTaxInfo.tax;
    const netRoi = Number(((netProfit / totalCashRequired) * 100).toFixed(1));

    // Win probability calculation
    const myRatio = bidPrice / appraisal;
    const modelRatio = p.recommended_bid_ratio;
    const stdDev = 0.055;
    let winProb = Math.round(normalCdf(myRatio, modelRatio, stdDev) * 100);
    winProb = Math.max(5, Math.min(98, winProb));

    // Safety Margin
    const safetyMarginWon = marketPrice - totalCashRequired;
    const safetyMarginPct = Number(((safetyMarginWon / marketPrice) * 100).toFixed(1));

    return {
      acqTaxInfo,
      transferTaxInfo,
      totalSubCosts,
      totalOperatingCost,
      totalCashRequired,
      grossGain,
      netProfit,
      netRoi,
      winProb,
      myRatio: Number((myRatio * 100).toFixed(1)),
      safetyMarginWon,
      safetyMarginPct,
      brokerageBuy,
      brokerageSell,
      regFee,
      contingency,
    };
  }, [
    bidPrice,
    marketPrice,
    appraisal,
    p.building_area_sqm,
    isOfficetel,
    p.recommended_bid_ratio,
    p.costs_breakdown.arrears_mgmt_cost,
    customEviction,
    customRenovation,
    assumedRights,
    holdingPeriod,
    minBid,
  ]);

  const setPreset = (type: 'balanced' | 'conservative' | 'aggressive' | 'min') => {
    setPresetType(type);
    if (type === 'balanced') setBidPrice(p.recommended_bid_price);
    if (type === 'conservative') setBidPrice(Math.max(minBid, Math.round(p.recommended_bid_price * 0.94)));
    if (type === 'aggressive') setBidPrice(Math.min(Math.round(marketPrice * 0.93), Math.round(p.recommended_bid_price * 1.05)));
    if (type === 'min') setBidPrice(minBid);
  };

  const courtUrl = getCourtAuctionUrl(p.court, p.case_no);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white border border-[#e5e8eb] rounded-2xl shadow-xl overflow-hidden my-auto min-w-0">
        {/* Header: 네이버 스타일 정돈된 상단 헤더 */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[#e5e8eb] flex items-center justify-between bg-[#f9fafb] shrink-0 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-[#8b95a1] mb-0.5 min-w-0">
              <a
                href={courtUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => copyCaseNumberToClipboard(p.case_no)}
                title="대법원 법원경매정보 사건검색(PGJ159M00) 이동 (새 창)"
                className="font-mono text-[#03c75a] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer truncate"
              >
                <span>{p.case_no}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-75" />
              </a>
              <span aria-hidden="true" className="text-[#d1d5db]">·</span>
              <span className="truncate text-[#6b7684]">{p.court}</span>
              <span aria-hidden="true" className="text-[#d1d5db]">·</span>
              <span className="bg-[#edf4fe] text-[#2b66f6] px-1.5 py-0.2 rounded font-semibold text-[11px] truncate">
                {p.usage}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-[#191f28] line-clamp-1 break-keep">
              {p.address}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="p-1.5 text-[#8b95a1] hover:text-[#191f28] hover:bg-[#f2f4f6] rounded-lg transition-colors cursor-pointer shrink-0 ml-2 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto min-w-0">
          {/* Top Presets & Current Bid Slider */}
          <div className="p-3.5 sm:p-4 bg-[#f8f9fa] border border-[#e5e8eb] rounded-xl space-y-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <span className="text-xs text-[#6b7684] block mb-0.5 font-medium">
                  나의 모의 입찰가 설정
                </span>
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#03c75a] tabular-nums truncate">
                    {formatWon(bidPrice)}
                  </span>
                  <span className="text-xs text-[#8b95a1] font-mono truncate">
                    (감정가 대비 <strong className="text-[#191f28] font-bold">{simulation.myRatio}%</strong>)
                  </span>
                </div>
              </div>

              {/* Presets: 네이버 스타일 프리셋 버튼 그룹 */}
              <div className="grid grid-cols-4 sm:flex items-center gap-1 bg-[#eaecef] p-1 rounded-lg text-xs shrink-0">
                <button
                  onClick={() => setPreset('min')}
                  className={`py-1 px-2 rounded-md text-xs font-semibold text-center transition-all cursor-pointer ${
                    presetType === 'min'
                      ? 'bg-white text-[#191f28] shadow-xs'
                      : 'text-[#6b7684] hover:text-[#191f28]'
                  }`}
                >
                  최저가
                </button>
                <button
                  onClick={() => setPreset('conservative')}
                  className={`py-1 px-2 rounded-md text-xs font-semibold text-center transition-all cursor-pointer ${
                    presetType === 'conservative'
                      ? 'bg-white text-[#191f28] shadow-xs'
                      : 'text-[#6b7684] hover:text-[#191f28]'
                  }`}
                >
                  보수적
                </button>
                <button
                  onClick={() => setPreset('balanced')}
                  className={`py-1 px-2 rounded-md text-xs font-semibold text-center transition-all cursor-pointer ${
                    presetType === 'balanced'
                      ? 'bg-[#03c75a] text-white shadow-xs'
                      : 'text-[#6b7684] hover:text-[#191f28]'
                  }`}
                >
                  권장가
                </button>
                <button
                  onClick={() => setPreset('aggressive')}
                  className={`py-1 px-2 rounded-md text-xs font-semibold text-center transition-all cursor-pointer ${
                    presetType === 'aggressive'
                      ? 'bg-white text-[#191f28] shadow-xs'
                      : 'text-[#6b7684] hover:text-[#191f28]'
                  }`}
                >
                  낙찰우선
                </button>
              </div>
            </div>

            {/* Slider */}
            <div className="min-w-0">
              <input
                type="range"
                min={minBid}
                max={Math.round(marketPrice * 1.05)}
                step={1000000}
                value={bidPrice}
                onChange={(e) => {
                  setBidPrice(Number(e.target.value));
                  setPresetType('custom');
                }}
                className="w-full h-2 bg-[#d1d5db] rounded-lg appearance-none cursor-pointer accent-[#03c75a]"
              />
              <div className="flex justify-between text-[11px] text-[#8b95a1] font-mono mt-1">
                <span>최저가 {formatWon(minBid)}</span>
                <span className="text-[#03a84e] font-semibold">
                  모델 권장가 {formatWon(p.recommended_bid_price)}
                </span>
                <span>시장시세 {formatWon(marketPrice)}</span>
              </div>
            </div>
          </div>

          {/* Key Simulation Outcomes: 3 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
            {/* 1. Net Profit & ROI */}
            <div className="p-3.5 bg-[#fff5f5] border border-[#fed7d7] rounded-xl min-w-0">
              <span className="text-xs font-semibold text-[#e03131] block mb-0.5 truncate">
                세후 예상 순이익
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#e03131] tabular-nums truncate">
                {simulation.netProfit > 0 ? '+' : ''}
                {formatWon(simulation.netProfit)}
              </div>
              <div className="text-[11px] text-[#c92a2a] mt-1 flex items-center justify-between font-medium">
                <span>투자수익률 (ROI)</span>
                <span className="font-mono font-bold">
                  {simulation.netRoi}%
                </span>
              </div>
            </div>

            {/* 2. Win Probability */}
            <div className="p-3.5 bg-[#eaf8f0] border border-[#b2f2bb] rounded-xl min-w-0">
              <span className="text-xs font-semibold text-[#03a84e] block mb-0.5 truncate">
                낙찰 성공률 (경쟁도 반영)
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#03a84e] tabular-nums truncate">
                {simulation.winProb}%
              </div>
              <div className="text-[11px] text-[#2b8a3e] mt-1 flex items-center justify-between font-medium">
                <span>경쟁 예상 인원</span>
                <span className="font-mono font-bold">
                  약 {p.expected_bidders}명
                </span>
              </div>
            </div>

            {/* 3. Minimum Cash Required (70% LTV loan) */}
            <div className="p-3.5 bg-[#f0f6ff] border border-[#d6e4ff] rounded-xl min-w-0">
              <span className="text-xs font-semibold text-[#2b66f6] block mb-0.5 truncate">
                최소 실투자금 (대출 70% 기준)
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#1a56db] tabular-nums truncate">
                {formatWon(
                  calcMinInitialInvestment(
                    bidPrice,
                    simulation.acqTaxInfo.total,
                    simulation.totalOperatingCost,
                    assumedRights,
                    0.70
                  ).minCash
                )}
              </div>
              <div className="text-[11px] text-[#4b6fa8] mt-1 flex items-center justify-between font-medium">
                <span>무대출 총자금</span>
                <span className="font-mono text-[#4b6fa8] truncate">
                  {formatWon(simulation.totalCashRequired)}
                </span>
              </div>
            </div>
          </div>

          {/* Tax & Scenario Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 min-w-0">
            {/* Left: Financial Waterfall */}
            <div className="p-4 bg-white border border-[#e5e8eb] shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl space-y-2 text-xs min-w-0">
              <h4 className="font-bold text-[#191f28] mb-2 flex items-center justify-between">
                <span>정밀 비용 및 세무 공제 내역</span>
                <span className="text-[11px] text-[#8b95a1] font-normal">
                  2025~2026 현행세법 반영
                </span>
              </h4>

              <div className="flex justify-between py-1.5 border-b border-[#f2f4f6] text-[#4e5968] min-w-0">
                <span className="truncate">예상 재매도가 (실거래가 보정)</span>
                <span className="font-mono tabular-nums text-[#191f28] font-semibold shrink-0">
                  {formatNumber(marketPrice)}원
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[#f2f4f6] text-[#4e5968] min-w-0">
                <span className="truncate">나의 입찰가</span>
                <span className="font-mono tabular-nums text-[#191f28] font-medium shrink-0">
                  - {formatNumber(bidPrice)}원
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[#f2f4f6] text-[#4e5968] min-w-0">
                <span className="truncate">취득세 등 공과금 ({simulation.acqTaxInfo.ratePct}%)</span>
                <span className="font-mono tabular-nums text-[#6b7684] shrink-0">
                  - {formatNumber(simulation.acqTaxInfo.total)}원
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[#f2f4f6] text-[#4e5968] min-w-0">
                <span className="truncate">부대비용 (명도·인테리어·중개·등기)</span>
                <span className="font-mono tabular-nums text-[#6b7684] shrink-0">
                  - {formatNumber(simulation.totalSubCosts)}원
                </span>
              </div>

              {assumedRights > 0 && (
                <div className="flex justify-between py-1.5 border-b border-rose-100 text-[#e03131] min-w-0 font-medium">
                  <span className="truncate">대항력 임차인 인수보증금</span>
                  <span className="font-mono tabular-nums font-bold shrink-0">
                    - {formatNumber(assumedRights)}원
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b border-[#f2f4f6] text-[#4e5968] min-w-0">
                <span className="truncate">
                  양도소득세 ({holdingPeriod === 'under1' ? '1년 미만 77%' : holdingPeriod === 'under2' ? '1~2년 66%' : '2년 이상 누진'})
                </span>
                <span className="font-mono tabular-nums text-[#d97706] shrink-0">
                  - {formatNumber(simulation.transferTaxInfo.tax)}원
                </span>
              </div>

              <div className="flex justify-between pt-1.5 text-sm font-bold text-[#e03131] min-w-0">
                <span className="truncate">최종 세후 순이익</span>
                <span className="font-mono tabular-nums shrink-0">
                  +{formatNumber(simulation.netProfit)}원
                </span>
              </div>
            </div>

            {/* Right: Tax Controls & Custom Costs */}
            <div className="p-4 bg-white border border-[#e5e8eb] shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl space-y-3.5 text-xs min-w-0">
              {/* Holding Period Selector */}
              <div>
                <label className="font-bold text-[#191f28] block mb-1.5">
                  보유 기간 (양도소득세율 적용)
                </label>
                <div className="grid grid-cols-3 gap-1 bg-[#f4f6f8] p-1 rounded-lg">
                  <button
                    onClick={() => setHoldingPeriod('under1')}
                    className={`py-1.5 px-1 rounded-md text-xs font-semibold text-center transition-all truncate cursor-pointer ${
                      holdingPeriod === 'under1'
                        ? 'bg-white text-[#191f28] shadow-xs'
                        : 'text-[#6b7684] hover:text-[#191f28]'
                    }`}
                  >
                    1년 미만 (77%)
                  </button>
                  <button
                    onClick={() => setHoldingPeriod('under2')}
                    className={`py-1.5 px-1 rounded-md text-xs font-semibold text-center transition-all truncate cursor-pointer ${
                      holdingPeriod === 'under2'
                        ? 'bg-white text-[#191f28] shadow-xs'
                        : 'text-[#6b7684] hover:text-[#191f28]'
                    }`}
                  >
                    1~2년 (66%)
                  </button>
                  <button
                    onClick={() => setHoldingPeriod('over2')}
                    className={`py-1.5 px-1 rounded-md text-xs font-semibold text-center transition-all truncate cursor-pointer ${
                      holdingPeriod === 'over2'
                        ? 'bg-[#03c75a] text-white shadow-xs'
                        : 'text-[#6b7684] hover:text-[#191f28]'
                    }`}
                  >
                    2년 이상 (기본)
                  </button>
                </div>
                <span className="text-[11px] text-[#8b95a1] mt-1 block leading-tight">
                  단기매매 시 양도세 중과(77%·66%), 2년 이상 보유 시 일반 누진세율(6~45%)
                </span>
              </div>

              {/* Adjustable Costs */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-[#4e5968] mb-1 text-[11px]">
                    <span className="font-medium">명도/인도 예상 비용</span>
                    <span className="font-mono text-[#191f28] font-bold">{formatWon(customEviction)}</span>
                  </div>
                  <input
                    type="range"
                    min={1000000}
                    max={10000000}
                    step={500000}
                    value={customEviction}
                    onChange={(e) => setCustomEviction(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#d1d5db] rounded cursor-pointer accent-[#03c75a]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[#4e5968] mb-1 text-[11px]">
                    <span className="font-medium">수리/인테리어 보수비용</span>
                    <span className="font-mono text-[#191f28] font-bold">{formatWon(customRenovation)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30000000}
                    step={1000000}
                    value={customRenovation}
                    onChange={(e) => setCustomRenovation(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#d1d5db] rounded cursor-pointer accent-[#03c75a]"
                  />
                </div>
              </div>

              {/* Rights Caution Box */}
              {assumedRights > 0 ? (
                <div className="p-2.5 bg-[#fff5f5] border border-[#fed7d7] rounded-lg text-[#c92a2a] text-xs">
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#e03131]" />
                    <span>대항력 임차인 인수보증금 주의</span>
                  </div>
                  <p className="text-[11px] text-[#4e5968] leading-relaxed">
                    선순위 대항력 임차인 미배당으로 낙찰대금 외 <strong className="text-[#e03131]">{formatWon(assumedRights)}</strong>을 매수인이 별도 지급해야 합니다.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 bg-[#edf4fe] border border-[#d6e4ff] rounded-lg text-[#1a56db] text-xs">
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2b66f6]" />
                    <span>권리인수 위험 없음</span>
                  </div>
                  <p className="text-[11px] text-[#4e5968] leading-relaxed">
                    선순위 임차인이 없거나 배당요구 완료로 추가 인수 보증금은 0원입니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer: 네이버 스타일 닫기 버튼 */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#e5e8eb] bg-[#f9fafb] flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-[#8b95a1] truncate">
            * 최종 입찰 전 법원 공고 및 세무 상담 권장
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-[#03c75a] hover:bg-[#02b350] rounded-lg transition-colors cursor-pointer shrink-0 touch-manipulation shadow-xs"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
