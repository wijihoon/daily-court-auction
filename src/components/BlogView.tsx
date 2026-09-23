import React, { useState } from 'react';
import { 
  FileText, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Calendar, 
  Coins, 
  Target, 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  MessageSquare, 
  ChevronRight,
  Calculator,
  Search
} from 'lucide-react';
import { BlogPost, BlogPostSummary, AuctionPropertyAnalysis } from '../types';
import { formatWon } from '../utils/calculator';
import { copyCaseNumberToClipboard, getCourtAuctionUrl } from '../utils/courtUrl';

interface BlogViewProps {
  blogData: BlogPostSummary;
  properties: AuctionPropertyAnalysis[];
  onOpenSimulator: (property: AuctionPropertyAnalysis) => void;
}

export const BlogView: React.FC<BlogViewProps> = ({
  blogData,
  properties,
  onOpenSimulator
}) => {
  const posts = blogData?.posts || [];
  const [selectedRank, setSelectedRank] = useState<number>(posts[0]?.rank || 1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const activePost = posts.find(p => p.rank === selectedRank) || posts[0];
  const matchedProperty = properties.find(p => p.case_no === activePost?.case_no);

  const handleCopyPost = async (post: BlogPost) => {
    try {
      await navigator.clipboard.writeText(post.content_markdown);
      setCopiedId(post.property_id || `rank-${post.rank}`);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleDownloadPost = (post: BlogPost) => {
    const element = document.createElement('a');
    const file = new Blob([post.content_markdown], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `블로그원고_${post.rank}위_${post.case_no}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadAll = () => {
    if (posts.length === 0) return;
    const combined = posts.map(p => `========================================\n[${p.rank}위] ${p.title}\n========================================\n\n${p.content_markdown}\n\n\n`).join('\n');
    const element = document.createElement('a');
    const file = new Blob([combined], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `경매_Top10_블로그원고_전체_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    p.address.toLowerCase().includes(filterQuery.toLowerCase()) ||
    p.case_no.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. 상단 안내 헤더 배너 */}
      <div className="bg-white border border-[#e5e8eb] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#edf9f2] text-[#03c75a] font-bold text-xs border border-[#03c75a]/20">
                <Sparkles className="w-3.5 h-3.5" />
                매일 배치 중복 제외 자동 생성
              </span>
              <span className="text-xs text-[#8b95a1] font-mono">
                생성일시: {blogData.generated_at}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#191f28] tracking-tight">
              네이버 블로그 원고 자동 생성 (점수 Top 10)
            </h1>
            <p className="text-xs sm:text-sm text-[#6b7684] mt-1 break-keep">
              기존 발행된 물건을 중복 제외하고 남은 매물에서 Top 10을 엄선합니다. 부족 시 과거 우수 낙찰 이력에서 연계 보충하며, 이모티콘 없이 실전 투자자 시각의 담백하고 전문적인 문체로 작성됩니다.
            </p>
          </div>

          {posts.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDownloadAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#f4f6f8] text-[#4e5968] hover:bg-[#e5e8eb] hover:text-[#191f28] transition-colors cursor-pointer border border-[#e5e8eb]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>전체 {posts.length}건 원고 일괄 다운로드 (.md)</span>
              </button>
            </div>
          )}
        </div>

        {/* 안내 카드 */}
        <div className="mt-4 pt-4 border-t border-[#f2f4f6] grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-[#6b7684]">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#f9fafb]">
            <CheckCircle2 className="w-4 h-4 text-[#03c75a] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#191f28] block">이모티콘 없는 전문 투자자 톤</strong>
              <span>AI 특유의 상투적 어투와 이모티콘을 전면 배제한 정갈한 원고</span>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#f9fafb]">
            <Coins className="w-4 h-4 text-[#2b66f6] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#191f28] block">매일 배치 시 중복 자동 배제</strong>
              <span>기발행된 물건을 제외하고 남은 물건 및 과거 이력 순차 보충</span>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#f9fafb]">
            <MessageSquare className="w-4 h-4 text-[#e03131] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#191f28] block">비밀댓글 문의 유도 문구 내장</strong>
              <span>포스팅 하단에 타 지역 경매물건 요청 유입 CTA 자동 삽입</span>
            </div>
          </div>
        </div>
      </div>

      {/* 포스팅이 없는 경우 (진행 물건 및 과거 이력 모두 소진 시) */}
      {posts.length === 0 ? (
        <div className="bg-white border border-[#e5e8eb] rounded-2xl p-12 text-center max-w-xl mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#f4f6f8] text-[#8b95a1] flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#191f28]">
            금일 신규 생성된 블로그 콘텐츠가 없습니다
          </h3>
          <p className="text-xs text-[#6b7684] leading-relaxed">
            진행 중 경매 물건 및 과거 이력 매물 중 미발행된 대상이 모두 소진되어 중복 방지 규칙에 따라 콘텐츠를 생성하지 않았습니다.
          </p>
        </div>
      ) : (
        /* 2. 메인 영역: 좌측 10개 목록 + 우측 상세 원고 뷰어 */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 좌측 리스트 (Top 10 네비게이터) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#4e5968] flex items-center gap-1">
                <span>선정된 Top 10 매물</span>
                <span className="text-[#03c75a]">({posts.length}건)</span>
              </span>
              <span className="text-[11px] text-[#8b95a1]">점수 높은 순</span>
            </div>

            {/* 검색창 */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8b95a1] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="단지명, 사건번호, 지역 검색..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 text-xs bg-white border border-[#e5e8eb] rounded-xl focus:outline-none focus:border-[#03c75a] focus:ring-1 focus:ring-[#03c75a] transition-all"
              />
            </div>

            {/* 10개 카드 목록 */}
            <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
              {filteredPosts.map((post) => {
                const isSelected = post.rank === selectedRank;
                return (
                  <div
                    key={post.rank}
                    onClick={() => setSelectedRank(post.rank)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative ${
                      isSelected
                        ? 'bg-white border-[#03c75a] shadow-sm ring-1 ring-[#03c75a]'
                        : 'bg-white border-[#e5e8eb] hover:border-[#ccd2d8] hover:bg-[#fafbfc]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-extrabold font-mono shrink-0 ${
                          post.rank <= 3
                            ? 'bg-[#03c75a] text-white'
                            : 'bg-[#eef0f2] text-[#4e5968]'
                        }`}>
                          {post.rank}
                        </span>
                        <span className="text-xs font-mono font-semibold text-[#6b7684]">
                          {post.case_no}
                        </span>
                        {post.is_past ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#fff3e0] text-[#e65100] font-medium border border-[#ffe0b2]">
                            과거 사례
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#e8f5e9] text-[#2e7d32] font-medium border border-[#c8e6c9]">
                            진행 매물
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#f0f9f3] text-[#03c75a] border border-[#03c75a]/20">
                        {post.score}점
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-[13px] font-bold text-[#191f28] line-clamp-1 mb-1">
                      {post.complex_name} ({post.usage})
                    </h4>

                    <p className="text-[11px] text-[#8b95a1] line-clamp-1 mb-2">
                      {post.address}
                    </p>

                    <div className="pt-2 border-t border-[#f2f4f6] flex items-center justify-between text-[11px] font-mono">
                      <div>
                        <span className="text-[#8b95a1] mr-1">
                          {post.is_past ? '낙찰가:' : '추천가:'}
                        </span>
                        <strong className="text-[#191f28] font-bold">{formatWon(post.recommended_bid_price)}</strong>
                      </div>
                      <div>
                        <span className="text-[#2b66f6] mr-1">실투자:</span>
                        <strong className="text-[#2b66f6] font-bold">{formatWon(post.min_initial_investment)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 우측 원고 뷰어 & 복사 패널 */}
          {activePost && (
            <div className="lg:col-span-8 bg-white border border-[#e5e8eb] rounded-2xl shadow-xs overflow-hidden sticky top-20">
              {/* 뷰어 상단 액션 바 */}
              <div className="p-4 sm:p-5 border-b border-[#e5e8eb] bg-[#fafbfc] flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-md bg-[#03c75a] text-white text-xs font-extrabold font-mono flex items-center justify-center">
                      #{activePost.rank}
                    </span>
                    <span className="text-xs text-[#8b95a1] font-mono font-medium">
                      {activePost.court} · {activePost.case_no}
                    </span>
                    {activePost.is_past ? (
                      <span className="text-xs font-bold text-[#e65100] px-1.5 py-0.2 rounded bg-[#fff3e0]">
                        과거 낙찰 사례 복기
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-[#03c75a] px-1.5 py-0.2 rounded bg-[#edf9f2]">
                        진행 중 경매 매물
                      </span>
                    )}
                    <span className="text-xs font-bold text-[#4e5968] px-1.5 py-0.2 rounded bg-[#f4f6f8]">
                      종합 {activePost.score}점
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-[#191f28] line-clamp-1">
                    {activePost.title}
                  </h2>
                </div>

                {/* 핵심 액션 버튼군 */}
                <div className="flex items-center gap-2 shrink-0">
                  {matchedProperty && (
                    <button
                      type="button"
                      onClick={() => onOpenSimulator(matchedProperty)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#e5e8eb] text-[#4e5968] hover:text-[#191f28] hover:bg-[#f4f6f8] transition-colors cursor-pointer"
                      title="해당 물건 시뮬레이터 실행"
                    >
                      <Calculator className="w-3.5 h-3.5 text-[#03c75a]" />
                      <span>시뮬레이터</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDownloadPost(activePost)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#e5e8eb] text-[#4e5968] hover:text-[#191f28] hover:bg-[#f4f6f8] transition-colors cursor-pointer"
                    title="마크다운 파일 다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">.md 다운로드</span>
                  </button>

                  {/* 가장 중요한 1클릭 복사 버튼 */}
                  <button
                    type="button"
                    onClick={() => handleCopyPost(activePost)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      copiedId === (activePost.property_id || `rank-${activePost.rank}`)
                        ? 'bg-[#191f28] text-white'
                        : 'bg-[#03c75a] hover:bg-[#02b350] text-white active:scale-95'
                    }`}
                  >
                    {copiedId === (activePost.property_id || `rank-${activePost.rank}`) ? (
                      <>
                        <Check className="w-4 h-4 text-[#03c75a]" />
                        <span>복사 완료! (스마트에디터에 Ctrl+V)</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>네이버 블로그용 원고 복사</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 원고 본문 렌더링 영역 */}
              <div className="p-5 sm:p-7 max-h-[680px] overflow-y-auto space-y-6 text-[#333d4b] leading-relaxed text-xs sm:text-sm select-text">
                {/* 제목 영역 */}
                <div className="space-y-2 pb-5 border-b border-[#f2f4f6]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {activePost.tags.slice(0, 5).map((t, idx) => (
                      <span key={idx} className="text-[11px] font-medium text-[#2b66f6] bg-[#f0f6ff] px-2 py-0.5 rounded-md">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <h1 className="text-lg sm:text-xl font-extrabold text-[#191f28] leading-snug">
                    {activePost.title}
                  </h1>
                  <p className="text-xs text-[#8b95a1] font-medium">
                    {activePost.court} · {activePost.case_no} · 매각기일 {activePost.sale_date}
                  </p>
                </div>

                {/* 본문 마크다운 포맷팅 뷰 */}
                <div className="prose prose-sm max-w-none text-[#333d4b] whitespace-pre-line leading-relaxed font-sans font-normal">
                  {activePost.content_markdown}
                </div>

                {/* 하단 강조 박스: 댓글 유도 문구 안내 */}
                <div className="p-4 bg-[#f8f9fa] border border-[#e5e8eb] rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#191f28]">
                    <MessageSquare className="w-4 h-4 text-[#03c75a]" />
                    <span>블로그 하단 자동 삽입된 문의 유도 문구</span>
                  </div>
                  <p className="text-[#6b7684] pl-5 leading-relaxed">
                    "이번 포스팅에서 다룬 물건 외에, 수도권 및 전국 법원 경매의 알짜 추천 물건 정보나 맞춤 권리분석 자료를 따로 받아보고 싶으신 분은 비밀댓글로 [희망지역 / 가용 자본금 / 연락처 또는 이메일]을 남겨주시면 순차적으로 선별하여 안내해 드리겠습니다."
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

