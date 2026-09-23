import initialAnalysisRaw from '../../data/analysis.json';
import initialCalibrationRaw from '../../data/calibration.json';
import initialBaselinesRaw from '../../data/baselines.json';
import initialBlogPostsRaw from '../../data/blog_posts.json';
import { AnalysisSummary, CalibrationData, BlogPostSummary } from '../types';

export const initialAnalysisData = initialAnalysisRaw as unknown as AnalysisSummary;
export const initialCalibrationData = initialCalibrationRaw as unknown as CalibrationData;
export const initialBaselinesData = initialBaselinesRaw;
export const initialBlogPostsData = initialBlogPostsRaw as unknown as BlogPostSummary;
