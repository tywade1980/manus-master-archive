import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert, Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSettings, VoiceEngine, TtsEngine, LlmBackend } from '../context/SettingsContext';

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <MaterialIcons name={icon as any} size={18} color="#6366F1" />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value, onChangeText, placeholder, secureTextEntry, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; secureTextEntry?: boolean; multiline?: boolean;
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 72, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function ChipGroup<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <View style={s.chipRow}>
      {options.map(o => (
        <TouchableOpacity
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[s.chip, value === o.value && s.chipSelected]}
        >
          <Text style={[s.chipText, value === o.value && s.chipTextSelected]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const [serverUrl, setServerUrl]         = useState(settings.serverUrl);
  const [systemPrompt, setSystemPrompt]   = useState(settings.systemPrompt);
  const [personaName, setPersonaName]     = useState(settings.personaName);
  const [dgKey, setDgKey]                 = useState(settings.deepgramApiKey);
  const [dgVoice, setDgVoice]             = useState(settings.deepgramVoice);
  const [runpodEndpoint, setRunpodEndpoint] = useState(settings.runpodEndpoint);
  const [runpodApiKey, setRunpodApiKey]   = useState(settings.runpodApiKey);
  const [ollamaEndpoint, setOllamaEndpoint] = useState(settings.ollamaEndpoint);
  const [ttsSpeed, setTtsSpeedStr]        = useState(String(settings.ttsSpeed));

  const save = async () => {
    const speed = parseFloat(ttsSpeed);
    if (isNaN(speed) || speed < 0.5 || speed > 2.0) {
      Alert.alert('Invalid Speed', 'TTS speed must be between 0.5 and 2.0');
      return;
    }
    await updateSettings({
      serverUrl,
      systemPrompt,
      personaName,
      deepgramApiKey: dgKey,
      deepgramVoice: dgVoice,
      runpodEndpoint,
      runpodApiKey,
      ollamaEndpoint,
      ttsSpeed: speed,
    });
    Alert.alert('Saved', 'Settings updated successfully.');
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* Server */}
        <Section title="Server" icon="dns">
          <Row
            label="Server URL"
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="https://caroline-server-v2-production.up.railway.app"
          />
          <Text style={s.hint}>WebSocket URL auto-derives from this (wss://…/ws/voice).</Text>
        </Section>

        {/* Persona */}
        <Section title="Persona" icon="face">
          <Row label="Name" value={personaName} onChangeText={setPersonaName} placeholder="Caroline" />
          <Row label="System Prompt" value={systemPrompt} onChangeText={setSystemPrompt} multiline />
        </Section>

        {/* Voice Engine */}
        <Section title="Voice Engine" icon="mic">
          <Text style={s.fieldLabel}>Backend</Text>
          <ChipGroup<VoiceEngine>
            value={settings.voiceEngine}
            options={[
              { value: 'xai',      label: 'xAI Realtime (Ara)' },
              { value: 'deepgram', label: 'Deepgram Agent' },
            ]}
            onChange={(v) => updateSettings({ voiceEngine: v })}
          />
          {settings.voiceEngine === 'deepgram' && (
            <>
              <Row label="Deepgram API Key" value={dgKey} onChangeText={setDgKey} secureTextEntry placeholder="dg_…" />
              <Text style={s.fieldLabel}>STT Model</Text>
              <ChipGroup
                value={settings.deepgramModel}
                options={[
                  { value: 'nova-3',  label: 'Nova 3' },
                  { value: 'nova-2',  label: 'Nova 2' },
                ]}
                onChange={(v) => updateSettings({ deepgramModel: v })}
              />
              <Row label="TTS Voice" value={dgVoice} onChangeText={setDgVoice} placeholder="aura-2-thalia-en" />
            </>
          )}
        </Section>

        {/* TTS (REST fallback) */}
        <Section title="TTS Engine (REST)" icon="volume-up">
          <Text style={s.fieldLabel}>Engine</Text>
          <ChipGroup<TtsEngine>
            value={settings.ttsEngine}
            options={[
              { value: 'xai',        label: 'xAI / Caroline' },
              { value: 'elevenlabs', label: 'ElevenLabs' },
              { value: 'openai',     label: 'OpenAI' },
            ]}
            onChange={(v) => updateSettings({ ttsEngine: v })}
          />
          <Row
            label="Speed (0.5–2.0)"
            value={ttsSpeed}
            onChangeText={setTtsSpeedStr}
            placeholder="1.0"
          />
        </Section>

        {/* LLM Backend */}
        <Section title="LLM Backend" icon="psychology">
          <ChipGroup<LlmBackend>
            value={settings.llmBackend}
            options={[
              { value: 'xai',        label: 'xAI (Grok)' },
              { value: 'openrouter', label: 'OpenRouter' },
              { value: 'openai',     label: 'OpenAI' },
              { value: 'runpod',     label: 'Runpod' },
              { value: 'ollama',     label: 'Ollama' },
            ]}
            onChange={(v) => updateSettings({ llmBackend: v })}
          />
          {(settings.llmBackend === 'runpod') && (
            <>
              <Row label="Runpod Endpoint" value={runpodEndpoint} onChangeText={setRunpodEndpoint} placeholder="http://pod-ip:8000" />
              <Row label="Runpod API Key" value={runpodApiKey} onChangeText={setRunpodApiKey} secureTextEntry />
            </>
          )}
          {settings.llmBackend === 'ollama' && (
            <Row label="Ollama Endpoint" value={ollamaEndpoint} onChangeText={setOllamaEndpoint} placeholder="http://localhost:11434" />
          )}
        </Section>

        {/* Save */}
        <TouchableOpacity onPress={save} style={s.saveBtn}>
          <MaterialIcons name="save" size={20} color="#fff" />
          <Text style={s.saveBtnText}>Save Settings</Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={s.infoBox}>
          {[
            ['Version', '3.0.0'],
            ['EAS Project', '3af4db2d-524e-49fe-a6d1-82148cfa23dc'],
            ['Runtime Policy', 'appVersion'],
          ].map(([k, v]) => (
            <View key={k} style={s.infoRow}>
              <Text style={s.infoKey}>{k}</Text>
              <Text style={s.infoVal}>{v}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0F0F1A' },
  header:       { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  title:        { fontSize: 22, fontWeight: '700', color: '#F9FAFB' },
  body:         { padding: 16, gap: 16, paddingBottom: 40 },
  section:      { backgroundColor: '#1F2937', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#374151' },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: 1, borderBottomColor: '#374151' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#F9FAFB' },
  sectionBody:  { padding: 14, gap: 12 },
  field:        { gap: 6 },
  fieldLabel:   { color: '#9CA3AF', fontSize: 13 },
  input:        { backgroundColor: '#111827', color: '#F9FAFB', borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  hint:         { color: '#4B5563', fontSize: 11 },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#111827', borderWidth: 1, borderColor: '#374151' },
  chipSelected: { backgroundColor: '#312E81', borderColor: '#6366F1' },
  chipText:     { color: '#9CA3AF', fontSize: 12 },
  chipTextSelected: { color: '#A5B4FC' },
  saveBtn:      { backgroundColor: '#6366F1', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  infoBox:      { backgroundColor: '#1F2937', borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: '#374151' },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between' },
  infoKey:      { color: '#9CA3AF', fontSize: 13 },
  infoVal:      { color: '#F9FAFB', fontSize: 13, fontFamily: 'monospace' },
});
