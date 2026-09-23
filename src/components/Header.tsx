import React from 'react';
import { Building2, Layers, History, FileText } from 'lucide-react';

interface HeaderProps {
  activeTab: 'properties' | 'history';
  setActiveTab: (tab: 'properties' | 'history') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="border-b border-[#e5e8eb] bg-white sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 상단 메인 헤더 */}
        <div className="h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* 브랜드 명칭: 신뢰감 있는 부동산 경매 분석 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#03c75a] flex items-center justify-center text-white shrink-0 shadow-xs">
              <Building2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0 flex items-baseline gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-[#191f28] block truncate">
                부동산 경매 분석
              </span>
              <span className="hidden sm:inline-block text-xs text-[#8b95a1] font-medium truncate">
                법원경매정보·실거래가 분석
              </span>
            </div>
          </div>

          {/* 데스크톱용 네비게이션: 깔끔한 언더라인 탭 2개 */}
          <nav className="hidden sm:flex items-center gap-6 h-full">
            <button
              onClick={() => setActiveTab('properties')}
              className={`h-full flex items-center gap-1.5 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-[1px] px-1 ${
                activeTab === 'properties'
                  ? 'border-[#03c75a] text-[#03c75a]'
                  : 'border-transparent text-[#6b7684] hover:text-[#191f28]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>진행 경매 매물</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`h-full flex items-center gap-1.5 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-[1px] px-1 ${
                activeTab === 'history'
                  ? 'border-[#03c75a] text-[#03c75a]'
                  : 'border-transparent text-[#6b7684] hover:text-[#191f28]'
              }`}
            >
              <History className="w-4 h-4" />
              <span>과거 낙찰 이력</span>
            </button>
          </nav>

          {/* 데스크톱 우측 상태 뱃지 */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#edf9f2] text-[#03c75a] font-medium text-[11px] border border-[#03c75a]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#03c75a] animate-pulse" />
              대법원·국토부 실시간 연동
            </span>
          </div>
        </div>

        {/* 모바일 전용 2대 탭 바 */}
        <div className="sm:hidden border-t border-[#f2f4f6]">
          <nav className="grid grid-cols-2">
            <button
              onClick={() => setActiveTab('properties')}
              className={`py-3 text-xs font-bold flex items-center justify-center gap-1 border-b-2 -mb-[1px] transition-all touch-manipulation cursor-pointer ${
                activeTab === 'properties'
                  ? 'border-[#03c75a] text-[#03c75a]'
                  : 'border-transparent text-[#8b95a1]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>진행 매물</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 text-xs font-bold flex items-center justify-center gap-1 border-b-2 -mb-[1px] transition-all touch-manipulation cursor-pointer ${
                activeTab === 'history'
                  ? 'border-[#03c75a] text-[#03c75a]'
                  : 'border-transparent text-[#8b95a1]'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>낙찰 이력</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
