import { useLocalStorage } from './useLocalStorage';

const KEY = 'portfolio_onboarding_complete';

export function useOnboarding() {
  const [complete, setComplete] = useLocalStorage<boolean>(KEY, false);
  return {
    isComplete: complete,
    markComplete: () => setComplete(true),
    reset: () => setComplete(false),
  };
}
