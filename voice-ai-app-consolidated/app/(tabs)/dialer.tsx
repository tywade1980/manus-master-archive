import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';

interface CallLog {
  id: string;
  phone_number: string;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'active' | 'completed' | 'missed';
  duration: number;
  transcript: string;
  created_at: string;
}

const DIAL_PAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

function fmtDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function DialerScreen() {
  const { settings } = useSettings();
  const api = `${settings.serverUrl}/api`;

  const [number, setNumber]     = useState('');
  const [calls, setCalls]       = useState<CallLog[]>([]);
  const [loading, setLoading]   = useState(false);
  const [dialing, setDialing]   = useState(false);

  const loadCalls = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<CallLog[]>(`${api}/calls`);
      setCalls(data);
    } catch {} finally { setLoading(false); }
  }, [api]);

  useEffect(() => { loadCalls(); }, [loadCalls]);

  const press = (d: string) => {
    if (number.length < 15) setNumber(prev => prev + d);
  };

  const backspace = () => setNumber(prev => prev.slice(0, -1));

  const call = async () => {
    if (!number) return;
    setDialing(true);
    try {
      await axios.post(`${api}/calls/initiate`, null, { params: { phone_number: number } });
      setNumber('');
      loadCalls();
    } catch {} finally { setDialing(false); }
  };

  const callIcon = (dir: string, status: string) => {
    if (status === 'missed') return { name: 'phone-missed', color: '#EF4444' };
    if (dir === 'inbound')   return { name: 'call-received', color: '#10B981' };
    return { name: 'call-made', color: '#6366F1' };
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return '#10B981';
    if (s === 'missed')    return '#EF4444';
    if (s === 'active')    return '#F59E0B';
    return '#9CA3AF';
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />
      <View style={s.header}>
        <Text style={s.title}>Dialer</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Notice */}
        <View style={s.notice}>
          <MaterialIcons name="warning" size={16} color="#F59E0B" />
          <Text style={s.noticeText}>Live calls require carrier integration. Use this to log and queue calls.</Text>
        </View>

        {/* Number display */}
        <View style={s.displayBox}>
          <Text style={s.displayText}>{number || 'Enter number'}</Text>
          {number.length > 0 && (
            <TouchableOpacity onPress={backspace} style={s.backspaceBtn}>
              <MaterialIcons name="backspace" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Dial pad */}
        <View style={s.dialPad}>
          {DIAL_PAD.map((row, ri) => (
            <View key={ri} style={s.dialRow}>
              {row.map(d => (
                <TouchableOpacity key={d} onPress={() => press(d)} style={s.dialBtn}>
                  <Text style={s.dialBtnText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Call / Clear */}
        <View style={s.actionRow}>
          <TouchableOpacity
            onPress={() => setNumber('')}
            disabled={!number}
            style={[s.clearBtn, !number && { opacity: 0.4 }]}
          >
            <Text style={s.clearBtnText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={call}
            disabled={!number || dialing}
            style={[s.callBtn, (!number || dialing) && { opacity: 0.5 }]}
          >
            <MaterialIcons name="phone" size={22} color="#fff" />
            <Text style={s.callBtnText}>{dialing ? 'Queuing...' : 'Call'}</Text>
          </TouchableOpacity>
        </View>

        {/* Call history */}
        <Text style={s.sectionTitle}>Recent Calls</Text>
        {loading && <ActivityIndicator color="#6366F1" />}
        {!loading && calls.length === 0 && (
          <View style={s.empty}>
            <MaterialIcons name="phone" size={36} color="#374151" />
            <Text style={s.emptyText}>No call history yet</Text>
          </View>
        )}
        {calls.map(call => {
          const icon = callIcon(call.direction, call.status);
          return (
            <View key={call.id} style={s.callCard}>
              <MaterialIcons name={icon.name as any} size={20} color={icon.color} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.callNumber}>{call.phone_number}</Text>
                <Text style={s.callTime}>{new Date(call.created_at).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.callStatus, { color: statusColor(call.status) }]}>{call.status}</Text>
                {call.duration > 0 && <Text style={s.callDuration}>{fmtDuration(call.duration)}</Text>}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0F0F1A' },
  header:       { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  title:        { fontSize: 22, fontWeight: '700', color: '#F9FAFB' },
  body:         { padding: 16, gap: 14 },
  notice:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1A1200', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#78350F' },
  noticeText:   { color: '#FCA522', fontSize: 12, flex: 1 },
  displayBox:   { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 58 },
  displayText:  { color: '#F9FAFB', fontSize: 26, fontFamily: 'monospace', flex: 1, textAlign: 'center' },
  backspaceBtn: { padding: 4 },
  dialPad:      { gap: 10 },
  dialRow:      { flexDirection: 'row', gap: 10 },
  dialBtn:      { flex: 1, backgroundColor: '#1F2937', borderRadius: 12, height: 56, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  dialBtnText:  { color: '#F9FAFB', fontSize: 22, fontFamily: 'monospace', fontWeight: '600' },
  actionRow:    { flexDirection: 'row', gap: 10 },
  clearBtn:     { flex: 1, backgroundColor: '#1F2937', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  clearBtnText: { color: '#9CA3AF', fontSize: 15, fontWeight: '600' },
  callBtn:      { flex: 2, backgroundColor: '#16A34A', borderRadius: 12, height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  callBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#F9FAFB', marginTop: 4 },
  empty:        { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText:    { color: '#6B7280', fontSize: 14 },
  callCard:     { backgroundColor: '#1F2937', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  callNumber:   { color: '#F9FAFB', fontSize: 14, fontFamily: 'monospace' },
  callTime:     { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  callStatus:   { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  callDuration: { color: '#9CA3AF', fontSize: 11 },
});
