#!/usr/bin/env python3
"""
scripts/notify_slack.py
매일 법원경매 배치 완료 시 슬랙(Slack Webhook)으로
Top 1~10등 추천 매물 제목 리스트 및 핵심 지표를 깔끔한 Block Kit 메시지로 전송합니다.

기능:
1. data/blog_posts.json에서 Top 10 선정 결과 로드
2. 슬랙 수신용 깔끔한 메시지(Header, Section, Fields, Divider) 포맷 생성
3. SLACK_WEBHOOK_URL 환경변수 또는 .env 파일 설정 시 즉시 Webhook 전송
4. Webhook URL 미설정 시에도 data/latest_slack_notification.json 및 텍스트 로그에 보존하여 확인 가능
5. GitHub 원고 링크 / HTML 뷰어 안내 포함
"""

import json
import os
import urllib.error
import urllib.request
from datetime import datetime

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, "data")
BLOG_POSTS_PATH = os.path.join(DATA_DIR, "blog_posts.json")
LATEST_SLACK_PATH = os.path.join(DATA_DIR, "latest_slack_notification.json")
LATEST_SLACK_TXT = os.path.join(DATA_DIR, "latest_slack_notification.txt")
SLACK_LOG_PATH = os.path.join(DATA_DIR, "slack_notifications.log")


def load_env_file():
    """프로젝트 루트의 .env 파일이 존재하면 환경변수에 로드"""
    env_path = os.path.join(ROOT_DIR, ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'").strip('"')
                        if k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass


def format_won(amount):
    """숫자 금액을 원화 단위(억/만원)로 변환"""
    if not amount or amount <= 0:
        return "0원"
    amount = int(round(amount))
    eok = amount // 100000000
    man = (amount % 100000000) // 10000
    parts = []
    if eok > 0:
        parts.append(f"{eok}억")
    if man > 0:
        parts.append(f"{man:,}만")
    if parts:
        parts.append("원")
    return " ".join(parts) if parts else "0원"


def build_slack_message():
    """슬랙 Webhook 페이로드(Block Kit 구조) 및 텍스트 요약 생성"""
    posts = []
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if os.path.exists(BLOG_POSTS_PATH):
        try:
            with open(BLOG_POSTS_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                posts = data.get("posts", [])
                generated_at = data.get("generated_at", generated_at)
        except Exception as e:
            print(f"[notify_slack.py] blog_posts.json 읽기 경고: {e}")

    today_str = datetime.now().strftime("%m월 %d일")
    header_text = f"법원경매 가치분석 배치 완료 (Top 10 추천 매물 - {today_str})"

    # 기본 Fallback Text
    text_summary_lines = [
        f"[{header_text}]",
        f"완료 일시: {generated_at} (엄선 {len(posts)}건)",
        "--------------------------------------------------"
    ]

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"법원경매 분석 배치 완료 ({today_str})",
                "emoji": False
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*배치 완료 일시:* `{generated_at}`\n*금일 발행 대상:* *{len(posts)}건* (중복 배제 Top 10 엄선 매물)"
            }
        },
        {"type": "divider"}
    ]

    if not posts:
        no_posts_msg = "금일은 진행 매물 및 과거 이력이 모두 소진되어 신규 생성된 매물이 없습니다."
        text_summary_lines.append(no_posts_msg)
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"_{no_posts_msg}_"
            }
        })
    else:
        for p in posts:
            rank = p.get("rank")
            title = p.get("title", "")
            case_no = p.get("case_no", "")
            court = p.get("court", "")
            score = p.get("score", 0)
            rec_bid = format_won(p.get("recommended_bid_price", 0))
            min_cash = format_won(p.get("min_initial_investment", 0))
            appraisal = format_won(p.get("appraisal_price", 0))
            is_past = p.get("is_past", False)
            tag = "[과거낙찰사례]" if is_past else "[진행매물]"

            text_summary_lines.append(f"[{rank}위] {tag} {title}")
            text_summary_lines.append(f"      사건번호: {court} {case_no} (종합 {score}점)")
            text_summary_lines.append(f"      감정가: {appraisal} | 추천입찰가: {rec_bid} | 최소실투자금: 약 {min_cash}")
            text_summary_lines.append("")

            # 슬랙 블록 구성
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"*{rank}위. {tag} {title}*\n"
                        f"• *사건번호:* `{court} {case_no}` (가치점수 *{score}점*)\n"
                        f"• *감정평가액:* {appraisal}  |  *추천입찰가:* *{rec_bid}*\n"
                        f"• *필요 최소 실투자금:* *약 {min_cash}* (대출 70% 가정)"
                    )
                }
            })

    blocks.append({"type": "divider"})
    blocks.append({
        "type": "context",
        "elements": [
            {
                "type": "mrkdwn",
                "text": (
                    "• *GitHub HTML 뷰어:* `data/blog_posts/index.html` (또는 `blog_top10.html`)\n"
                    "• *네이버 블로그 원고:* 브라우저에서 '네이버 블로그용 원고 복사' 1클릭 복사 후 붙여넣기 지원"
                )
            }
        ]
    })

    text_summary_lines.append("--------------------------------------------------")
    text_summary_lines.append("원고 뷰어: data/blog_posts/index.html (또는 루트 blog_top10.html)")

    payload = {
        "text": "\n".join(text_summary_lines),
        "blocks": blocks
    }

    return payload, "\n".join(text_summary_lines), len(posts)


def send_slack_notification(webhook_url=None):
    """
    슬랙 Webhook 메시지 전송
    1. SLACK_WEBHOOK_URL 환경변수 또는 전달된 URL 사용
    2. latest_slack_notification.json 및 latest_slack_notification.txt 에 항상 보관
    """
    load_env_file()
    webhook_url = webhook_url or os.environ.get("SLACK_WEBHOOK_URL", "")

    payload, text_summary, post_count = build_slack_message()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 1. 파일에 항상 기록 (웹훅 전송 전 상태 저장)
    with open(LATEST_SLACK_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    with open(LATEST_SLACK_TXT, "w", encoding="utf-8") as f:
        f.write(f"[슬랙 알림 생성 일시: {now_str}]\n\n{text_summary}\n")

    with open(SLACK_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"[{now_str}] POSTS: {post_count} | WEBHOOK_SET: {bool(webhook_url)}\n")

    print(f"\n[notify_slack.py] ==================================================")
    print(f"[notify_slack.py] 슬랙 알림 메시지 생성 완료 (Top {post_count}건)")
    print(f"[notify_slack.py] ==================================================")

    if not webhook_url:
        print("[notify_slack.py] SLACK_WEBHOOK_URL 환경변수가 .env 에 설정되지 않았습니다.")
        print(f"[notify_slack.py] 슬랙 전송용 페이로드가 '{LATEST_SLACK_PATH}' 및 '{LATEST_SLACK_TXT}'에 저장되었습니다.")
        print("[notify_slack.py] 슬랙 채널 Incoming Webhook URL을 .env의 SLACK_WEBHOOK_URL= 에 기재하시면 실시간 전송됩니다.")
        return True

    # 2. HTTP POST 웹훅 전송
    try:
        req_data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            webhook_url,
            data=req_data,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as res:
            res_body = res.read().decode("utf-8")
            if res.status == 200 and res_body.strip() == "ok":
                print(f"[notify_slack.py] 슬랙 채널 전송 성공! (HTTP 200 ok)")
                return True
            else:
                print(f"[notify_slack.py] 슬랙 응답: HTTP {res.status} ({res_body})")
                return False
    except urllib.error.HTTPError as e:
        print(f"[notify_slack.py] 슬랙 Webhook HTTP 에러: {e.code} {e.reason}")
        return False
    except Exception as e:
        print(f"[notify_slack.py] 슬랙 Webhook 전송 실패: {e}")
        return False


if __name__ == "__main__":
    send_slack_notification()
