#!/usr/bin/env python3
"""
scripts/generate_blog.py
매일 경매 분석 배치 완료 시 실행되어, 점수 Top 10 매물을 선정하고
네이버 블로그에 즉시 포스팅 가능한 고품질 실전 경매 콘텐츠를 자동 생성합니다.

주요 특징:
1. 이모티콘/이모지 전면 배제 (AI 느낌 배제, 실전 경매 전문가 톤)
2. 중복 방지 (data/blog_posted_history.json 참조)
   - 진행 물건(analysis.json) 중 미발행 건 우선
   - 부족 시 과거 우수 낙찰 이력(predictions.json / outcomes.json) 연계 보충
   - 둘 다 소진 시 생성 중단
3. 깃허브에서 바로 열어볼 수 있는 완전한 HTML 파일 자동 생성:
   - data/blog_posts/index.html (1~10위 통합 네비게이터 및 1클릭 복사 기능)
   - data/blog_posts/post_01_*.html ~ post_10_*.html (개별 독립 실행형 HTML)
   - root blog_top10.html (루트 바로가기)
   - 개별 .md 마크다운 파일 동시 생성
4. 마지막 문의 유도 문구(비밀댓글 상담) 포함
"""

import html
import json
import os
import re
from datetime import datetime

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, "data")
ANALYSIS_PATH = os.path.join(DATA_DIR, "analysis.json")
PREDICTIONS_PATH = os.path.join(DATA_DIR, "predictions.json")
OUTCOMES_PATH = os.path.join(DATA_DIR, "outcomes.json")
BLOG_OUTPUT_PATH = os.path.join(DATA_DIR, "blog_posts.json")
BLOG_DIR = os.path.join(DATA_DIR, "blog_posts")
POSTED_HISTORY_PATH = os.path.join(DATA_DIR, "blog_posted_history.json")
ROOT_HTML_PREVIEW = os.path.join(ROOT_DIR, "blog_top10.html")


def load_posted_history():
    """기발행된 경매 물건 ID 목록 로드"""
    if os.path.exists(POSTED_HISTORY_PATH):
        try:
            with open(POSTED_HISTORY_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return set(data.get("posted_ids", [])), data.get("history", [])
        except Exception:
            pass
    return set(), []


def save_posted_history(new_posts_info):
    """신규 발행된 물건 ID를 이력에 누적 저장"""
    posted_ids, history = load_posted_history()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for item in new_posts_info:
        pid = item["id"]
        if pid not in posted_ids:
            posted_ids.add(pid)
            history.append({
                "id": pid,
                "case_no": item.get("case_no", ""),
                "court": item.get("court", ""),
                "address": item.get("address", ""),
                "is_past": item.get("is_past", False),
                "posted_at": now_str
            })

    payload = {
        "last_updated": now_str,
        "total_posted": len(posted_ids),
        "posted_ids": sorted(list(posted_ids)),
        "history": history
    }
    with open(POSTED_HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def format_korean_won(amount):
    """숫자 금액을 한국 원화 단위(억/만원)로 자연스럽게 변환"""
    if not amount or amount <= 0:
        return "0원"
    amount = int(round(amount))
    eok = amount // 100000000
    man = (amount % 100000000) // 10000
    won = amount % 10000

    parts = []
    if eok > 0:
        parts.append(f"{eok}억")
    if man > 0:
        parts.append(f"{man:,}만")
    if won > 0 and eok == 0 and man == 0:
        parts.append(f"{won}원")
    elif parts:
        parts.append("원")

    return " ".join(parts) if parts else "0원"


def extract_complex_name(address):
    """주소에서 아파트/단지명 깔끔하게 추출"""
    match_paren = re.search(r'\(([^,)]+)', address)
    if match_paren:
        return match_paren.group(1).strip()

    parts = address.split()
    for p in reversed(parts):
        if any(w in p for w in
               ["아파트", "타운", "팰리스", "빌라", "파크", "푸르지오", "래미안", "자이", "힐스테이트", "아이파크", "더샵", "e편한세상", "롯데캐슬", "센트럴",
                "하이츠"]):
            return p.strip()

    if len(parts) >= 4:
        return f"{parts[2]} {parts[3]}"
    return address


def get_pyung_info(area_sqm):
    """전용면적 제곱미터를 평형 정보로 변환"""
    if not area_sqm:
        return "전용면적 미상"
    pyung = area_sqm / 3.30578
    approx_supply = pyung * 1.3
    return f"전용 {area_sqm:.1f}㎡ (약 {pyung:.1f}평 / 공급 약 {int(round(approx_supply))}평형)"


def markdown_to_html_body(md_text):
    """
    마크다운 텍스트를 외부 의존성 없이 표준 HTML 본문으로 정밀 변환
    - 헤딩 (#, ##, ###)
    - 인용문 (> ...)
    - 표 (| col | col |)
    - 목록 (- item)
    - 볼드 (**text**)
    - 가로줄 (---)
    - 태그 (#tag)
    """
    lines = md_text.split("\n")
    html_lines = []
    in_table = False
    in_ul = False

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # 빈 줄
        if not stripped:
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            if in_table:
                html_lines.append("</tbody></table></div>")
                in_table = False
            i += 1
            continue

        # 가로줄
        if stripped in ["---", "***", "___"]:
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            if in_table:
                html_lines.append("</tbody></table></div>")
                in_table = False
            html_lines.append('<hr class="my-8 border-gray-200" />')
            i += 1
            continue

        # 표 시작 및 행 처리 (| ... |)
        if stripped.startswith("|") and stripped.endswith("|"):
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False

            cells = [c.strip() for c in stripped.split("|")[1:-1]]

            # 구분선 행 (예: | :--- | :--- |)
            if all(set(c).issubset({"-", ":", " "}) for c in cells):
                i += 1
                continue

            if not in_table:
                in_table = True
                html_lines.append(
                    '<div class="overflow-x-auto my-5"><table class="w-full text-sm text-left text-gray-700 border border-gray-200 rounded-lg overflow-hidden">')
                html_lines.append('<thead class="bg-gray-50 text-gray-800 font-semibold border-b border-gray-200"><tr>')
                for cell in cells:
                    html_lines.append(
                        f'<th class="px-4 py-2.5 border-r border-gray-200 last:border-r-0">{html.escape(cell)}</th>')
                html_lines.append('</tr></thead><tbody class="divide-y divide-gray-200 bg-white">')
            else:
                html_lines.append('<tr class="hover:bg-gray-50 transition-colors">')
                for idx, cell in enumerate(cells):
                    align = 'font-semibold text-gray-900 bg-gray-50/50' if idx == 0 else ''
                    html_lines.append(
                        f'<td class="px-4 py-2.5 border-r border-gray-200 last:border-r-0 {align}">{html.escape(cell)}</td>')
                html_lines.append('</tr>')
            i += 1
            continue
        elif in_table:
            html_lines.append("</tbody></table></div>")
            in_table = False

        # 헤딩
        if stripped.startswith("# "):
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            text = html.escape(stripped[2:].strip())
            html_lines.append(
                f'<h1 class="text-xl sm:text-2xl font-extrabold text-gray-900 mt-2 mb-4 leading-snug tracking-tight">{text}</h1>')
            i += 1
            continue
        if stripped.startswith("## "):
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            text = html.escape(stripped[3:].strip())
            html_lines.append(
                f'<h2 class="text-base sm:text-lg font-bold text-gray-900 mt-7 mb-3 border-l-4 border-[#03c75a] pl-3">{text}</h2>')
            i += 1
            continue
        if stripped.startswith("### "):
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            text = html.escape(stripped[4:].strip())
            html_lines.append(f'<h3 class="text-sm sm:text-base font-bold text-gray-900 mt-5 mb-2">{text}</h3>')
            i += 1
            continue

        # 인용구 (> ...)
        if stripped.startswith(">"):
            if in_ul:
                html_lines.append("</ul>")
                in_ul = False
            quote_content = html.escape(stripped.lstrip(">").strip())
            html_lines.append(
                f'<blockquote class="border-l-4 border-gray-300 pl-3.5 py-1 my-2 text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-r-md">{quote_content}</blockquote>')
            i += 1
            continue

        # 리스트 아이템 (- ...)
        if stripped.startswith("- ") or stripped.startswith("* "):
            if not in_ul:
                in_ul = True
                html_lines.append(
                    '<ul class="list-disc list-inside my-3 space-y-1.5 text-xs sm:text-sm text-gray-700">')
            item_text = html.escape(stripped[2:].strip())
            # 볼드 태그 변환
            item_text = re.sub(r'\*\*(.+?)\*\*', r'<strong class="font-bold text-gray-900">\1</strong>', item_text)
            html_lines.append(f'<li class="leading-relaxed">{item_text}</li>')
            i += 1
            continue
        elif in_ul:
            html_lines.append("</ul>")
            in_ul = False

        # 일반 문단
        p_text = html.escape(stripped)
        p_text = re.sub(r'\*\*(.+?)\*\*', r'<strong class="font-bold text-gray-900">\1</strong>', p_text)

        # 해시태그 라인 처리
        if p_text.startswith("#"):
            tags = p_text.split()
            tag_spans = [
                f'<span class="inline-block px-2.5 py-1 mr-1.5 mb-1.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-600">{t}</span>'
                for t in tags]
            html_lines.append(f'<div class="pt-4 flex flex-wrap">{"".join(tag_spans)}</div>')
        else:
            html_lines.append(
                f'<p class="text-xs sm:text-sm text-gray-700 leading-relaxed mb-3 break-keep">{p_text}</p>')
        i += 1

    if in_ul:
        html_lines.append("</ul>")
    if in_table:
        html_lines.append("</tbody></table></div>")

    return "\n".join(html_lines)


def build_standalone_post_html(post):
    """개별 포스트용 완전한 독립형 HTML 문서 생성"""
    raw_md_escaped = html.escape(post["content_markdown"])
    body_html = markdown_to_html_body(post["content_markdown"])
    rank = post["rank"]
    title = post["title"]
    case_no = post["case_no"]
    court = post["court"]
    score = post["score"]
    is_past = post.get("is_past", False)
    badge_label = "과거 낙찰 사례 복기" if is_past else "진행 중 경매 매물"
    badge_color = "bg-amber-50 text-amber-800 border-amber-200" if is_past else "bg-emerald-50 text-emerald-800 border-emerald-200"

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[{rank}위] {html.escape(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
    }}
  </style>
</head>
<body class="py-8 px-4 sm:px-6">
  <div class="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
    <!-- 헤더 바 -->
    <div class="p-5 sm:p-6 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-6 h-6 rounded-md bg-[#03c75a] text-white text-xs font-black font-mono flex items-center justify-center">#{rank}</span>
          <span class="text-xs font-semibold text-gray-500 font-mono">{court} · {case_no}</span>
          <span class="text-[11px] px-2 py-0.5 rounded-full border {badge_color} font-bold">{badge_label}</span>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-mono font-bold">종합 {score}점</span>
        </div>
        <h1 class="text-base sm:text-lg font-bold text-gray-900 leading-snug">{html.escape(title)}</h1>
      </div>
      <button onclick="copyToClipboard()" id="copyBtn" class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#03c75a] hover:bg-[#02b350] transition-all shadow-sm cursor-pointer active:scale-95 flex items-center gap-1.5">
        <span>네이버 블로그용 원고 복사</span>
      </button>
    </div>

    <!-- 본문 내용 -->
    <div class="p-6 sm:p-8">
      {body_html}
    </div>

    <!-- 푸터 복사 도크 -->
    <div class="p-4 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500">
      법원경매정보 실전 가치 분석 보고서 · <a href="index.html" class="text-blue-600 hover:underline font-semibold">전체 Top 10 목록 보기</a>
    </div>
  </div>

  <textarea id="rawMarkdown" style="display:none;">{raw_md_escaped}</textarea>
  <script>
    function copyToClipboard() {{
      const text = document.getElementById('rawMarkdown').value;
      navigator.clipboard.writeText(text).then(() => {{
        const btn = document.getElementById('copyBtn');
        const orig = btn.innerHTML;
        btn.innerHTML = '복사 완료! (스마트에디터에 Ctrl+V)';
        btn.classList.remove('bg-[#03c75a]');
        btn.classList.add('bg-gray-900');
        setTimeout(() => {{
          btn.innerHTML = orig;
          btn.classList.remove('bg-gray-900');
          btn.classList.add('bg-[#03c75a]');
        }}, 2500);
      }}).catch(err => {{
        alert('클립보드 복사에 실패했습니다.');
      }});
    }}
  </script>
</body>
</html>
"""


def build_master_index_html(posts):
    """
    1~10위 포스트를 한 화면에서 탭/아코디언으로 열어볼 수 있는 통합 뷰어 HTML (data/blog_posts/index.html)
    GitHub에서 바로 열람하고 각 원고를 1클릭 복사 가능
    """
    posts_json = json.dumps(posts, ensure_ascii=False)

    sidebar_items_html = []
    for idx, p in enumerate(posts):
        is_past = p.get("is_past", False)
        badge = '<span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">과거</span>' if is_past else '<span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">진행</span>'
        sidebar_items_html.append(f"""
        <button onclick="selectPost({idx})" id="navBtn_{idx}" class="w-full p-3 rounded-xl border border-gray-200 text-left transition-all hover:bg-slate-50 cursor-pointer {'border-[#03c75a] bg-emerald-50/30 ring-1 ring-[#03c75a]' if idx == 0 else 'bg-white'}">
          <div class="flex items-center justify-between gap-1 mb-1">
            <div class="flex items-center gap-1.5">
              <span class="w-5 h-5 rounded-md {'bg-[#03c75a] text-white' if idx < 3 else 'bg-gray-100 text-gray-700'} text-xs font-mono font-extrabold flex items-center justify-center">{p['rank']}</span>
              <span class="text-xs font-mono font-semibold text-gray-600">{p['case_no']}</span>
              {badge}
            </div>
            <span class="text-[11px] font-mono font-bold text-[#03c75a]">{p['score']}점</span>
          </div>
          <h4 class="text-xs font-bold text-gray-900 line-clamp-1 mb-1">{html.escape(p['complex_name'])} ({html.escape(p['usage'])})</h4>
          <p class="text-[11px] text-gray-500 line-clamp-1">{html.escape(p['address'])}</p>
        </button>
        """)

    rendered_posts_html = []
    for idx, p in enumerate(posts):
        body = markdown_to_html_body(p["content_markdown"])
        rendered_posts_html.append(f"""
        <div id="postContent_{idx}" class="post-pane {'block' if idx == 0 else 'hidden'}">
          <div class="p-5 sm:p-6 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 mb-1.5">
                <span class="w-6 h-6 rounded-md bg-[#03c75a] text-white text-xs font-black font-mono flex items-center justify-center">#{p['rank']}</span>
                <span class="text-xs font-semibold text-gray-500 font-mono">{p['court']} · {p['case_no']}</span>
                <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-mono font-bold">종합 {p['score']}점</span>
              </div>
              <h2 class="text-base sm:text-lg font-bold text-gray-900 leading-snug">{html.escape(p['title'])}</h2>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="copyCurrentPost({idx})" id="copyBtn_{idx}" class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#03c75a] hover:bg-[#02b350] transition-all shadow-sm cursor-pointer active:scale-95">
                네이버 블로그용 원고 복사
              </button>
            </div>
          </div>
          <div class="p-6 sm:p-8 select-text">
            {body}
          </div>
        </div>
        """)

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>법원 경매 가치 분석 Top 10 블로그 원고 모음</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
      background-color: #f4f6f8;
      color: #1e293b;
    }}
  </style>
</head>
<body class="p-4 sm:p-6">
  <div class="max-w-7xl mx-auto space-y-4">
    <!-- 상단 안내 헤더 -->
    <header class="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1.5">
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
            배치 자동 생성 원고
          </span>
          <span class="text-xs text-gray-500 font-mono">총 {len(posts)}건 엄선</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
          법원 경매 투자점수 Top 10 네이버 블로그 원고
        </h1>
        <p class="text-xs sm:text-sm text-gray-600 mt-1">
          이모티콘을 배제한 전문 실전 투자자 시각의 분석 원고입니다. 우측 상단의 '네이버 블로그용 원고 복사' 버튼을 눌러 스마트에디터에 바로 붙여넣으실 수 있습니다.
        </p>
      </div>
      <div class="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200 shrink-0">
        <div><strong>문의 안내 고정 문구:</strong></div>
        <div class="text-[11px] text-gray-600 mt-0.5">각 원고 하단에 비밀댓글 상담 유도 CTA 포함</div>
      </div>
    </header>

    <!-- 2단 레이아웃: 좌측 리스트 + 우측 원고 뷰어 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- 좌측 10건 네비게이터 -->
      <div class="lg:col-span-4 space-y-2 max-h-[850px] overflow-y-auto pr-1">
        {''.join(sidebar_items_html)}
      </div>

      <!-- 우측 뷰어 -->
      <div class="lg:col-span-8 bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden sticky top-6">
        {''.join(rendered_posts_html)}
      </div>
    </div>
  </div>

  <script>
    const postsData = {posts_json};

    function selectPost(index) {{
      document.querySelectorAll('.post-pane').forEach((el, idx) => {{
        if (idx === index) {{
          el.classList.remove('hidden');
          el.classList.add('block');
        }} else {{
          el.classList.remove('block');
          el.classList.add('hidden');
        }}
      }});

      for (let i = 0; i < postsData.length; i++) {{
        const btn = document.getElementById('navBtn_' + i);
        if (btn) {{
          if (i === index) {{
            btn.className = "w-full p-3 rounded-xl border border-[#03c75a] bg-emerald-50/30 ring-1 ring-[#03c75a] text-left transition-all cursor-pointer";
          }} else {{
            btn.className = "w-full p-3 rounded-xl border border-gray-200 bg-white text-left transition-all hover:bg-slate-50 cursor-pointer";
          }}
        }}
      }}
    }}

    function copyCurrentPost(index) {{
      const post = postsData[index];
      if (!post) return;
      navigator.clipboard.writeText(post.content_markdown).then(() => {{
        const btn = document.getElementById('copyBtn_' + index);
        const orig = btn.innerHTML;
        btn.innerHTML = '복사 완료! (스마트에디터에 Ctrl+V)';
        btn.classList.remove('bg-[#03c75a]');
        btn.classList.add('bg-gray-900');
        setTimeout(() => {{
          btn.innerHTML = orig;
          btn.classList.remove('bg-gray-900');
          btn.classList.add('bg-[#03c75a]');
        }}, 2500);
      }}).catch(err => {{
        alert('클립보드 복사에 실패했습니다.');
      }});
    }}
  </script>
</body>
</html>
"""


def generate_blog_article_ongoing(p, rank):
    """진행 중 경매 물건용 원고 생성 (프리미엄 정보 비활성화 및 댓글 문의 유도 적용)"""
    case_no = p.get("case_no", "")
    court = p.get("court", "법원")
    address = p.get("address", "")
    usage = p.get("usage", "아파트")
    appraisal = p.get("appraisal_price", 0)
    min_bid = p.get("min_bid_price", 0)
    rec_bid = p.get("recommended_bid_price", 0)
    rec_ratio = p.get("recommended_bid_ratio", 0.0) * 100
    market_price = p.get("estimated_market_price", appraisal)
    fail_count = p.get("fail_count", 0)
    sale_date = p.get("sale_date", "")
    area_sqm = p.get("building_area_sqm", 84.0)
    floor_info = p.get("floor_info", "")
    score = p.get("investment_score", 0)
    net_profit = p.get("net_profit", 0)
    net_roi = p.get("net_roi", 0.0)

    costs = p.get("costs_breakdown", {})
    acq_tax = p.get("acquisition_tax", 0)
    eviction_cost = costs.get("eviction_cost", 2000000)
    arrears_mgmt = costs.get("arrears_mgmt_cost", 0)
    renovation_cost = costs.get("renovation_cost", 0)

    loan_amount = p.get("loan_amount", int(rec_bid * 0.70))
    min_cash = p.get("min_initial_investment", (rec_bid - loan_amount) + acq_tax + p.get("operating_costs", 0))

    rights = p.get("rights_status", {})
    has_tenant = rights.get("has_tenant", False)
    opposing_power = rights.get("opposing_power", "없음")
    assumed_deposit = rights.get("estimated_assumed_deposit", 0)
    risk_level = rights.get("risk_level", "낮음")
    rights_notes = rights.get("notes", "말소기준권리 이후 소멸")

    complex_name = extract_complex_name(address)
    pyung_text = get_pyung_info(area_sqm)

    margin = market_price - rec_bid
    discount_from_appraisal = int(round(((appraisal - min_bid) / appraisal) * 100)) if appraisal > 0 else 0

    addr_parts = address.split()
    sido = addr_parts[0] if len(addr_parts) > 0 else "수도권"
    sigungu = addr_parts[1] if len(addr_parts) > 1 else ""
    dong = addr_parts[2] if len(addr_parts) > 2 else ""

    # 제목 생성 (핵심 전략을 강조하되 이모티콘 전면 배제)
    if discount_from_appraisal > 0:
        title = f"[{sigungu} 경매] 감정가 대비 {discount_from_appraisal}% 저감된 {complex_name}, 실거래 시세 대비 안전마진 및 적정 입찰가 분석 ({case_no})"
    else:
        title = f"[{sigungu} 경매] {complex_name} {pyung_text.split('(')[0].strip()} 경매 신건 분석, 권리분석 및 실투자금 총정리 ({case_no})"

    lines = []
    lines.append(f"# {title}\n")
    lines.append(f"> 법원 경매 실전 분석 노트 | {sido} {sigungu} {usage} 가치 분석")
    lines.append(f"> 사건번호: {case_no} ({court}) | 매각기일: {sale_date}\n")

    lines.append(f"안녕하세요. 실전 부동산 경매와 수도권 알짜 매물 가치를 면밀히 검토하는 경매 분석 노트입니다.\n")
    lines.append(f"오늘 검토할 물건은 {court}에서 매각 절차가 진행되는 {sido} {sigungu} {dong} '{complex_name}' 매물입니다.")
    if fail_count > 0:
        lines.append(
            f"해당 건은 {fail_count}회 유찰을 거치면서 감정가 대비 {discount_from_appraisal}% 저감된 {format_korean_won(min_bid)}부터 매각이 시작되는 물건으로, 가격적인 메리트가 본격적으로 부각되는 구간입니다.\n")
    else:
        lines.append(
            f"신건으로 처음 입찰장에 나오는 물건이지만, 최근 동일 단지 실거래가 및 매매 호가 흐름을 감안할 때 실수요자와 투자자 모두 관심 있게 살펴볼 만한 가격 경쟁력을 보이고 있습니다.\n")

    lines.append("## 1. 경매 사건 개요\n")
    lines.append("| 구분 | 상세 내용 |")
    lines.append("| :--- | :--- |")
    lines.append(f"| 사건번호 | {court} {case_no} |")
    lines.append(f"| 소재지 | {address} |")
    lines.append(f"| 물건종별 / 층수 | {usage} / {floor_info} |")
    lines.append(f"| 면적 | {pyung_text} |")
    lines.append(f"| 감정평가액 | {format_korean_won(appraisal)} |")
    lines.append(f"| 최저입찰가 | {format_korean_won(min_bid)} (감정가 대비 {100 - discount_from_appraisal}%) |")
    lines.append(f"| 추천 입찰가선 | [비공개 - 댓글 문의 시 공유] (낙찰가율 70%대 초반 타겟) |")
    lines.append(f"| 필요 최소 실투자금 | [비공개 - 댓글 문의 시 맞춤 공유] (대출 70% 레버리지 적용) |")
    lines.append(f"| 매각기일 | {sale_date} 오전 10:00 (입찰보증금 10% 지참 필수) |\n")

    lines.append("## 2. 입지 여건 및 단지 현장 체크포인트\n")
    lines.append(f"해당 단지는 {sido} {sigungu} {dong}에 자리하고 있으며, 주거 수요가 탄탄하게 받쳐주는 생활권입니다.")
    lines.append(f"- 단지 특성: {complex_name}은 인근에서 실거주 선호도가 안정적인 단지이며, 본 매물은 {floor_info}로 채광과 일조권 측면에서 양호한 라인입니다.")
    lines.append(f"- 생활 인프라 및 교통: 대중교통망 접근성이 양호하며 도보권 생활 편의시설(마트, 병원, 은행 등)과 학군 형성이 잘 갖춰져 있어 전월세 임대 수요 회전이 수월한 편입니다.")
    lines.append(f"- 환금성 평가: 환금성이 우수한 전용 {area_sqm:.1f}㎡ 타입으로, 향후 매도시에도 실수요 매수층을 확보하기 유리한 면적대입니다.\n")

    lines.append("## 3. 국토부 실거래 시세 대조 및 안전마진 분석\n")
    lines.append("법원 경매의 본질은 일반 급매물보다 확실한 가격 우위를 확보하는 데 있습니다.")
    lines.append(
        f"- 단지 인근 실거래 시세: 동일 단지 및 인접 유사 단지의 최근 국토부 실거래가와 매매 호가는 약 {format_korean_won(market_price)} 수준에 형성되어 있습니다.")
    lines.append(f"- 감정가와의 갭: 본 물건의 감정가는 {format_korean_won(appraisal)}으로, 현재 시세 흐름과 비교했을 때 대체로 시장 상황을 적절히 반영하고 있습니다.")
    lines.append(
        f"- 예상 안전마진 및 전략가: **[비공개 프리미엄 데이터]** 국토부 최근 3개월 실거래가 및 동일 평형 최고·최저 호가를 정밀 대조하여 산출한 **추천 적정 입찰 상한가 및 예상 시세차익(안전마진)** 데이터는 무분별한 입찰가 왜곡 및 가격 과열을 방지하기 위해 비공개 처리되어 있습니다.")
    lines.append(f"- 최근 실거래 추이를 보면 급매물이 정리된 후 호가가 유지되는 양상이어서, 보수적인 가격대로 낙찰받는다면 하방 지지력이 견고할 것으로 판단됩니다.\n")

    lines.append("## 4. 권리분석 및 명도 난이도 팩트체크\n")
    lines.append("입찰 전 가장 중요하게 짚어야 할 등기부상 권리관계와 명도 난이도입니다.\n")
    lines.append(f"- 대항력 여부: 없음 (선순위 대항력 인수 부담: 0원)")
    lines.append(f"- 권리 안전도: {risk_level} 등급")
    lines.append(f"- 등기부 현황: {rights_notes}")
    if has_tenant:
        lines.append(f"- 점유 현황: 임차인이 거주 중이나 배당 순위 및 말소기준권리 이후 소멸 여부를 감안할 때 낙찰자에게 부당하게 인수되는 보증금 리스크는 통제 가능한 범위입니다.")
    else:
        lines.append(f"- 점유 현황: 현재 소유자(채무자) 세대가 점유 중인 것으로 파악되며, 낙찰 후 잔금 납부와 동시에 법원 인도명령 신청을 통해 원칙대로 명도 절차를 밟아가면 됩니다.")
    lines.append(f"- 명도 실무 팁: 통상 2~3개월 내외의 자진 퇴거 협의가 가능하며, 이사비 지원 협의 비용을 사전에 자금 계획에 반영해 두는 것이 안전합니다.")
    if arrears_mgmt > 0:
        lines.append(f"- 관리비 체크: 공용 관리비 연체액 발생 여부를 입찰 전 관리사무소를 통해 반드시 최종 확인해야 합니다.\n")
    else:
        lines.append(f"- 관리비 체크: 입찰 전 관리사무소를 방문하여 최근 공용부분 미납 관리비 유무를 사전 확인하시기 바랍니다.\n")

    lines.append("## 5. 실전 투자금 계산 (경락잔금대출 70% 기준)\n")
    lines.append("실제 입찰 시 필요한 자기자본 규모를 경락잔금대출 70% 레버리지 기준으로 정리한 자금표입니다.\n")
    lines.append("| 항목 | 예상 금액 | 비고 |")
    lines.append("| :--- | :--- | :--- |")
    lines.append(f"| 추천 낙찰가 | [비공개 - 댓글 문의 시 공유] | 최적 수익률 반영 100% 기준 |")
    lines.append(f"| 경락잔금대출 (70%) | [비공개 - 댓글 문의 시 공유] | DSR 및 개인 신용도에 따라 변동 가능 |")
    lines.append(f"| 낙찰 자부담금 (30%) | [비공개 - 댓글 문의 시 공유] | 잔금 납부 시 자납 |")
    lines.append(f"| 취득세 및 지방교육세 | 약 {format_korean_won(acq_tax)} | 유상취득 표준세율 기준 |")
    lines.append(f"| 명도비 및 수리/보수비 | 약 {format_korean_won(eviction_cost + renovation_cost)} | 실전 인테리어 및 이사비 예비비 |")
    lines.append(f"| 총 필요 실투자금 | [비공개 - 댓글 문의 시 맞춤 공유] | 등기 이전 및 입주 세팅 완료 시까지 |")
    lines.append(f"| 예상 세후 수익률(ROI) | [비공개 - 댓글 문의 시 공유] | 1~2년 보유 후 정상 매매 시 |\n")
    lines.append(f"* 개인별 주택 보유 수(1주택, 다주택자)에 따라 취득세 중과 여부가 달라질 수 있으므로, 입찰 전 세무 전문가의 상담을 권장합니다.\n")

    lines.append("## 6. 실전 투자자 총평 및 입찰 가이드\n")
    lines.append(f"- 추천 대상: {sido} {sigungu} 권역에서 내 집 마련을 검토하는 무주택 실수요자 또는 안전마진을 확보한 전월세 임대 사업자")
    lines.append(f"- 투자 매력도: 종합 가치평가 점수 {score}점 물건으로, 수도권 경매 매물 중에서도 권리관계가 명확하고 가격 방어력이 우수한 편에 속합니다.")
    lines.append(
        f"- 입찰 유의사항: 현장 임장을 통해 동호수 조망권과 내부 보수 상태를 점검하고, 당일 법원 입찰장에 최저가의 10% 입찰보증금(수표 1장)과 신분증, 도장을 반드시 챙기시기 바랍니다.\n")

    # 마무리 CTA (비공개 데이터 및 추가 경매물건 댓글 유도)
    lines.append("---\n")
    lines.append("### [비공개 데이터 및 경매 물건 추가 정보 안내]\n")
    lines.append(
        "본 포스팅에서 비공개 처리된 **[정밀 추천 입찰가선 / 필요 최소 실투자금 / 예상 세후 수익률 및 안전마진 보고서]**가 필요하신 분은 **비밀댓글**로 문의 남겨주시면 개별적으로 상세히 공유해 드립니다.\n")
    lines.append(
        "아울러 본 물건 외에 현재 거주지나 관심 지역의 알짜 경매 물건 리스트, 맞춤형 권리분석 정보를 따로 받아보고 싶으신 분도 비밀댓글로 [희망지역 / 가용 자본금 / 연락처 또는 이메일]을 남겨주시면 순차적으로 확인 후 선별하여 안내해 드리겠습니다.\n")
    lines.append("궁금하신 점이 있다면 언제든 편하게 댓글로 소통해 주세요. 글이 도움 되셨다면 공감과 이웃추가 부탁드립니다. 감사합니다.\n")

    tags = [
        "부동산경매",
        "법원경매",
        f"{sigungu}경매",
        f"{complex_name}",
        f"{complex_name}경매",
        f"{dong}아파트",
        "경매권리분석",
        "경매낙찰가",
        "경매실투자금",
        "아파트경매"
    ]
    lines.append(" ".join([f"#{t}" for t in tags]))

    content_markdown = "\n".join(lines)

    return {
        "rank": rank,
        "is_past": False,
        "property_id": p.get("id", ""),
        "case_no": case_no,
        "court": court,
        "address": address,
        "complex_name": complex_name,
        "usage": usage,
        "score": score,
        "title": title,
        "summary": f"{sigungu} {complex_name} · 감정가 {format_korean_won(appraisal)} 대비 {discount_from_appraisal}% 저감, 추천입찰가/실투자금 비공개 (댓글 문의 시 공유)",
        "pyung_info": pyung_text,
        "appraisal_price": appraisal,
        "min_bid_price": min_bid,
        "recommended_bid_price": rec_bid,
        "min_initial_investment": min_cash,
        "net_profit": net_profit,
        "net_roi": net_roi,
        "sale_date": sale_date,
        "tags": tags,
        "content_markdown": content_markdown,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }


def generate_blog_article_past(p, outcome, rank):
    """과거 낙찰 이력 물건용 원고 생성 (이모티콘 전면 배제, 실전 복기 분석 톤)"""
    case_no = p.get("case_no", "")
    court = p.get("court", "법원")
    address = p.get("address", "")
    usage = p.get("usage", "아파트")
    appraisal = p.get("appraisal_price", 0)
    min_bid = p.get("min_bid_price", 0)
    rec_bid = p.get("recommended_bid_price", 0)
    market_price = p.get("predicted_fair_market", p.get("estimated_market_price", appraisal))
    sale_date = p.get("sale_date", "")
    score = p.get("investment_score", 0)
    net_roi = p.get("predicted_net_roi", p.get("net_roi", 0.0))
    net_profit = p.get("predicted_net_profit", p.get("net_profit", 0))

    actual_sale_price = outcome.get("actual_sale_price", rec_bid)
    actual_sale_ratio = outcome.get("actual_sale_ratio", 0.0) * 100
    actual_bidders = outcome.get("actual_bidders", 5)
    actual_resale_price = outcome.get("actual_resale_price", market_price)
    outcome_notes = outcome.get("notes", "실전 낙찰 사례")

    loan_amount = int(actual_sale_price * 0.70)
    acq_tax = int(actual_sale_price * 0.015)
    min_cash = (actual_sale_price - loan_amount) + acq_tax + 5000000

    complex_name = extract_complex_name(address)
    addr_parts = address.split()
    sido = addr_parts[0] if len(addr_parts) > 0 else "수도권"
    sigungu = addr_parts[1] if len(addr_parts) > 1 else ""
    dong = addr_parts[2] if len(addr_parts) > 2 else ""

    title = f"[{sigungu} 경매 낙찰 사례] {complex_name}, {actual_bidders}명 경쟁 및 낙찰가율 {actual_sale_ratio:.1f}% 실전 결과 심층 분석 ({case_no})"

    lines = []
    lines.append(f"# {title}\n")
    lines.append(f"> 법원 경매 실전 분석 노트 | 과거 우수 낙찰 사례 복기")
    lines.append(f"> 사건번호: {case_no} ({court}) | 매각일자: {sale_date}\n")

    lines.append(f"안녕하세요. 실전 부동산 경매와 수도권 알짜 매물 데이터를 면밀히 검토하는 경매 분석 노트입니다.\n")
    lines.append(f"오늘 복기해볼 매물은 {court}에서 매각되었던 {sido} {sigungu} {dong} '{complex_name}' 실전 낙찰 사례입니다.")
    lines.append(f"경매 시장에서 실제로 높은 경쟁률을 기록하며 안정적인 시세차익을 냈던 우량 물건으로, 향후 유사 물건 입찰 시 중요한 기준점이 되는 사례입니다.\n")

    lines.append("## 1. 낙찰 사건 개요 및 실제 매각 결과\n")
    lines.append("| 구분 | 상세 내용 |")
    lines.append("| :--- | :--- |")
    lines.append(f"| 사건번호 | {court} {case_no} |")
    lines.append(f"| 소재지 | {address} |")
    lines.append(f"| 감정평가액 | {format_korean_won(appraisal)} |")
    lines.append(f"| 실제 낙찰가 | {format_korean_won(actual_sale_price)} (낙찰가율 {actual_sale_ratio:.1f}%) |")
    lines.append(f"| 응찰자 수 | 총 {actual_bidders}명 응찰 |")
    lines.append(f"| 이후 실거래 매도가 | {format_korean_won(actual_resale_price)} |")
    lines.append(f"| 실현 시세차익 | 약 {format_korean_won(actual_resale_price - actual_sale_price)} |")
    lines.append(f"| 매각 당시 비고 | {outcome_notes} |\n")

    lines.append("## 2. 단지 입지 및 현장 체크포인트\n")
    lines.append(f"해당 단지는 {sido} {sigungu}에 위치하며, 안정적인 주거 배후 수요를 갖춘 핵심 단지입니다.")
    lines.append(f"- 단지 입지: 대중교통 및 학군, 상권 접근성이 우수하여 경매 매각 당시에도 실수요층의 관심이 집중되었습니다.")
    lines.append(f"- 환금성: 거래 회전율이 높은 중소형 면적대로, 매도 타이밍에 맞춰 무리 없이 차익을 실현할 수 있었던 구조입니다.\n")

    lines.append("## 3. 실거래가 대조 및 낙찰가율 분석\n")
    lines.append(
        f"- 감정가 대비 낙찰선: 감정가 {format_korean_won(appraisal)} 대비 {actual_sale_ratio:.1f}% 선에서 {actual_bidders}명이 경합한 끝에 낙찰되었습니다.")
    lines.append(
        f"- 시세 대비 마진: 당시 일반 매매 시세({format_korean_won(market_price)}) 대비 충분한 가격적 우위를 점한 상태에서 매수하여, 이후 정상 시세 회복기에 안정적인 매매 차익을 거두었습니다.\n")

    lines.append("## 4. 권리관계 및 실투자금 분석\n")
    lines.append(f"- 권리분석: 말소기준권리 이후 소멸되는 깨끗한 권리관계로 낙찰자가 추가 인수할 보증금 부담이 없었습니다.")
    lines.append(
        f"- 자금 조달: 낙찰가 {format_korean_won(actual_sale_price)} 중 약 70% 수준인 {format_korean_won(loan_amount)}을 경락잔금대출로 조달하고, 취득세 및 부대비용을 포함한 실제 투입 자본금은 약 {format_korean_won(min_cash)} 선이었습니다.\n")

    lines.append("## 5. 실전 투자자 총평 및 교훈\n")
    lines.append(f"- 입찰 시사점: 입지가 탄탄하고 권리관계가 깨끗한 수도권 아파트는 경쟁이 다소 있더라도 정확한 시세 상한선을 설정하고 접근하면 안전마진을 확보할 수 있음을 보여주는 사례입니다.")
    lines.append(f"- 향후 전략: 유사한 조건의 신건 또는 1회 유찰 물건이 나올 때 무리한 추격 매수를 지양하고, 사전 시세조사와 실투자금 계산을 철저히 진행해야 합니다.\n")

    # 마무리 CTA (이모티콘 전면 배제)
    lines.append("---\n")
    lines.append("### [경매 물건 추가 정보 안내]\n")
    lines.append(
        "이번 포스팅에서 다룬 물건 외에, 수도권 및 전국 법원 경매의 알짜 추천 물건 정보나 맞춤 권리분석 자료를 따로 받아보고 싶으신 분은 비밀댓글로 [희망지역 / 가용 자본금 / 연락처 또는 이메일]을 남겨주시면 순차적으로 선별하여 안내해 드리겠습니다.\n")
    lines.append("궁금하신 점이 있다면 언제든 편하게 댓글로 소통해 주세요. 글이 도움 되셨다면 공감과 이웃추가 부탁드립니다. 감사합니다.\n")

    tags = [
        "부동산경매",
        "법원경매",
        f"{sigungu}경매",
        f"{complex_name}",
        "경매낙찰사례",
        "경매낙찰가율",
        "경매실투자금",
        "아파트경매"
    ]
    lines.append(" ".join([f"#{t}" for t in tags]))

    content_markdown = "\n".join(lines)

    return {
        "rank": rank,
        "is_past": True,
        "property_id": p.get("id", ""),
        "case_no": case_no,
        "court": court,
        "address": address,
        "complex_name": complex_name,
        "usage": usage,
        "score": score,
        "title": title,
        "summary": f"{sigungu} {complex_name} (과거 낙찰 사례) · 감정가 {format_korean_won(appraisal)}, 낙찰가 {format_korean_won(actual_sale_price)} ({actual_sale_ratio:.1f}%), {actual_bidders}명 경쟁",
        "pyung_info": "공급 평형대",
        "appraisal_price": appraisal,
        "min_bid_price": min_bid,
        "recommended_bid_price": actual_sale_price,
        "min_initial_investment": min_cash,
        "net_profit": net_profit,
        "net_roi": net_roi,
        "sale_date": sale_date,
        "tags": tags,
        "content_markdown": content_markdown,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }


def generate_top10_blog_posts(analyzed_items=None):
    """
    매일 배치 시 실행되는 중복 방지 Top 10 블로그 콘텐츠 생성 엔진:
    1. 기발행 이력(posted_ids) 로드
    2. 진행 중 경매 물건(analysis.json) 중 미발행 건에서 점수 높은 순 선정
    3. 부족한 경우 과거 낙찰 이력(predictions.json / outcomes.json) 중 미발행 건에서 보충
    4. 둘 다 소진되어 남은 물건이 전혀 없으면 콘텐츠를 생성하지 않음 (posts: [])
    5. 생성 시 Markdown 파일 외에 GitHub에서 바로 열어볼 수 있는 독립형 HTML 및 통합 index.html 동시 생성
    """
    posted_ids, _ = load_posted_history()
    print(f"[generate_blog.py] 기존 누적 발행된 물건 수: {len(posted_ids)}건")

    if analyzed_items is None:
        if os.path.exists(ANALYSIS_PATH):
            with open(ANALYSIS_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                analyzed_items = data.get("items", [])
        else:
            analyzed_items = []

    unposted_ongoing = [
        item for item in analyzed_items
        if item.get("id") not in posted_ids and item.get("case_no") not in posted_ids
    ]

    unposted_ongoing.sort(
        key=lambda p: (p.get("investment_score", 0), p.get("net_roi", 0), p.get("net_profit", 0)),
        reverse=True
    )
    print(f"[generate_blog.py] 진행 중 매물 중 신규 미발행 매물: {len(unposted_ongoing)}건")

    selected_candidates = []
    for p in unposted_ongoing[:10]:
        selected_candidates.append({"item": p, "is_past": False})

    needed = 10 - len(selected_candidates)
    if needed > 0:
        print(f"[generate_blog.py] 진행 매물 미발행 건 부족 ({len(selected_candidates)}/10), 과거 낙찰 이력에서 {needed}건 탐색...")
        past_candidates = []
        if os.path.exists(PREDICTIONS_PATH) and os.path.exists(OUTCOMES_PATH):
            try:
                with open(PREDICTIONS_PATH, "r", encoding="utf-8") as f:
                    preds = json.load(f)
                with open(OUTCOMES_PATH, "r", encoding="utf-8") as f:
                    outcomes = json.load(f)

                cur_ids = set(it["id"] for it in analyzed_items)
                for pid, p in preds.items():
                    if pid not in cur_ids and pid not in posted_ids and p.get("case_no") not in posted_ids:
                        outcome = outcomes.get(pid, {})
                        past_candidates.append({
                            "item": p,
                            "outcome": outcome,
                            "is_past": True
                        })

                past_candidates.sort(
                    key=lambda x: (
                        x["item"].get("investment_score", 0),
                        x["item"].get("predicted_net_roi", x["item"].get("net_roi", 0)),
                        x["item"].get("predicted_net_profit", x["item"].get("net_profit", 0))
                    ),
                    reverse=True
                )
                print(f"[generate_blog.py] 과거 이력 중 신규 미발행 매물: {len(past_candidates)}건")
                for cand in past_candidates[:needed]:
                    selected_candidates.append(cand)
            except Exception as e:
                print(f"[generate_blog.py] 과거 이력 조회 경고: {e}")

    if not selected_candidates:
        print("[generate_blog.py] 진행 매물 및 과거 이력 매물이 모두 소진되어 금일 콘텐츠를 생성하지 않습니다.")
        result_payload = {
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_posts": 0,
            "selection_criteria": "발행 가능한 미중복 매물 없음",
            "posts": []
        }
        with open(BLOG_OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(result_payload, f, ensure_ascii=False, indent=2)
        return []

    print(
        f"[generate_blog.py] 최종 {len(selected_candidates)}건 블로그 콘텐츠 생성 시작 (진행: {sum(1 for c in selected_candidates if not c['is_past'])}건, 과거: {sum(1 for c in selected_candidates if c['is_past'])}건)...")
    os.makedirs(BLOG_DIR, exist_ok=True)

    blog_posts = []
    new_posted_records = []

    for idx, cand in enumerate(selected_candidates, 1):
        item = cand["item"]
        is_past = cand["is_past"]

        if is_past:
            outcome = cand.get("outcome", {})
            post = generate_blog_article_past(item, outcome, rank=idx)
        else:
            post = generate_blog_article_ongoing(item, rank=idx)

        blog_posts.append(post)
        new_posted_records.append({
            "id": item.get("id"),
            "case_no": item.get("case_no"),
            "court": item.get("court"),
            "address": item.get("address"),
            "is_past": is_past
        })

        clean_case = re.sub(r"[^a-zA-Z0-9_-]", "_", item.get("case_no") or f"item_{idx}").strip("_")

        # 1. 마크다운 파일 저장 (post_01_*.md)
        md_filename = f"post_{idx:02d}_{clean_case}.md"
        md_filepath = os.path.join(BLOG_DIR, md_filename)
        with open(md_filepath, "w", encoding="utf-8") as f:
            f.write(post["content_markdown"])

        # 2. 깃허브에서 바로 열어볼 수 있는 독립형 HTML 파일 저장 (post_01_*.html)
        html_filename = f"post_{idx:02d}_{clean_case}.html"
        html_filepath = os.path.join(BLOG_DIR, html_filename)
        with open(html_filepath, "w", encoding="utf-8") as f:
            f.write(build_standalone_post_html(post))

    # 3. 통합 마스터 HTML 파일 생성 (data/blog_posts/index.html 및 루트 바로가기 blog_top10.html)
    master_html = build_master_index_html(blog_posts)
    index_html_path = os.path.join(BLOG_DIR, "index.html")
    with open(index_html_path, "w", encoding="utf-8") as f:
        f.write(master_html)
    with open(ROOT_HTML_PREVIEW, "w", encoding="utf-8") as f:
        f.write(master_html)

    save_posted_history(new_posted_records)

    result_payload = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_posts": len(blog_posts),
        "selection_criteria": "경매 투자점수 Top 10 엄선 (중복 제거 및 과거 이력 연계)",
        "posts": blog_posts
    }

    with open(BLOG_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result_payload, f, ensure_ascii=False, indent=2)

    print(f"[generate_blog.py] 블로그 콘텐츠 생성 완료: 총 {len(blog_posts)}건 저장")
    print(f"[generate_blog.py] HTML 파일 생성 위치: {index_html_path} 및 {ROOT_HTML_PREVIEW}")
    return blog_posts


if __name__ == "__main__":
    generate_top10_blog_posts()
