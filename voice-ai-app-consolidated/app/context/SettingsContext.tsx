import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type VoiceEngine = 'xai' | 'deepgram';
export type TtsEngine = 'xai' | 'elevenlabs' | 'openai';
export type LlmBackend = 'xai' | 'openrouter' | 'openai' | 'runpod' | 'ollama';

export interface AppSettings {
  serverUrl: string;
  wsUrl: string;
  voiceEngine: VoiceEngine;
  deepgramApiKey: string;
  deepgramModel: string;
  deepgramVoice: string;
  ttsEngine: TtsEngine;
  defaultVoice: string;
  ttsSpeed: number;
  llmBackend: LlmBackend;
  runpodEndpoint: string;
  runpodApiKey: string;
  ollamaEndpoint: string;
  systemPrompt: string;
  personaName: string;
}

const DEFAULTS: AppSettings = {
  serverUrl: 'https://caroline-server-v2-production.up.railway.app',
  wsUrl: 'wss://caroline-server-v2-production.up.railway.app/ws/voice',
  voiceEngine: 'xai',
  deepgramApiKey: '',
  deepgramModel: 'nova-3',
  deepgramVoice: 'aura-2-thalia-en',
  ttsEngine: 'xai',
  defaultVoice: 'Ara',
  ttsSpeed: 1.0,
  llmBackend: 'xai',
  runpodEndpoint: '',
  runpodApiKey: '',
  ollamaEndpoint: 'http://localhost:11434',
  systemPrompt:
    "You are Caroline, a sharp, warm AI assistant for Wade — a master carpenter in Columbus OH. Voice-first: keep responses concise and natural for speech. No bullet points, no markdown. Be direct, confident, and a little light-hearted.",
  personaName: 'Caroline',
};

const STORAGE_KEY = '@caroline:settings';

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  loaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  updateSettings: async () => {},
  loaded: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<AppSettings>;
          setSettings((prev) => ({ ...prev, ...saved }));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      // keep wsUrl in sync when serverUrl changes
      if (patch.serverUrl && !patch.wsUrl) {
        next.wsUrl = patch.serverUrl
          .replace(/^http:/, 'ws:')
          .replace(/^https:/, 'wss:')
          + '/ws/voice';
      }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
