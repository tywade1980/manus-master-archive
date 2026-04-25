import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Modal, Pressable, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';

interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  system_prompt: string;
  status: 'active' | 'inactive';
  task_count: number;
  success_rate: number;
}

interface Stats {
  agents: { total: number; active: number };
  skills: { total: number; enabled: number };
  messages: number;
  calls: number;
}

const MODEL_OPTIONS = [
  'gpt-4o',
  'gpt-4o-mini',
  'claude-sonnet-4-6',
  'mistral-runpod',
];

const BLANK_FORM = { name: '', description: '', model: 'gpt-4o-mini', system_prompt: 'You are a helpful assistant.' };

export default function SwarmScreen() {
  const { settings } = useSettings();
  const api = `${settings.serverUrl}/api`;

  const [agents, setAgents]       = useState<Agent[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [form, setForm]           = useState(BLANK_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsRes, statsRes] = await Promise.all([
        axios.get<Agent[]>(`${api}/agents`),
        axios.get<Stats>(`${api}/stats`),
      ]);
      setAgents(agentsRes.data);
      setStats(statsRes.data);
    } catch {
      // backend not yet upgraded — silent fail
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditAgent(null);
    setForm(BLANK_FORM);
    setModalVisible(true);
  };

  const openEdit = (agent: Agent) => {
    setEditAgent(agent);
    setForm({
      name: agent.name,
      description: agent.description,
      model: agent.model,
      system_prompt: agent.system_prompt,
    });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      if (editAgent) {
        await axios.put(`${api}/agents/${editAgent.id}`, form);
      } else {
        await axios.post(`${api}/agents`, form);
      }
      setModalVisible(false);
      load();
    } catch {
      Alert.alert('Error', 'Could not save agent. Backend may need updating.');
    }
  };

  const deleteAgent = async (id: string) => {
    Alert.alert('Delete Agent', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await axios.delete(`${api}/agents/${id}`); load(); } catch {}
        }
      }
    ]);
  };

  const toggleAgent = async (id: string) => {
    try {
      await axios.post(`${api}/agents/${id}/toggle`);
      load();
    } catch {
      Alert.alert('Error', 'Could not toggle agent.');
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />
      <View style={s.header}>
        <Text style={s.title}>Agent Swarm</Text>
        <TouchableOpacity onPress={openCreate} style={s.addBtn}>
          <MaterialIcons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={s.statsRow}>
        {[
          { label: 'Agents',   value: stats?.agents.total   ?? 0, icon: 'smart-toy',  color: '#6366F1' },
          { label: 'Active',   value: stats?.agents.active  ?? 0, icon: 'bolt',       color: '#10B981' },
          { label: 'Skills On',value: stats?.skills.enabled ?? 0, icon: 'extension',  color: '#8B5CF6' },
          { label: 'Messages', value: stats?.messages       ?? 0, icon: 'chat',       color: '#F59E0B' },
        ].map(item => (
          <View key={item.label} style={s.statCard}>
            <MaterialIcons name={item.icon as any} size={20} color={item.color} />
            <Text style={s.statValue}>{item.value}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {loading && <ActivityIndicator color="#6366F1" style={{ marginTop: 20 }} />}

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {agents.length === 0 && !loading && (
          <View style={s.empty}>
            <MaterialIcons name="hub" size={48} color="#374151" />
            <Text style={s.emptyText}>No agents yet. Tap + to create one.</Text>
            <Text style={s.emptyHint}>Agents require the backend API endpoints (/api/agents).</Text>
          </View>
        )}
        {agents.map(agent => (
          <View key={agent.id} style={[s.card, agent.status === 'active' && s.cardActive]}>
            <View style={s.cardHeader}>
              <View style={[s.agentDot, { backgroundColor: agent.status === 'active' ? '#10B981' : '#6B7280' }]} />
              <Text style={s.agentName}>{agent.name}</Text>
              <Text style={[s.badge, agent.status === 'active' ? s.badgeActive : s.badgeInactive]}>
                {agent.status}
              </Text>
            </View>
            <Text style={s.agentDesc} numberOfLines={2}>{agent.description}</Text>
            <Text style={s.agentModel}>{agent.model}</Text>
            <View style={s.cardActions}>
              <TouchableOpacity
                onPress={() => toggleAgent(agent.id)}
                style={[s.actionBtn, { backgroundColor: agent.status === 'active' ? '#7F1D1D' : '#064E3B' }]}
              >
                <MaterialIcons name={agent.status === 'active' ? 'stop' : 'play-arrow'} size={16} color="#fff" />
                <Text style={s.actionText}>{agent.status === 'active' ? 'Stop' : 'Start'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openEdit(agent)} style={[s.actionBtn, { backgroundColor: '#1E3A5F' }]}>
                <MaterialIcons name="edit" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteAgent(agent.id)} style={[s.actionBtn, { backgroundColor: '#1F2937' }]}>
                <MaterialIcons name="delete" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={s.modalContent} onPress={() => {}}>
            <Text style={s.modalTitle}>{editAgent ? 'Edit Agent' : 'New Agent'}</Text>
            {[
              { label: 'Name', key: 'name', placeholder: 'Agent name' },
              { label: 'Description', key: 'description', placeholder: 'What does this agent do?' },
            ].map(({ label, key, placeholder }) => (
              <View key={key} style={s.field}>
                <Text style={s.fieldLabel}>{label}</Text>
                <TextInput
                  style={s.input}
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm(f => ({ ...f, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor="#6B7280"
                />
              </View>
            ))}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Model</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {MODEL_OPTIONS.map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setForm(f => ({ ...f, model: m }))}
                    style={[s.chip, form.model === m && s.chipSelected]}
                  >
                    <Text style={[s.chipText, form.model === m && s.chipTextSelected]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={s.field}>
              <Text style={s.fieldLabel}>System Prompt</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.system_prompt}
                onChangeText={(v) => setForm(f => ({ ...f, system_prompt: v }))}
                multiline
                placeholder="Define the agent's role..."
                placeholderTextColor="#6B7280"
              />
            </View>
            <TouchableOpacity onPress={save} style={s.saveBtn}>
              <Text style={s.saveBtnText}>{editAgent ? 'Save Changes' : 'Create Agent'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0F0F1A' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  title:          { fontSize: 22, fontWeight: '700', color: '#F9FAFB' },
  addBtn:         { backgroundColor: '#6366F1', borderRadius: 20, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  statsRow:       { flexDirection: 'row', padding: 12, gap: 8 },
  statCard:       { flex: 1, backgroundColor: '#1F2937', borderRadius: 10, padding: 10, alignItems: 'center', gap: 4 },
  statValue:      { fontSize: 20, fontWeight: '700', color: '#F9FAFB' },
  statLabel:      { fontSize: 10, color: '#9CA3AF' },
  list:           { padding: 16, gap: 12 },
  empty:          { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText:      { color: '#6B7280', fontSize: 15, textAlign: 'center' },
  emptyHint:      { color: '#4B5563', fontSize: 12, textAlign: 'center' },
  card:           { backgroundColor: '#1F2937', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#374151' },
  cardActive:     { borderColor: '#065F46' },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  agentDot:       { width: 8, height: 8, borderRadius: 4 },
  agentName:      { flex: 1, fontSize: 15, fontWeight: '600', color: '#F9FAFB' },
  badge:          { fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  badgeActive:    { backgroundColor: '#064E3B', color: '#10B981' },
  badgeInactive:  { backgroundColor: '#374151', color: '#9CA3AF' },
  agentDesc:      { color: '#9CA3AF', fontSize: 13, marginBottom: 4 },
  agentModel:     { color: '#6B7280', fontSize: 11, fontFamily: 'monospace', marginBottom: 10 },
  cardActions:    { flexDirection: 'row', gap: 8 },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actionText:     { color: '#fff', fontSize: 13, fontWeight: '600' },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent:   { backgroundColor: '#1F2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12, maxHeight: '85%' },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: '#F9FAFB', marginBottom: 8 },
  field:          { gap: 6 },
  fieldLabel:     { color: '#9CA3AF', fontSize: 13 },
  input:          { backgroundColor: '#111827', color: '#F9FAFB', borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  chip:           { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#111827', borderWidth: 1, borderColor: '#374151', marginRight: 8 },
  chipSelected:   { backgroundColor: '#312E81', borderColor: '#6366F1' },
  chipText:       { color: '#9CA3AF', fontSize: 12 },
  chipTextSelected: { color: '#A5B4FC' },
  saveBtn:        { backgroundColor: '#6366F1', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:    { color: '#fff', fontWeight: '600', fontSize: 15 },
});
