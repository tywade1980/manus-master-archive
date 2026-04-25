import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Modal, Pressable, Switch, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  enabled: boolean;
}

const CATEGORIES = [
  { value: 'communication', label: 'Communication', icon: 'chat' },
  { value: 'calendar',      label: 'Calendar',      icon: 'event' },
  { value: 'storage',       label: 'Storage',       icon: 'storage' },
  { value: 'automation',    label: 'Automation',    icon: 'bolt' },
  { value: 'social',        label: 'Social',        icon: 'share' },
  { value: 'productivity',  label: 'Productivity',  icon: 'work' },
  { value: 'custom',        label: 'Custom',        icon: 'code' },
];

const PRESETS = [
  { name: 'Slack Connector',   description: 'Send messages and manage Slack workspace',              category: 'communication' },
  { name: 'Google Calendar',   description: 'Create events, check availability, manage schedules', category: 'calendar' },
  { name: 'Discord Bot',       description: 'Manage Discord servers, send messages',                category: 'social' },
  { name: 'Gmail Integration', description: 'Read, send, and organize emails automatically',        category: 'communication' },
  { name: 'Google Drive',      description: 'Upload, download, and manage Drive files',             category: 'storage' },
  { name: 'Notion API',        description: 'Create pages, update databases, sync content',         category: 'productivity' },
];

const BLANK = { name: '', description: '', category: 'custom' };

export default function SkillsScreen() {
  const { settings } = useSettings();
  const api = `${settings.serverUrl}/api`;

  const [skills, setSkills]         = useState<Skill[]>([]);
  const [loading, setLoading]       = useState(false);
  const [tab, setTab]               = useState<'installed' | 'marketplace'>('installed');
  const [modalVisible, setModal]    = useState(false);
  const [form, setForm]             = useState(BLANK);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Skill[]>(`${api}/skills`);
      setSkills(res.data);
    } catch {} finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const createSkill = async (data = form) => {
    try {
      await axios.post(`${api}/skills`, data);
      setModal(false);
      setForm(BLANK);
      load();
    } catch {
      Alert.alert('Error', 'Could not create skill. Backend may need updating.');
    }
  };

  const toggleSkill = async (id: string) => {
    try {
      await axios.put(`${api}/skills/${id}/toggle`);
      load();
    } catch {}
  };

  const deleteSkill = async (id: string) => {
    Alert.alert('Remove Skill', 'Remove this skill?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try { await axios.delete(`${api}/skills/${id}`); load(); } catch {}
        }
      }
    ]);
  };

  const getCategoryIcon = (cat: string) =>
    (CATEGORIES.find(c => c.value === cat)?.icon ?? 'extension') as any;

  const isInstalled = (name: string) => skills.some(s => s.name === name);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />
      <View style={s.header}>
        <Text style={s.title}>Skills & Connectors</Text>
        <TouchableOpacity onPress={() => setModal(true)} style={s.addBtn}>
          <MaterialIcons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['installed', 'marketplace'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tabItem, tab === t && s.tabActive]}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'installed' ? `Installed (${skills.length})` : 'Marketplace'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator color="#8B5CF6" style={{ marginTop: 20 }} />}

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {tab === 'installed' ? (
          skills.length === 0 && !loading ? (
            <View style={s.empty}>
              <MaterialIcons name="extension" size={48} color="#374151" />
              <Text style={s.emptyText}>No skills installed yet.</Text>
              <Text style={s.emptyHint}>Check the Marketplace tab or create a custom skill.</Text>
            </View>
          ) : (
            skills.map(skill => (
              <View key={skill.id} style={[s.card, skill.enabled && s.cardEnabled]}>
                <View style={s.cardRow}>
                  <View style={[s.iconBox, { backgroundColor: skill.enabled ? '#3B0764' : '#1F2937' }]}>
                    <MaterialIcons name={getCategoryIcon(skill.category)} size={18} color={skill.enabled ? '#A78BFA' : '#9CA3AF'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.skillName}>{skill.name}</Text>
                    <Text style={s.skillCat}>{skill.category}</Text>
                  </View>
                  <Switch
                    value={skill.enabled}
                    onValueChange={() => toggleSkill(skill.id)}
                    trackColor={{ false: '#374151', true: '#5B21B6' }}
                    thumbColor={skill.enabled ? '#8B5CF6' : '#9CA3AF'}
                  />
                </View>
                <Text style={s.skillDesc} numberOfLines={2}>{skill.description}</Text>
                <TouchableOpacity onPress={() => deleteSkill(skill.id)} style={s.removeBtn}>
                  <MaterialIcons name="delete" size={14} color="#EF4444" />
                  <Text style={s.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        ) : (
          PRESETS.map((preset, i) => (
            <View key={i} style={s.card}>
              <View style={s.cardRow}>
                <View style={s.iconBox}>
                  <MaterialIcons name={getCategoryIcon(preset.category)} size={18} color="#9CA3AF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.skillName}>{preset.name}</Text>
                  <Text style={s.skillCat}>{preset.category}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => createSkill({ name: preset.name, description: preset.description, category: preset.category })}
                  disabled={isInstalled(preset.name)}
                  style={[s.installBtn, isInstalled(preset.name) && s.installBtnDone]}
                >
                  <Text style={s.installBtnText}>{isInstalled(preset.name) ? 'Installed' : 'Install'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.skillDesc}>{preset.description}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setModal(false)}>
          <Pressable style={s.modalContent} onPress={() => {}}>
            <Text style={s.modalTitle}>Create Custom Skill</Text>
            {[
              { label: 'Name', key: 'name', placeholder: 'Skill name' },
              { label: 'Description', key: 'description', placeholder: 'What does this skill do?' },
            ].map(({ label, key, placeholder }) => (
              <View key={key} style={s.field}>
                <Text style={s.fieldLabel}>{label}</Text>
                <TextInput
                  style={s.input}
                  value={(form as any)[key]}
                  onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor="#6B7280"
                />
              </View>
            ))}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.value}
                    onPress={() => setForm(f => ({ ...f, category: c.value }))}
                    style={[s.chip, form.category === c.value && s.chipSelected]}
                  >
                    <Text style={[s.chipText, form.category === c.value && s.chipTextSelected]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity
              onPress={() => createSkill()}
              disabled={!form.name || !form.description}
              style={[s.saveBtn, (!form.name || !form.description) && { opacity: 0.5 }]}
            >
              <Text style={s.saveBtnText}>Create Skill</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0F0F1A' },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  title:           { fontSize: 22, fontWeight: '700', color: '#F9FAFB' },
  addBtn:          { backgroundColor: '#7C3AED', borderRadius: 20, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  tabRow:          { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tabItem:         { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1F2937' },
  tabActive:       { backgroundColor: '#3B0764' },
  tabText:         { color: '#9CA3AF', fontSize: 13, fontWeight: '500' },
  tabTextActive:   { color: '#A78BFA' },
  list:            { padding: 16, gap: 10 },
  empty:           { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText:       { color: '#6B7280', fontSize: 15, textAlign: 'center' },
  emptyHint:       { color: '#4B5563', fontSize: 12, textAlign: 'center' },
  card:            { backgroundColor: '#1F2937', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#374151' },
  cardEnabled:     { borderColor: '#4C1D95' },
  cardRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconBox:         { width: 36, height: 36, borderRadius: 8, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' },
  skillName:       { fontSize: 14, fontWeight: '600', color: '#F9FAFB' },
  skillCat:        { fontSize: 11, color: '#9CA3AF' },
  skillDesc:       { fontSize: 13, color: '#9CA3AF' },
  removeBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-end' },
  removeBtnText:   { color: '#EF4444', fontSize: 12 },
  installBtn:      { backgroundColor: '#5B21B6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  installBtnDone:  { backgroundColor: '#374151' },
  installBtnText:  { color: '#fff', fontSize: 12, fontWeight: '600' },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent:    { backgroundColor: '#1F2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalTitle:      { fontSize: 18, fontWeight: '700', color: '#F9FAFB', marginBottom: 8 },
  field:           { gap: 6 },
  fieldLabel:      { color: '#9CA3AF', fontSize: 13 },
  input:           { backgroundColor: '#111827', color: '#F9FAFB', borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  chip:            { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#111827', borderWidth: 1, borderColor: '#374151', marginRight: 8 },
  chipSelected:    { backgroundColor: '#3B0764', borderColor: '#7C3AED' },
  chipText:        { color: '#9CA3AF', fontSize: 12 },
  chipTextSelected:{ color: '#A78BFA' },
  saveBtn:         { backgroundColor: '#7C3AED', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:     { color: '#fff', fontWeight: '600', fontSize: 15 },
});
