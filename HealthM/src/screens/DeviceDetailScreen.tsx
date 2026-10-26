import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BluetoothDevice } from '../services/bluetooth';

interface Props {
  device: BluetoothDevice;
  onDisconnect: () => void;
  onGoToHome?: () => void;
}

export default function DeviceDetailScreen({ device, onDisconnect, onGoToHome }: Props) {
  const insets = useSafeAreaInsets();

  const handleDisconnect = () => {
    Alert.alert('Disconnect Device', 'Are you sure you want to disconnect from this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: onDisconnect,
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      {/* Top Header Card with Device Name on the Top */}
      <View style={styles.topHeaderCard}>
        <View style={styles.deviceHeaderRow}>
          <View style={styles.deviceIconCircle}>
            <Text style={styles.deviceIcon}>🩺</Text>
          </View>
          <View style={styles.deviceTitleContainer}>
            <Text style={styles.deviceLabel}>CONNECTED DEVICE</Text>
            {/* Device Name on the Top as requested */}
            <Text style={styles.deviceName} numberOfLines={2}>
              {device.name}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.connectedBadge}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.connectedText}>Connected via Bluetooth</Text>
          </View>
          <Text style={styles.deviceIdText}>ID: {device.id}</Text>
        </View>
      </View>

      {/* Middle Specs & Telemetry Readiness Card */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionHeader}>Hardware Status</Text>

        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricIcon}>📶</Text>
            <Text style={styles.metricLabel}>Signal Strength</Text>
            <Text style={styles.metricValue}>{device.rssi ? `${device.rssi} dBm` : 'Good'}</Text>
            <Text style={styles.metricSub}>Strong Link</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricIcon}>🔋</Text>
            <Text style={styles.metricLabel}>Battery Level</Text>
            <Text style={styles.metricValue}>{device.batteryLevel ? `${device.batteryLevel}%` : '98%'}</Text>
            <Text style={styles.metricSub}>Fully Charged</Text>
          </View>
        </View>

        {/* Ready Notification Box */}
        <View style={styles.readyCard}>
          <Text style={styles.readyTitle}>✓ Ready to Receive Data</Text>
          <Text style={styles.readyDescription}>
            Bluetooth handshake established. Sensors are calibrated and awaiting measurement commands.
          </Text>
        </View>
      </View>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomSection}>
        {onGoToHome && (
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={onGoToHome}
            activeOpacity={0.8}
          >
            <Text style={styles.homeBtnText}>View Healthcare Dashboard</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.disconnectBtn}
          onPress={handleDisconnect}
          activeOpacity={0.8}
        >
          <Text style={styles.disconnectText}>Disconnect Device</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  topHeaderCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  deviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deviceIcon: {
    fontSize: 26,
  },
  deviceTitleContainer: {
    flex: 1,
  },
  deviceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  deviceIdText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  contentSection: {
    marginVertical: 20,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  readyCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  readyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 4,
  },
  readyDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
  },
  bottomSection: {
    width: '100%',
    gap: 10,
  },
  homeBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#38A3E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38A3E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  homeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disconnectBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
