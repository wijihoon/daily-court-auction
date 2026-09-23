/**
 * types.ts
 * 경매 분석 시스템 종합 타입 정의
 */

export interface RightsStatus {
  has_tenant: boolean;
  tenant_name: string | null;
  move_in_date: string | null;
  fixed_date: string | null;
  dividend_demand: boolean;
  deposit: number;
  monthly_rent: number;
  opposing_power: '대항력있음' | '없음';
  malso_standard_date?: string;
  estimated_assumed_deposit: number;
  risk_level: '낮음' | '보통' | '높음';
  notes: string;
}

export interface CostsBreakdown {
  eviction_cost: number;
  arrears_mgmt_cost: number;
  renovation_cost: number;
  brokerage_total: number;
  registration_fee: number;
  contingency: number;
  assumed_rights_cost: number;
  total_operating_cost: number;
}

export interface AuctionPropertyAnalysis {
  id: string;
  court: string;
  case_no: string;
  item_seq: number;
  address: string;
  usage: '아파트' | '오피스텔' | '연립다세대' | string;
  appraisal_price: number;
  min_bid_price: number;
  fail_count: number;
  sale_date: string;
  building_area_sqm: number;
  floor_info: string;
  estimated_market_price: number;
  recommended_bid_price: number;
  recommended_bid_ratio: number;
  expected_bidders: number;
  win_probability: number;
  competition_level: string;
  net_profit: number;
  net_roi: number;
  acquisition_tax: number;
  transfer_tax: number;
  operating_costs: number;
  costs_breakdown: CostsBreakdown;
  total_cash_required: number;
  min_initial_investment?: number;
  loan_amount?: number;
  rights_status: RightsStatus;
  investment_score: number;
  analyzed_at: string;
}

export interface AnalysisSummary {
  generated_at: string;
  total_properties: number;
  avg_recommended_ratio: number;
  avg_net_profit: number;
  safe_rights_count: number;
  items: AuctionPropertyAnalysis[];
}

export interface BlogPost {
  rank: number;
  is_past?: boolean;
  property_id: string;
  case_no: string;
  court: string;
  address: string;
  complex_name: string;
  usage: string;
  score: number;
  title: string;
  summary: string;
  pyung_info: string;
  appraisal_price: number;
  min_bid_price: number;
  recommended_bid_price: number;
  min_initial_investment: number;
  net_profit: number;
  net_roi: number;
  sale_date: string;
  tags: string[];
  content_markdown: string;
  created_at: string;
}

export interface BlogPostSummary {
  generated_at: string;
  total_posts: number;
  selection_criteria: string;
  posts: BlogPost[];
}

export interface CalibrationRecord {
  id: string;
  case_no: string;
  address: string;
  usage: string;
  appraisal_price: number;
  predicted_bid: number;
  actual_price: number | null;
  predicted_ratio: number;
  actual_ratio: number | null;
  ratio_err: number | null;
  predicted_bidders: number;
  actual_bidders: number | null;
  bidders_err: number | null;
  win_probability: number;
  actual_status: string;
  would_win: boolean;
  brier_score: number;
  predicted_resale: number;
  actual_resale: number | null;
  resale_vs_market_pct: number | null;
  notes: string;
}

export interface SuggestedAdjustment {
  target: string;
  direction: string;
  delta: string;
  reason: string;
}

export interface CalibrationData {
  calibrated_at: string;
  total_tracked_cases: number;
  metrics: {
    avg_ratio_bias_pct: number;
    avg_bidder_bias: number;
    mean_brier_score: number;
    win_rate_with_model_bid: number;
    avg_resale_diff_pct: number;
  };
  suggested_adjustments: SuggestedAdjustment[];
  region_breakdown: Record<string, {
    count: number;
    avg_ratio_bias: number;
    avg_bidder_bias: number;
  }>;
  joined_records: CalibrationRecord[];
}
