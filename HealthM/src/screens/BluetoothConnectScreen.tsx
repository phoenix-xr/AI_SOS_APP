import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestBluetoothPermissions } from '../services/bluetooth';

interface Props {
  onStartScanning: () => void;
  onLogout: () => void;
}

export default function BluetoothConnectScreen({ onStartScanning, onLogout }: Props) {
  const insets = useSafeAreaInsets();

  const handleConnectPress = async () => {
    // 1. Request Bluetooth turning on / runtime permissions on user's phone
    const hasPermission = await requestBluetoothPermissions();

    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Bluetooth permission is required to discover and connect to your HealthMitra device. Please enable it in Settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    // 2. Permission granted, proceed to scanning screen
    onStartScanning();
  };

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
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.centerContent}>
        {/* Bluetooth Hero Icon Circle */}
        <View style={styles.iconOuterRing}>
          <View style={styles.iconInnerCircle}>
            <Text style={styles.bluetoothIcon}>📡</Text>
          </View>
        </View>

        <Text style={styles.title}>Connect Your Device</Text>
        <Text style={styles.description}>
          Pair your HealthMitra sensor to wirelessly receive diagnostics, heart rate, and real-time medical data.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Ensure your device is switched on and within 5 meters of your phone.
          </Text>
        </View>
      </View>

      {/* Bottom Connect Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={handleConnectPress}
          activeOpacity={0.85}
        >
          <Text style={styles.connectButtonIcon}>⚡</Text>
          <Text style={styles.connectButtonText}>Connect</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 170,
    height: 50,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconOuterRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 2,
    borderColor: '#BAE6FD',
  },
  iconInnerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#38A3E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38A3E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  bluetoothIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
  },
  bottomSection: {
    width: '100%',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38A3E5',
    height: 54,
    borderRadius: 14,
    shadowColor: '#38A3E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  connectButtonIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    marginRight: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
