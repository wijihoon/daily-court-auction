/**
 * calculator.ts
 * 경매 입찰 실시간 시뮬레이션 및 세무/비용 연산 엔진
 */

export function normalCdf(x: number, mean: number, std: number): number {
  if (std <= 0) return x >= mean ? 1.0 : 0.0;
  const z = (x - mean) / (std * Math.SQRT2);
  // Abramowitz and Stegun approximation for erf
  const t = 1.0 / (1.0 + 0.3275911 * Math.abs(z));
  const poly =
    t * (0.254829592 +
      t * (-0.284496736 +
        t * (1.421413741 +
          t * (-1.453152027 + t * 1.061405429))));
  const erfVal = 1.0 - poly * Math.exp(-z * z);
  const sign = z >= 0 ? 1 : -1;
  return 0.5 * (1.0 + sign * erfVal);
}

export function calcAcquisitionTax(bidPrice: number, areaSqm: number, isOfficetel: boolean) {
  if (isOfficetel) {
    const rate = 0.046;
    return {
      total: Math.round(bidPrice * rate),
      ratePct: 4.6,
      desc: '오피스텔 표준 취득세 4.6% (본세 4.0% + 농특세 0.2% + 교육세 0.4%)'
    };
  }

  let baseRate = 0.01;
  if (bidPrice <= 600000000) {
    baseRate = 0.01;
  } else if (bidPrice <= 900000000) {
    baseRate = ((bidPrice * (2.0 / 300000000) - 3.0) / 100.0);
  } else {
    baseRate = 0.03;
  }

  const eduRate = baseRate * 0.10;
  const ruralRate = areaSqm > 85.0 ? 0.002 : 0.0;
  const totalRate = baseRate + eduRate + ruralRate;

  return {
    total: Math.round(bidPrice * totalRate),
    ratePct: Number((totalRate * 100).toFixed(2)),
    desc: `주택 유상취득 표준세율 ${(totalRate * 100).toFixed(2)}% (본세 ${(baseRate * 100).toFixed(2)}% + 교육세 ${(eduRate * 100).toFixed(2)}% + 농특세 ${(ruralRate * 100).toFixed(2)}%)`
  };
}

export function calcTransferTax(grossGain: number, holdingPeriod: 'under1' | 'under2' | 'over2') {
  if (grossGain <= 0) {
    return { tax: 0, effectiveRate: 0, taxableGain: 0 };
  }

  const taxableGain = Math.max(0, grossGain - 2500000); // 250만원 기본공제

  if (holdingPeriod === 'under1') {
    // 1년 미만: 70% + 지방소득세 7% = 77%
    const tax = Math.round(taxableGain * 0.77);
    return { tax, effectiveRate: 77.0, taxableGain };
  } else if (holdingPeriod === 'under2') {
    // 2년 미만: 60% + 지방소득세 6% = 66%
    const tax = Math.round(taxableGain * 0.66);
    return { tax, effectiveRate: 66.0, taxableGain };
  } else {
    // 2년 이상 일반 누진세율 (2025~2026 소득세법 기준)
    const brackets = [
      { limit: 14000000, rate: 0.06, deduction: 0 },
      { limit: 50000000, rate: 0.15, deduction: 1260000 },
      { limit: 88000000, rate: 0.24, deduction: 5760000 },
      { limit: 150000000, rate: 0.35, deduction: 15440000 },
      { limit: 300000000, rate: 0.38, deduction: 19940000 },
      { limit: 500000000, rate: 0.40, deduction: 25940000 },
      { limit: 1000000000, rate: 0.42, deduction: 35940000 },
      { limit: Infinity, rate: 0.45, deduction: 65940000 },
    ];

    let bTax = 0;
    for (const b of brackets) {
      if (taxableGain <= b.limit) {
        bTax = taxableGain * b.rate - b.deduction;
        break;
      }
    }

    const totalTax = Math.round(Math.max(0, bTax) * 1.10); // 지방소득세 10%
    const effRate = grossGain > 0 ? Number(((totalTax / grossGain) * 100).toFixed(1)) : 0;
    return { tax: totalTax, effectiveRate: effRate, taxableGain };
  }
}

export function formatWon(num: number): string {
  if (Math.abs(num) >= 100000000) {
    const eok = Math.floor(Math.abs(num) / 100000000);
    const remainder = Math.round((Math.abs(num) % 100000000) / 10000);
    const sign = num < 0 ? '-' : '';
    if (remainder === 0) {
      return `${sign}${eok}억원`;
    }
    return `${sign}${eok}억 ${remainder.toLocaleString('ko-KR')}만원`;
  }
  if (Math.abs(num) >= 10000) {
    const man = Math.round(num / 10000);
    return `${man.toLocaleString('ko-KR')}만원`;
  }
  return `${num.toLocaleString('ko-KR')}원`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

/**
 * 경락잔금대출(70% 기준) 적용 시 실투자금(최소 투자금) 계산
 * 실투자금 = (입찰가 * 30% 자부담) + 취득세 + 부대비용 + 인수권리금
 */
export function calcMinInitialInvestment(
  bidPrice: number,
  acquisitionTax: number,
  operatingCosts: number,
  assumedRightsCost: number = 0,
  ltvRatio: number = 0.70
) {
  const loanAmount = Math.round(bidPrice * ltvRatio);
  const equityPortion = bidPrice - loanAmount; // 자부담금 (약 30%)
  const costsPortion = acquisitionTax + operatingCosts + assumedRightsCost;
  const minCash = equityPortion + costsPortion;

  return {
    minCash,
    loanAmount,
    equityPortion,
    costsPortion,
    ltvPercent: Math.round(ltvRatio * 100)
  };
}
