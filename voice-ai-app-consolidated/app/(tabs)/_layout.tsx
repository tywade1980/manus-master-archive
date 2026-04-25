import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F0F1A',
          borderTopColor: '#1F2937',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Voice',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="mic" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="swarm"
        options={{
          title: 'Swarm',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="hub" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="skills"
        options={{
          title: 'Skills',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="extension" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dialer"
        options={{
          title: 'Dialer',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="phone" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
