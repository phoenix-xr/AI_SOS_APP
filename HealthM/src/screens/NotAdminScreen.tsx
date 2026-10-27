import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthUser } from '../context/AuthContext';

interface Props {
  user: AuthUser | null;
  onLogout: () => void;
}

export default function NotAdminScreen({ user, onLogout }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Image
          source={require('../assets/logo.png')}
          defaultSource={{ uri: 'https://healthmitra.co.in/assets/img/logo.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.centerContent}>
        {/* Warning / Lock Emblem */}
        <View style={styles.iconOuterRing}>
          <View style={styles.iconInnerCircle}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        </View>

        {/* Primary Message */}
        <Text style={styles.warningTag}>RESTRICTED ACCESS</Text>
        <Text style={styles.mainTitle}>You are not an admin</Text>
        <Text style={styles.subtitle}>
          This device console requires administrator privileges. Your account is currently assigned a standard user role.
        </Text>

        {/* User Account Info Card */}
        <View style={styles.accountCard}>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Account</Text>
            <Text style={styles.accountValue} numberOfLines={1}>
              {user?.username || 'User'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Email</Text>
            <Text style={styles.accountValue} numberOfLines={1}>
              {user?.email || 'N/A'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Current Role</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {(user?.role || 'user').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Switch Account Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.switchButton} onPress={onLogout} activeOpacity={0.85}>
          <Text style={styles.switchButtonText}>Sign Out & Switch Account</Text>
        </TouchableOpacity>
        <Text style={styles.hintText}>
          Contact your system administrator if you believe this is an error.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  logo: {
    width: 140,
    height: 38,
  },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  iconOuterRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconInnerCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  lockIcon: {
    fontSize: 36,
  },
  warningTag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#DC2626',
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  accountCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  accountLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  accountValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    maxWidth: '65%',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  bottomBar: {
    width: '100%',
    alignItems: 'center',
  },
  switchButton: {
    width: '100%',
    backgroundColor: '#111827',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 10,
  },
  switchButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
