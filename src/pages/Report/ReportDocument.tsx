import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { Asset, AppSettings } from '../../types';
import type { PortfolioMetrics } from '../../hooks/usePortfolioSummary';
import type { TaxSimulatorResult } from '../../hooks/useTaxSimulator';
import type { AnalysisStatus } from '../../hooks/useClaudeAI';
import {
  CoverSection,
  SummarySection,
  PortfolioChartSection,
  PortfolioDetailSection,
  CostSection,
  FutureSection,
  FireSection,
  DividendSection,
  TaxSection,
  AssetDetailSection,
  AiCommentSection,
  DisclaimerSection,
} from './reportSections';

// ─────────────────────────────────────────────────
// 出力セクション識別子
// ─────────────────────────────────────────────────
export type SectionKey =
  | 'cover'
  | 'summary'
  | 'portfolio'
  | 'cost'
  | 'future'
  | 'fire'
  | 'dividend'
  | 'tax'
  | 'assetDetail'
  | 'aiComment'
  | 'disclaimer';

export type SectionRefs = Record<SectionKey, HTMLDivElement | null>;

export interface ReportDocumentHandle {
  getSections: (enabled: Record<SectionKey, boolean>) => { key: string; el: HTMLElement | null }[];
}

interface Props {
  assets: Asset[];
  settings: AppSettings;
  summary: PortfolioMetrics;
  taxResult: TaxSimulatorResult;
  aiComment: string;
  aiStatus: AnalysisStatus;
  hideAmounts: boolean;
}

export const ReportDocument = forwardRef<ReportDocumentHandle, Props>(
  function ReportDocument({ assets, settings, summary, taxResult, aiComment, aiStatus, hideAmounts }, ref) {
    const refs: Record<SectionKey, React.RefObject<HTMLDivElement | null>> = {
      cover:       useRef<HTMLDivElement>(null),
      summary:     useRef<HTMLDivElement>(null),
      portfolio:   useRef<HTMLDivElement>(null),
      cost:        useRef<HTMLDivElement>(null),
      future:      useRef<HTMLDivElement>(null),
      fire:        useRef<HTMLDivElement>(null),
      dividend:    useRef<HTMLDivElement>(null),
      tax:         useRef<HTMLDivElement>(null),
      assetDetail: useRef<HTMLDivElement>(null),
      aiComment:   useRef<HTMLDivElement>(null),
      disclaimer:  useRef<HTMLDivElement>(null),
    };

    useImperativeHandle(ref, () => ({
      getSections: (enabled) =>
        (Object.keys(refs) as SectionKey[])
          .filter((k) => enabled[k])
          .map((k) => ({ key: k, el: refs[k].current })),
    }));

    const common = { assets, settings, summary, hideAmounts };

    return (
      // 画面外に配置（html2canvas がDOM上に必要）
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: '-9999px',
          zIndex: -1,
          width: 794,
        }}
        aria-hidden="true"
      >
        <div ref={refs.cover}><CoverSection summary={summary} settings={settings} hideAmounts={hideAmounts} /></div>
        <div ref={refs.summary}><SummarySection summary={summary} settings={settings} hideAmounts={hideAmounts} /></div>
        <div ref={refs.portfolio}>
          <PortfolioChartSection summary={summary} />
          <PortfolioDetailSection {...common} />
        </div>
        <div ref={refs.cost}><CostSection {...common} /></div>
        <div ref={refs.future}><FutureSection summary={summary} settings={settings} hideAmounts={hideAmounts} /></div>
        <div ref={refs.fire}><FireSection summary={summary} settings={settings} hideAmounts={hideAmounts} /></div>
        <div ref={refs.dividend}><DividendSection {...common} /></div>
        <div ref={refs.tax}><TaxSection taxResult={taxResult} hideAmounts={hideAmounts} /></div>
        <div ref={refs.assetDetail}><AssetDetailSection {...common} /></div>
        <div ref={refs.aiComment}><AiCommentSection comment={aiComment} status={aiStatus} /></div>
        <div ref={refs.disclaimer}><DisclaimerSection /></div>
      </div>
    );
  },
);
