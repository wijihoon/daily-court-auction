import React, { useState, useMemo } from 'react';
import { CalibrationData } from '../types';
import { formatWon } from '../utils/calculator';
import { getCourtAuctionUrl, copyCaseNumberToClipboard } from '../utils/courtUrl';
import {
  History,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Search,
  Award,
  ExternalLink,
  ArrowUpDown,
} from 'lucide-react';

interface PastHistoryViewProps {
  calibration: CalibrationData;
}

export const PastHistoryView: React.FC<PastHistoryViewProps> = ({ calibration }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'전체' | '낙찰' | '유찰'>('전체');
  const [sortBy, setSortBy] = useState<'actual_ratio' | 'pred_ratio' | 'appraisal' | 'bidders'>('actual_ratio');
  const [visibleCount, setVisibleCount] = useState<number>(40);

  // 필터나 정렬 변경 시 표시 개수 리셋
  React.useEffect(() => {
    setVisibleCount(40);
  }, [search, statusFilter, sortBy]);

  const records = calibration.joined_records || [];

  // 과거 이력 통계 요약
  const stats = useMemo(() => {
    const successfulRecords = records.filter(
      (r) => r.actual_status === '낙찰' && r.actual_ratio != null
    );
    const avgActualRatio =
      successfulRecords.length > 0
        ? successfulRecords.reduce((sum, r) => sum + (r.actual_ratio || 0), 0) /
          successfulRecords.length
        : 0;

    const winCount = records.filter((r) => r.would_win).length;
    const winRate = records.length > 0 ? Math.round((winCount / records.length) * 100) : 0;

    return {
      total: records.length,
      successful: successfulRecords.length,
      avgActualRatio: Number((avgActualRatio * 100).toFixed(1)),
      winRate,
      winCount,
    };
  }, [records]);

  // 필터링 및 내림차순 정렬된 과거 이력
  const filteredRecords = useMemo(() => {
    let list = records.filter((r) => {
      if (statusFilter !== '전체' && r.actual_status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          r.case_no.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.usage.toLowerCase().includes(q)
        );
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'actual_ratio') {
        return (b.actual_ratio ?? -1) - (a.actual_ratio ?? -1);
      }
      if (sortBy === 'pred_ratio') {
        return (b.predicted_ratio ?? 0) - (a.predicted_ratio ?? 0);
      }
      if (sortBy === 'appraisal') {
        return b.appraisal_price - a.appraisal_price;
      }
      if (sortBy === 'bidders') {
        return (b.actual_bidders ?? -1) - (a.actual_bidders ?? -1);
      }
      return 0;
    });

    return list;
  }, [records, statusFilter, search, sortBy]);

  const displayedRecords = useMemo(() => {
    return filteredRecords.slice(0, visibleCount);
  }, [filteredRecords, visibleCount]);

  return (
    <div className="space-y-3 sm:space-y-3.5 min-w-0">
      {/* 1. 상단 통계 요약 카드 (네이버 스타일 흰색 카드) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {/* 요약 1: 총 검증 이력 */}
        <div className="p-4 bg-white rounded-xl border border-[#e5e8eb] shadow-[0_1px_3px_rgba(0,0,0,0.03)] min-w-0">
          <span className="text-xs text-[#6b7684] block mb-1 flex items-center gap-1.5 truncate font-medium">
            <History className="w-3.5 h-3.5 text-[#03c75a] shrink-0" />
            <span>검증 완료 법원 사건</span>
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[#191f28] tabular-nums truncate">
            {stats.total}건
            <span className="text-xs font-normal text-[#8b95a1] ml-1.5">
              (낙찰 {stats.successful} / 유찰 {stats.total - stats.successful})
            </span>
          </div>
          <div className="text-[11px] text-[#8b95a1] mt-0.5 truncate">
            수도권 법원 실제 개찰 결과 대조
          </div>
        </div>

        {/* 요약 2: 과거 평균 실낙찰가율 */}
        <div className="p-4 bg-white rounded-xl border border-[#e5e8eb] shadow-[0_1px_3px_rgba(0,0,0,0.03)] min-w-0">
          <span className="text-xs text-[#6b7684] block mb-1 flex items-center gap-1.5 truncate font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[#2b66f6] shrink-0" />
            <span>과거 실제 평균 낙찰가율</span>
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[#2b66f6] tabular-nums truncate">
            {stats.avgActualRatio}%
          </div>
          <div className="text-[11px] text-[#8b95a1] mt-0.5 truncate">
            낙찰 사례 감정가 대비 실제 매각율
          </div>
        </div>

        {/* 요약 3: 모델 추천가 낙찰 적중률 */}
        <div className="p-4 bg-white rounded-xl border border-[#e5e8eb] shadow-[0_1px_3px_rgba(0,0,0,0.03)] min-w-0">
          <span className="text-xs text-[#6b7684] block mb-1 flex items-center gap-1.5 truncate font-medium">
            <Award className="w-3.5 h-3.5 text-[#03c75a] shrink-0" />
            <span>추천가 낙찰 적중률</span>
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[#03a84e] tabular-nums truncate">
            {stats.winRate}%
            <span className="text-xs font-normal text-[#8b95a1] ml-1.5">
              ({stats.winCount} / {stats.total}건)
            </span>
          </div>
          <div className="text-[11px] text-[#8b95a1] mt-0.5 truncate">
            고가 입찰 방지 및 마진 적중
          </div>
        </div>
      </div>

      {/* 2. 간편 검색 & 결과 필터 */}
      <div className="p-2 sm:p-2.5 bg-white rounded-xl border border-[#e5e8eb] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-[#8b95a1] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="사건번호, 아파트명 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 sm:py-2 bg-[#f8f9fa] rounded-lg border border-[#e5e8eb] text-xs text-[#191f28] placeholder-[#8b95a1] focus:outline-none focus:border-[#03c75a] focus:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 shrink-0">
          <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-[#f4f6f8] p-1 rounded-lg">
            {(['전체', '낙찰', '유찰'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`py-1 px-2.5 sm:py-1.5 sm:px-3 text-xs rounded-md font-semibold transition-all text-center cursor-pointer touch-manipulation ${
                  statusFilter === st
                    ? 'bg-white text-[#191f28] shadow-xs'
                    : 'text-[#6b7684] hover:text-[#191f28]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-[#f8f9fa] rounded-lg border border-[#e5e8eb] px-2.5 py-1.5 text-xs text-[#4e5968] shrink-0">
            <ArrowUpDown className="w-3 h-3 text-[#8b95a1] shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-[#191f28] font-medium focus:outline-none cursor-pointer text-xs pr-1"
              aria-label="과거 이력 정렬 기준"
            >
              <option value="actual_ratio">
                실낙찰가율
              </option>
              <option value="pred_ratio">
                예측가율
              </option>
              <option value="appraisal">
                감정가
              </option>
              <option value="bidders">
                입찰자수
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* 3-A. 모바일 전용 카드 뷰 */}
      <div className="sm:hidden space-y-2.5">
        {filteredRecords.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#8b95a1] bg-white rounded-xl border border-[#e5e8eb]">
            일치하는 과거 이력이 없습니다.
          </div>
        ) : (
          displayedRecords.map((r) => {
            const isWon = r.actual_status === '낙찰';
            const actualRatioPct = r.actual_ratio ? (r.actual_ratio * 100).toFixed(1) : '-';
            const predictedRatioPct = (r.predicted_ratio * 100).toFixed(1);
            const courtUrl = getCourtAuctionUrl('', r.case_no);

            return (
              <div
                key={r.id}
                className="bg-white border border-[#e5e8eb] rounded-xl p-3.5 space-y-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] min-w-0"
              >
                {/* 상단: 사건번호(법원 링크) & 낙찰 상태 */}
                <div className="flex items-center justify-between gap-2 text-xs min-w-0">
                  <a
                    href={courtUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => copyCaseNumberToClipboard(r.case_no)}
                    title="대법원 법원경매정보 사건검색(PGJ159M00) 이동 (새 창)"
                    className="inline-flex items-center gap-1 font-mono text-[#03c75a] hover:underline font-bold py-0.5 truncate cursor-pointer"
                  >
                    <span>{r.case_no}</span>
                    <span className="text-[#8b95a1] font-normal">({r.usage})</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                  </a>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${
                      isWon
                        ? 'bg-[#eaf8f0] text-[#03a84e] border border-[#03c75a]/20'
                        : 'bg-[#fef2f2] text-[#ef4444] border border-[#f87171]/20'
                    }`}
                  >
                    {isWon ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{r.actual_status}</span>
                  </span>
                </div>

                {/* 주소 */}
                <div className="text-xs font-bold text-[#191f28] line-clamp-2 break-keep">
                  {r.address}
                </div>

                {/* 핵심 비교: 실제 낙찰가 vs 추천 입찰가 (2열 박스) */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f2f4f6] text-xs min-w-0">
                  <div className="p-2.5 bg-[#f8f9fa] rounded-lg border border-[#e5e8eb] min-w-0">
                    <span className="text-[10px] text-[#8b95a1] block mb-0.5 truncate font-medium">실제 낙찰가</span>
                    {r.actual_price ? (
                      <>
                        <div className="font-extrabold text-[#e03131] font-mono text-xs sm:text-sm truncate">
                          {formatWon(r.actual_price)}
                        </div>
                        <span className="text-[10px] text-[#6b7684] font-mono block truncate">
                          낙찰가율 {actualRatioPct}%
                        </span>
                      </>
                    ) : (
                      <div className="text-[#8b95a1] text-xs font-mono font-medium">유찰</div>
                    )}
                  </div>

                  <div className="p-2.5 bg-[#f8f9fa] rounded-lg border border-[#e5e8eb] min-w-0">
                    <span className="text-[10px] text-[#8b95a1] block mb-0.5 truncate font-medium">당시 추천가</span>
                    <div className="font-extrabold text-[#2b66f6] font-mono text-xs sm:text-sm truncate">
                      {formatWon(r.predicted_bid)}
                    </div>
                    <span className="text-[10px] text-[#2b66f6] font-mono block truncate">
                      추천율 {predictedRatioPct}%
                    </span>
                  </div>
                </div>

                {/* 감정가 및 응찰자 수 정보 */}
                <div className="flex items-center justify-between text-[11px] text-[#6b7684] pt-0.5 truncate">
                  <span>감정 {formatWon(r.appraisal_price)}</span>
                  <span>{r.actual_bidders != null && r.actual_bidders > 0 ? `응찰 ${r.actual_bidders}명` : ''}</span>
                </div>

                {/* 메모 */}
                {r.notes && (
                  <div className="text-[11px] text-[#6b7684] bg-[#f8f9fa] p-2.5 rounded-lg border border-[#eef0f3] leading-relaxed break-keep">
                    {r.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3-B. 태블릿 & PC 전용 테이블 뷰 */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-[#e5e8eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-[#f9fafb] text-[#6b7684] text-[11px] border-b border-[#e5e8eb] font-semibold">
            <tr>
              <th className="py-3 px-3.5">과거 사건번호 / 소재지</th>
              <th className="py-3 px-3 text-center">결과</th>
              <th className="py-3 px-3 text-right">감정가</th>
              <th className="py-3 px-3 text-right text-[#e03131] font-bold bg-[#fff8f8] border-x border-[#fed7d7]">
                실제 낙찰가 (낙찰가율)
              </th>
              <th className="py-3 px-3 text-right text-[#2b66f6] font-bold bg-[#f8fbff] border-r border-[#d6e4ff]">
                당시 추천 입찰가
              </th>
              <th className="py-3 px-3 text-center">응찰자</th>
              <th className="py-3 px-3 text-right">실제 재매매 시세</th>
              <th className="py-3 px-3.5">법원 결과 메모</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f2f4f6] font-normal text-[#191f28]">
            {displayedRecords.map((r) => {
              const isWon = r.actual_status === '낙찰';
              const actualRatioPct = r.actual_ratio ? (r.actual_ratio * 100).toFixed(1) : '-';
              const predictedRatioPct = (r.predicted_ratio * 100).toFixed(1);
              const courtUrl = getCourtAuctionUrl('', r.case_no);

              return (
                <tr key={r.id} className="hover:bg-[#f8f9fa] transition-colors">
                  {/* 사건번호 & 주소 */}
                  <td className="py-3 px-3.5">
                    <a
                      href={courtUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => copyCaseNumberToClipboard(r.case_no)}
                      title="대법원 법원경매정보 사건검색(PGJ159M00) 이동 (새 창)"
                      className="inline-flex items-center gap-1 font-mono font-bold text-[#03c75a] hover:underline text-xs cursor-pointer"
                    >
                      <span>{r.case_no}</span>
                      <span className="text-[#8b95a1] font-normal">({r.usage})</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                    <div className="text-[#333d4b] font-medium truncate max-w-xs mt-0.5" title={r.address}>
                      {r.address}
                    </div>
                  </td>

                  {/* 결과 */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        isWon
                          ? 'bg-[#eaf8f0] text-[#03a84e] border border-[#03c75a]/20'
                          : 'bg-[#fef2f2] text-[#ef4444] border border-[#f87171]/20'
                      }`}
                    >
                      {isWon ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {r.actual_status}
                    </span>
                  </td>

                  {/* 감정가 */}
                  <td className="py-3 px-3 text-right font-mono text-[#4e5968] tabular-nums">
                    {formatWon(r.appraisal_price)}
                  </td>

                  {/* 실제 낙찰가 (낙찰가율) */}
                  <td className="py-3 px-3 text-right font-mono tabular-nums bg-[#fffcfc] border-x border-[#fed7d7]">
                    {r.actual_price ? (
                      <>
                        <span className="font-extrabold text-[#e03131] text-xs sm:text-sm block">
                          {formatWon(r.actual_price)}
                        </span>
                        <span className="text-[11px] text-[#c92a2a] block">
                          낙찰가율 {actualRatioPct}%
                        </span>
                      </>
                    ) : (
                      <span className="text-[#8b95a1]">유찰 (미낙찰)</span>
                    )}
                  </td>

                  {/* 당시 추천 입찰가 */}
                  <td className="py-3 px-3 text-right font-mono tabular-nums bg-[#fafffc] border-r border-[#d6e4ff]">
                    <span className="font-bold text-[#2b66f6] text-xs block">
                      {formatWon(r.predicted_bid)}
                    </span>
                    <span className="text-[11px] text-[#2b66f6] block">
                      추천가율 {predictedRatioPct}%
                    </span>
                    <span className="text-[10px] text-[#8b95a1] block">
                      {r.would_win ? '낙찰권 진입' : '보수적 마진 확보'}
                    </span>
                  </td>

                  {/* 응찰자 수 */}
                  <td className="py-3 px-3 text-center font-mono text-[#4e5968]">
                    {r.actual_bidders != null && r.actual_bidders > 0 ? `${r.actual_bidders}명` : '-'}
                  </td>

                  {/* 실제 재매각 시세 */}
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-[#4e5968]">
                    {r.actual_resale ? (
                      <div>
                        <span className="text-[#03a84e] font-bold block">
                          {formatWon(r.actual_resale)}
                        </span>
                        {r.actual_price && (
                          <span className="text-[10px] text-[#8b95a1] block">
                            차익 +{formatWon(r.actual_resale - r.actual_price)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#8b95a1]">-</span>
                    )}
                  </td>

                  {/* 메모 */}
                  <td className="py-3 px-3.5 text-[#6b7684] text-[11px] max-w-xs leading-relaxed">
                    {r.notes || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 과거 이력 더보기 버튼 */}
      {visibleCount < filteredRecords.length && (
        <div className="pt-2 pb-6 flex flex-col items-center justify-center gap-1.5">
          <button
            onClick={() => setVisibleCount((prev) => prev + 40)}
            className="px-6 py-2.5 bg-white hover:bg-[#f8f9fa] text-[#191f28] font-bold text-xs rounded-xl border border-[#d1d5db] transition-colors cursor-pointer shadow-xs"
          >
            과거 이력 더보기 (+40건) · {Math.min(visibleCount, filteredRecords.length)} / {filteredRecords.length}건
          </button>
          <span className="text-[11px] text-[#8b95a1]">
            남은 과거 이력 {filteredRecords.length - visibleCount}건
          </span>
        </div>
      )}
    </div>
  );
};
