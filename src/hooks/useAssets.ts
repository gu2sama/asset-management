import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Asset } from '../types';
import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'portfolio_assets';

export type AssetInput = Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>;

export function useAssets() {
  const [assets, setAssets] = useLocalStorage<Asset[]>(STORAGE_KEY, []);

  const addAsset = useCallback(
    (input: AssetInput): Asset => {
      const now = new Date().toISOString();
      const newAsset: Asset = {
        ...input,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      };
      setAssets((prev) => [...prev, newAsset]);
      return newAsset;
    },
    [setAssets]
  );

  const updateAsset = useCallback(
    (id: string, partial: Partial<AssetInput>): void => {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, ...partial, updatedAt: new Date().toISOString() }
            : a
        )
      );
    },
    [setAssets]
  );

  const deleteAsset = useCallback(
    (id: string): void => {
      setAssets((prev) => prev.filter((a) => a.id !== id));
    },
    [setAssets]
  );

  const getAsset = useCallback(
    (id: string): Asset | undefined => assets.find((a) => a.id === id),
    [assets]
  );

  const importAssets = useCallback(
    (incoming: Asset[]): void => {
      setAssets(incoming);
    },
    [setAssets]
  );

  const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);

  return {
    assets,
    totalValue,
    addAsset,
    updateAsset,
    deleteAsset,
    getAsset,
    importAssets,
  };
}
