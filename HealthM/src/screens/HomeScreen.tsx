import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { api, apiConfig, HealthResponse } from '../services/api';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();

  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const handleCheckHealth = async () => {
    try {
      setCheckingHealth(true);
      const res = await api.checkHealth();
      setHealthStatus(res);
      Alert.alert(
        'Backend Health OK',
        `Database: ${res.database}\nStatus: ${res.status}\nServer Version: ${res.version}`
      );
    } catch (err: any) {
      Alert.alert('Health Check Failed', err.message);
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Math.max(insets.top + 16, 24),
          paddingBottom: Math.max(insets.bottom + 24, 32),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={styles.topBar}>
        <Image
          source={require('../assets/logo.png')}
          defaultSource={{ uri: 'https://healthmitra.co.in/assets/img/logo.png' }}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.logoutIconButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonLabel}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* User Welcome Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.welcomeInfo}>
          <Text style={styles.greetingText}>Welcome back,</Text>
          <Text style={styles.userNameText}>{user?.full_name || user?.username}</Text>
          <Text style={styles.userEmailText}>{user?.email}</Text>
        </View>
        <View style={styles.badgeRow}>
          <View style={styles.jwtBadge}>
            <Text style={styles.jwtBadgeText}>✓ JWT Authenticated</Text>
          </View>
          <View style={styles.dbBadge}>
            <Text style={styles.dbBadgeText}>
              {user?.provider === 'supabase'
                ? '☁️ Cloud Database'
                : '🐘 Local Database'}
            </Text>
          </View>
        </View>
      </View>

      {/* Backend & Security Diagnostics */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Backend & Database Status</Text>
        <Text style={styles.endpointLabel}>
          API URL: <Text style={styles.endpointValue}>{apiConfig.getBaseUrl()}</Text>
        </Text>

        {healthStatus && (
          <View style={styles.healthResultBox}>
            <Text style={styles.healthDetailText}>
              • Status: <Text style={styles.boldText}>{healthStatus.status}</Text>
            </Text>
            <Text style={styles.healthDetailText}>
              • Database: <Text style={styles.boldText}>{healthStatus.database}</Text>
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.testHealthButton}
          onPress={handleCheckHealth}
          disabled={checkingHealth}
          activeOpacity={0.8}
        >
          {checkingHealth ? (
            <ActivityIndicator color="#38A3E5" size="small" />
          ) : (
            <Text style={styles.testHealthButtonText}>⚡ Ping /health API & Database</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Token Details (Masked) */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Active JWT Session</Text>
        <Text style={styles.sessionMetaLabel}>
          User ID: <Text style={styles.sessionMetaValue}>#{user?.id}</Text>
        </Text>
        <Text style={styles.sessionMetaLabel}>
          Username: <Text style={styles.sessionMetaValue}>{user?.username}</Text>
        </Text>
        <View style={styles.tokenBox}>
          <Text style={styles.tokenText} numberOfLines={2} ellipsizeMode="middle">
            {token || 'No token found'}
          </Text>
        </View>
      </View>

      {/* Quick Healthcare Actions */}
      <Text style={styles.quickServicesTitle}>Quick Healthcare Services</Text>
      <View style={styles.servicesGrid}>
        <TouchableOpacity
          style={styles.serviceItem}
          onPress={() => Alert.alert('Consultations', 'Booking doctor consultation...')}
        >
          <Text style={styles.serviceIcon}>🩺</Text>
          <Text style={styles.serviceName}>Consult Doctor</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.serviceItem}
          onPress={() => Alert.alert('Prescriptions', 'Viewing medical prescriptions...')}
        >
          <Text style={styles.serviceIcon}>💊</Text>
          <Text style={styles.serviceName}>Pharmacy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.serviceItem}
          onPress={() => Alert.alert('Records', 'Accessing EHR medical records...')}
        >
          <Text style={styles.serviceIcon}>📋</Text>
          <Text style={styles.serviceName}>Health Records</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.serviceItem}
          onPress={() => Alert.alert('SOS', 'Emergency SOS alert activated!')}
        >
          <Text style={styles.serviceIcon}>🚨</Text>
          <Text style={styles.serviceName}>Emergency SOS</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLogo: {
    width: 160,
    height: 48,
  },
  logoutIconButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutButtonLabel: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  welcomeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#38A3E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  welcomeInfo: {
    marginBottom: 12,
  },
  greetingText: {
    fontSize: 13,
    color: '#64748B',
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  userEmailText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  jwtBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  jwtBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '600',
  },
  dbBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  dbBadgeText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  endpointLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  endpointValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#38A3E5',
    fontWeight: '600',
  },
  testHealthButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testHealthButtonText: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: '600',
  },
  healthResultBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  healthDetailText: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 2,
  },
  boldText: {
    fontWeight: '700',
  },
  sessionMetaLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  sessionMetaValue: {
    color: '#0F172A',
    fontWeight: '600',
  },
  tokenBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tokenText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  quickServicesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 12,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceIcon: {
    fontSize: 26,
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
});
