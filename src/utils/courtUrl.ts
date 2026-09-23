/**
 * 대한민국 대법원 법원경매정보(courtauction.go.kr) 사건별 검색 시스템 연동 헬퍼
 * 신규 웹스퀘어5(WebSquare) 기반 사건별 검색 화면(PGJ159M00.xml)으로 정확히 연결합니다.
 */
export function getCourtAuctionUrl(court?: string, caseNo?: string): string {
  const baseTarget = '/pgj/ui/pgj100/PGJ159M00.xml';

  if (!caseNo) {
    return `https://www.courtauction.go.kr/pgj/index.on?w2xPath=${baseTarget}`;
  }

  const cleanCase = caseNo.trim();
  const queryParts: string[] = [`w2xPath=${baseTarget}`];

  // 사건번호 파싱 (예: "2024타경103421" -> 연도 2024, 구분 타경, 일련번호 103421)
  const parsed = cleanCase.match(/^(\d{4})([^\d]+)(\d+)$/);
  if (parsed) {
    const [, year, gubun, seq] = parsed;
    queryParts.push(`csYear=${encodeURIComponent(year)}`);
    queryParts.push(`csGubun=${encodeURIComponent(gubun)}`);
    queryParts.push(`csNo=${encodeURIComponent(seq)}`);
    queryParts.push(`caseYear=${encodeURIComponent(year)}`);
    queryParts.push(`caseNum=${encodeURIComponent(seq)}`);
  }

  queryParts.push(`caseNo=${encodeURIComponent(cleanCase)}`);
  queryParts.push(`srchCaseNo=${encodeURIComponent(cleanCase)}`);

  if (court) {
    const cleanCourt = court.trim();
    queryParts.push(`court=${encodeURIComponent(cleanCourt)}`);
    queryParts.push(`courtNm=${encodeURIComponent(cleanCourt)}`);
  }

  return `https://www.courtauction.go.kr/pgj/index.on?${queryParts.join('&')}`;
}

/**
 * 사건번호 클릭 시 클립보드에 사건번호를 복사하여 법원 사이트 검색창에서 바로 붙여넣기할 수 있도록 지원
 */
export async function copyCaseNumberToClipboard(caseNo: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(caseNo.trim());
      return true;
    }
  } catch {
    // 클립보드 접근 권한 제한 시 조용히 통과
  }
  return false;
}
