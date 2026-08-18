import { useState, useEffect } from 'react';

export interface ConsentState {
  cookies: boolean;
  notifications: boolean;
  storeAlerts: boolean;
  version: string;
}

const CONSENT_KEY = 'store_consent_settings';
const CURRENT_VERSION = '1.0';

export function useConsent() {
  const [consent, setConsent] = useState<ConsentState | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === CURRENT_VERSION) {
          setConsent(parsed);
        }
      } catch (e) {
        console.error('Failed to parse consent', e);
      }
    }
  }, []);

  const saveConsent = (updates: Partial<ConsentState>) => {
    const newState = {
      cookies: true,
      notifications: true,
      storeAlerts: true,
      version: CURRENT_VERSION,
      ...consent,
      ...updates
    };
    setConsent(newState);
    localStorage.setItem(CONSENT_KEY, JSON.stringify(newState));
  };

  return { consent, saveConsent };
}
