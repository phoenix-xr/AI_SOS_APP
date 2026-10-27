import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BluetoothDevice,
  disconnectDevice,
  HealthTelemetry,
  parseHealthTelemetry,
  subscribeToDeviceData,
} from '../services/bluetooth';

interface Props {
  device: BluetoothDevice;
  onDisconnect: () => void;
  onGoToHome?: () => void;
}

interface PacketLogItem {
  id: string;
  text: string;
  time: string;
}

export default function DeviceDetailScreen({ device, onDisconnect, onGoToHome }: Props) {
  const insets = useSafeAreaInsets();

  const [telemetry, setTelemetry] = useState<HealthTelemetry | null>(null);
  const [packetCount, setPacketCount] = useState<number>(0);
  const [packetHistory, setPacketHistory] = useState<PacketLogItem[]>([]);

  // Pulse animation for live data indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Subscribe to real-time incoming BLE data from this device
  useEffect(() => {
    const unsubscribe = subscribeToDeviceData(device.macAddress, incoming => {
      setTelemetry(incoming);
      setPacketCount(prev => prev + 1);
      setPacketHistory(prev => [
        {
          id: `${Date.now()}-${Math.random()}`,
          text: incoming.raw,
          time: new Date(incoming.timestamp).toLocaleTimeString(),
        },
        ...prev.slice(0, 24), // keep last 25 packets
      ]);
    });

    return () => {
      unsubscribe();
    };
  }, [device.macAddress]);

  const handleDisconnect = () => {
    Alert.alert('Disconnect Device', 'Are you sure you want to disconnect from this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () => {
          disconnectDevice(device.macAddress);
          onDisconnect();
        },
      },
    ]);
  };

  // Optional test simulation to preview packet parsing
  const handleSimulateTestPacket = () => {
    const randomHR = Math.floor(68 + Math.random() * 22);
    const randomSpO2 = Math.floor(96 + Math.random() * 4);
    const randomTemp = parseFloat((36.4 + Math.random() * 0.8).toFixed(1));
    const randomBatt = Math.floor(82 + Math.random() * 15);
    const testJson = JSON.stringify({
      heartRate: randomHR,
      spo2: randomSpO2,
      temperature: randomTemp,
      battery: randomBatt,
    });

    const parsed = parseHealthTelemetry(testJson, Date.now());
    setTelemetry(parsed);
    setPacketCount(prev => prev + 1);
    setPacketHistory(prev => [
      {
        id: `${Date.now()}-${Math.random()}`,
        text: testJson,
        time: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 24),
    ]);
  };

  const getDeviceIcon = () => {
    const name = device.name.toLowerCase();
    if (name.includes('esp32')) return '📟';
    if (name.includes('band')) return '⌚';
    if (name.includes('ecg')) return '💓';
    if (name.includes('oximeter') || name.includes('spo2')) return '🩸';
    if (name.includes('beacon')) return '📡';
    return '🩺';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top Header Card with Device Name on the Top */}
        <View style={styles.topHeaderCard}>
          <View style={styles.deviceHeaderRow}>
            <View style={styles.deviceIconCircle}>
              <Text style={styles.deviceIcon}>{getDeviceIcon()}</Text>
            </View>
            <View style={styles.deviceTitleContainer}>
              <Text style={styles.deviceLabel}>CONNECTED BLE PERIPHERAL</Text>
              <Text style={styles.deviceName} numberOfLines={2}>
                {device.name}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.connectedBadge}>
              <Animated.View style={[styles.greenPulseDot, { opacity: pulseAnim }]} />
              <Text style={styles.connectedText}>
                {packetCount > 0 ? 'Receiving Live Data' : 'GATT Linked'}
              </Text>
            </View>
            <Text style={styles.deviceIdText}>MAC: {device.macAddress}</Text>
          </View>
        </View>

        {/* Live Vitals Grid */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Live Medical Telemetry</Text>
          <View style={styles.liveIndicatorBadge}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.liveIndicatorText}>
              {packetCount > 0 ? `${packetCount} pkts` : 'Awaiting ESP32'}
            </Text>
          </View>
        </View>

        <View style={styles.vitalsGrid}>
          {/* Heart Rate */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeaderRow}>
              <Text style={styles.vitalIcon}>💓</Text>
              <Text style={styles.vitalLabel}>Heart Rate</Text>
            </View>
            <Text style={styles.vitalValue}>
              {telemetry?.heartRate !== undefined ? telemetry.heartRate : '--'}
            </Text>
            <Text style={styles.vitalUnit}>BPM (Pulse)</Text>
          </View>

          {/* Blood Oxygen */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeaderRow}>
              <Text style={styles.vitalIcon}>🩸</Text>
              <Text style={styles.vitalLabel}>Blood Oxygen</Text>
            </View>
            <Text style={styles.vitalValue}>
              {telemetry?.spo2 !== undefined ? `${telemetry.spo2}%` : '--'}
            </Text>
            <Text style={styles.vitalUnit}>SpO2</Text>
          </View>

          {/* Body Temperature */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeaderRow}>
              <Text style={styles.vitalIcon}>🌡️</Text>
              <Text style={styles.vitalLabel}>Temperature</Text>
            </View>
            <Text style={styles.vitalValue}>
              {telemetry?.temperature !== undefined ? `${telemetry.temperature}°C` : '--'}
            </Text>
            <Text style={styles.vitalUnit}>Body Temp</Text>
          </View>

          {/* Battery */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeaderRow}>
              <Text style={styles.vitalIcon}>🔋</Text>
              <Text style={styles.vitalLabel}>Battery</Text>
            </View>
            <Text style={styles.vitalValue}>
              {telemetry?.battery !== undefined
                ? `${telemetry.battery}%`
                : device.batteryLevel !== undefined
                ? `${device.batteryLevel}%`
                : '--'}
            </Text>
            <Text style={styles.vitalUnit}>Peripheral Power</Text>
          </View>
        </View>

        {/* Live Incoming Packet Terminal */}
        <View style={styles.terminalContainer}>
          <View style={styles.terminalHeader}>
            <View style={styles.terminalHeaderLeft}>
              <View style={[styles.terminalDot, { backgroundColor: '#EF4444' }]} />
              <View style={[styles.terminalDot, { backgroundColor: '#F59E0B' }]} />
              <View style={[styles.terminalDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.terminalTitle}>ESP32 Raw Data Stream</Text>
            </View>
            <TouchableOpacity onPress={handleSimulateTestPacket} activeOpacity={0.7}>
              <Text style={styles.simulateButtonText}>+ Test Sample</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.terminalBody}>
            {packetHistory.length === 0 ? (
              <View style={styles.terminalEmpty}>
                <Text style={styles.terminalEmptyText}>
                  Waiting for notification packets from ESP32...
                </Text>
                <Text style={styles.terminalSubText}>
                  Flash your ESP32 with the provided sketch. As soon as it notifies, packets will appear here in real-time.
                </Text>
              </View>
            ) : (
              packetHistory.map((item, idx) => (
                <View key={item.id} style={styles.terminalRow}>
                  <Text style={styles.terminalTimestamp}>[{item.time}]</Text>
                  <Text
                    style={[
                      styles.terminalDataText,
                      idx === 0 && styles.terminalDataLatest,
                    ]}
                    numberOfLines={2}
                  >
                    {item.text}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Section */}
      <View style={styles.bottomSection}>
        {onGoToHome && (
          <TouchableOpacity style={styles.homeBtn} onPress={onGoToHome} activeOpacity={0.85}>
            <Text style={styles.homeBtnText}>Healthcare Portal</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect} activeOpacity={0.85}>
          <Text style={styles.disconnectText}>Disconnect Device</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  topHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  deviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  deviceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIcon: {
    fontSize: 24,
  },
  deviceTitleContainer: {
    flex: 1,
  },
  deviceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.9,
    marginBottom: 2,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
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
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38A3E5',
    marginRight: 5,
  },
  liveIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  vitalCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  vitalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vitalIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  vitalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  vitalValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  vitalUnit: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  terminalContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  terminalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  terminalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  terminalTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  simulateButtonText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  terminalBody: {
    padding: 12,
    maxHeight: 180,
  },
  terminalEmpty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  terminalEmptyText: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  terminalSubText: {
    color: '#64748B',
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  terminalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  terminalTimestamp: {
    color: '#64748B',
    fontFamily: 'monospace',
    fontSize: 11,
    marginRight: 8,
  },
  terminalDataText: {
    flex: 1,
    color: '#CBD5E1',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  terminalDataLatest: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 8,
    backgroundColor: '#F8FAFC',
  },
  homeBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#38A3E5',
    alignItems: 'center',
  },
  homeBtnText: {
    color: '#38A3E5',
    fontSize: 14,
    fontWeight: '700',
  },
  disconnectBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
  },
  disconnectText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
});
