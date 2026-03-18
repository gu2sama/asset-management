import { useState, useCallback, useRef } from 'react';
import type { Asset, AIAnalysis } from '../types';
import {
  analyzeFund,
  generateReportComment,
  isAnalysable,
  ClaudeApiKeyError,
  ClaudeApiError,
  type PortfolioReportData,
} from '../services/claudeService';

// ─────────────────────────────────────────────────
// 分析ステータス（assetIdをキーに管理）
// ─────────────────────────────────────────────────
export type AnalysisStatus = 'idle' | 'loading' | 'done' | 'error';

export interface AssetAnalysisState {
  status: AnalysisStatus;
  error?: string;
}

export interface UseClaudeAIReturn {
  // 銘柄別ステータス
  analysisStates: Record<string, AssetAnalysisState>;
  // 単銘柄を分析（バックグラウンド非同期）
  analyzeAsset: (
    asset: Asset,
    apiKey: string,
    onDone: (id: string, result: AIAnalysis) => void,
  ) => void;
  // 全未分析銘柄を一括分析
  analyzeAll: (
    assets: Asset[],
    apiKey: string,
    onDone: (id: string, result: AIAnalysis) => void,
  ) => Promise<void>;
  // PDF用レポートコメント生成
  reportState: { status: AnalysisStatus; text: string; error?: string };
  generateReport: (apiKey: string, data: PortfolioReportData) => Promise<string | null>;
  // エラーをクリア
  clearError: (id: string) => void;
}

export function useClaudeAI(): UseClaudeAIReturn {
  const [analysisStates, setAnalysisStates] = useState<Record<string, AssetAnalysisState>>({});
  const [reportState, setReportState] = useState<{
    status: AnalysisStatus; text: string; error?: string;
  }>({ status: 'idle', text: '' });

  // 進行中リクエストのID管理（多重送信防止）
  const inFlight = useRef<Set<string>>(new Set());

  const setAssetState = useCallback(
    (id: string, state: AssetAnalysisState) => {
      setAnalysisStates((prev) => ({ ...prev, [id]: state }));
    },
    []
  );

  // ── 単銘柄分析 ──────────────────────────────────
  const analyzeAsset = useCallback(
    (
      asset: Asset,
      apiKey: string,
      onDone: (id: string, result: AIAnalysis) => void,
    ) => {
      if (!isAnalysable(asset.assetClass)) return;
      if (!apiKey) {
        setAssetState(asset.id, { status: 'error', error: 'APIキー未設定' });
        return;
      }
      // 分析済み（confidence問わず）またはリクエスト進行中はスキップ
      if (asset.aiAnalysis) return;
      if (inFlight.current.has(asset.id)) return;

      inFlight.current.add(asset.id);
      setAssetState(asset.id, { status: 'loading' });

      analyzeFund(apiKey, asset.name)
        .then((result) => {
          setAssetState(asset.id, { status: 'done' });
          onDone(asset.id, result);
        })
        .catch((err: unknown) => {
          const msg = humanizeError(err);
          setAssetState(asset.id, { status: 'error', error: msg });
        })
        .finally(() => {
          inFlight.current.delete(asset.id);
        });
    },
    [setAssetState, inFlight]
  );

  // ── 全銘柄一括分析（直列実行・レートリミット対策） ──
  const analyzeAll = useCallback(
    async (
      assets: Asset[],
      apiKey: string,
      onDone: (id: string, result: AIAnalysis) => void,
    ) => {
      const targets = assets.filter(
        (a) => isAnalysable(a.assetClass) && !a.aiAnalysis && !inFlight.current.has(a.id)
      );
      for (const asset of targets) {
        inFlight.current.add(asset.id);
        setAssetState(asset.id, { status: 'loading' });
        try {
          const result = await analyzeFund(apiKey, asset.name);
          setAssetState(asset.id, { status: 'done' });
          onDone(asset.id, result);
          // 連続リクエストを少し間引く
          await new Promise((r) => setTimeout(r, 800));
        } catch (err) {
          const msg = humanizeError(err);
          setAssetState(asset.id, { status: 'error', error: msg });
          if (err instanceof ClaudeApiKeyError) break; // キーエラーは中断
        } finally {
          inFlight.current.delete(asset.id);
        }
      }
    },
    [setAssetState, inFlight]
  );

  // ── レポートコメント生成 ─────────────────────────
  const generateReport = useCallback(
    async (apiKey: string, data: PortfolioReportData): Promise<string | null> => {
      setReportState({ status: 'loading', text: '' });
      try {
        const text = await generateReportComment(apiKey, data);
        setReportState({ status: 'done', text });
        return text;
      } catch (err) {
        const msg = humanizeError(err);
        setReportState({ status: 'error', text: '', error: msg });
        return null;
      }
    },
    []
  );

  const clearError = useCallback((id: string) => {
    setAnalysisStates((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return {
    analysisStates,
    analyzeAsset,
    analyzeAll,
    reportState,
    generateReport,
    clearError,
  };
}

// ─────────────────────────────────────────────────
// エラーメッセージを人間が読める形に変換
// ─────────────────────────────────────────────────
function humanizeError(err: unknown): string {
  if (err instanceof ClaudeApiKeyError) return err.message;
  if (err instanceof ClaudeApiError) {
    if (err.isRateLimit) return 'レートリミット超過。しばらく待ってから再試行してください。';
    if (err.status === 401) return 'APIキーが無効です。設定画面で確認してください。';
    if (err.status === 403) return 'APIアクセスが拒否されました。';
    return `APIエラー: ${err.message}`;
  }
  if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network'))) {
    return 'ネットワークエラー。インターネット接続を確認してください。';
  }
  return '不明なエラーが発生しました。';
}
