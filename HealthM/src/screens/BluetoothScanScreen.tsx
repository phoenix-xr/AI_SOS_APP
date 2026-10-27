import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BluetoothDevice,
  BLEDeviceType,
  connectToDevice,
  startBleScan,
} from '../services/bluetooth';

interface Props {
  onDeviceFound: (device: BluetoothDevice) => void;
  onCancel: () => void;
}

type FilterCategory = 'all' | 'named' | 'sensors' | 'strong';

export default function BluetoothScanScreen({ onDeviceFound, onCancel }: Props) {
  const insets = useSafeAreaInsets();

  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');
  const [statusMessage, setStatusMessage] = useState('Scanning for nearby BLE devices...');

  // Radar animation for top scanner header
  const radarSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isScanning) {
      anim = Animated.loop(
        Animated.timing(radarSpin, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
    } else {
      radarSpin.setValue(0);
    }
    return () => {
      anim?.stop();
    };
  }, [isScanning, radarSpin]);

  // Start BLE scanner
  const runScan = useCallback(() => {
    setDevices([]);
    setIsScanning(true);
    setStatusMessage('Scanning nearby frequencies...');

    const stopScan = startBleScan(
      discoveredDevice => {
        setDevices(prev => {
          const exists = prev.some(d => d.macAddress === discoveredDevice.macAddress);
          if (exists) {
            return prev.map(d => (d.macAddress === discoveredDevice.macAddress ? discoveredDevice : d));
          }
          return [...prev, discoveredDevice];
        });
        setStatusMessage(`Found: ${discoveredDevice.name}`);
      },
      errorMessage => {
        setIsScanning(false);
        setStatusMessage(errorMessage);
      },
      () => {
        setIsScanning(false);
        setStatusMessage('Scan finished. Tap a device to connect.');
      }
    );

    return stopScan;
  }, []);

  useEffect(() => {
    const cancel = runScan();
    return () => {
      cancel();
    };
  }, [runScan]);

  const handleConnect = async (device: BluetoothDevice) => {
    if (!device.isConnectable) {
      Alert.alert('Non-Connectable Device', 'This device is a broadcast-only beacon.');
      return;
    }

    if (connectingId) return;

    try {
      setConnectingId(device.id);
      setStatusMessage(`Connecting to ${device.name}...`);
      const connected = await connectToDevice(device, msg => setStatusMessage(msg));
      onDeviceFound(connected);
    } catch (err) {
      Alert.alert('Connection Failed', 'Could not establish connection with this BLE device.');
      setConnectingId(null);
      setStatusMessage('Connection failed. Please retry.');
    }
  };

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.macAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedFilter === 'named') {
        return (
          d.hasCustomName ||
          (!d.name.toLowerCase().startsWith('ble device (') &&
            !d.name.toLowerCase().startsWith('unnamed'))
        );
      }
      if (selectedFilter === 'sensors') {
        return d.deviceType === 'sensor' || d.deviceType === 'ecg' || d.deviceType === 'oximeter';
      }
      if (selectedFilter === 'strong') {
        return d.rssi >= -75;
      }
      return true;
    });
  }, [devices, searchQuery, selectedFilter]);

  const spin = radarSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getDeviceIcon = (type: BLEDeviceType) => {
    switch (type) {
      case 'sensor':
        return '🩺';
      case 'band':
        return '⌚';
      case 'ecg':
        return '💓';
      case 'oximeter':
        return '🩸';
      case 'gateway':
        return '📟';
      case 'beacon':
        return '📡';
      default:
        return '📶';
    }
  };

  const getRssiColor = (rssi: number) => {
    if (rssi >= -60) return '#10B981'; // Great
    if (rssi >= -72) return '#38A3E5'; // Good
    if (rssi >= -82) return '#F59E0B'; // Fair
    return '#EF4444'; // Weak
  };

  const renderDeviceCard = ({ item }: { item: BluetoothDevice }) => {
    const isConnecting = connectingId === item.id;
    const rssiColor = getRssiColor(item.rssi);

    return (
      <TouchableOpacity
        style={[styles.deviceCard, isConnecting && styles.deviceCardConnecting]}
        onPress={() => handleConnect(item)}
        activeOpacity={0.7}
        disabled={!item.isConnectable || !!connectingId}
      >
        {/* Left: Device Icon */}
        <View style={[styles.deviceIconBox, { backgroundColor: item.isConnectable ? '#EFF6FF' : '#F3F4F6' }]}>
          <Text style={styles.deviceIconText}>{getDeviceIcon(item.deviceType)}</Text>
        </View>

        {/* Center: Device Details */}
        <View style={styles.deviceInfoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.deviceName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          <Text style={styles.macText}>MAC: {item.macAddress}</Text>

          {/* Badges: RSSI & Battery */}
          <View style={styles.badgesRow}>
            <View style={[styles.rssiBadge, { borderColor: rssiColor }]}>
              <View style={[styles.rssiDot, { backgroundColor: rssiColor }]} />
              <Text style={[styles.rssiText, { color: rssiColor }]}>{item.rssi} dBm</Text>
            </View>

            {item.batteryLevel !== undefined && (
              <View style={styles.batteryBadge}>
                <Text style={styles.batteryText}>⚡ {item.batteryLevel}%</Text>
              </View>
            )}

            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{item.deviceType.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Right: Connect Action */}
        <View style={styles.actionCol}>
          {isConnecting ? (
            <View style={styles.connectingBox}>
              <ActivityIndicator size="small" color="#38A3E5" />
              <Text style={styles.connectingText}>Pairing...</Text>
            </View>
          ) : item.isConnectable ? (
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={() => handleConnect(item)}
              disabled={!!connectingId}
              activeOpacity={0.8}
            >
              <Text style={styles.connectBtnText}>Connect</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.beaconBadge}>
              <Text style={styles.beaconText}>Broadcast</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>BLE Device Scanner</Text>
          <Text style={styles.headerSub}>{statusMessage}</Text>
        </View>

        <View style={styles.headerRight}>
          {isScanning ? (
            <Animated.View style={[styles.scanningIndicator, { transform: [{ rotate: spin }] }]}>
              <Text style={styles.scanningDot}>🌀</Text>
            </Animated.View>
          ) : (
            <TouchableOpacity style={styles.rescanBtn} onPress={runScan} activeOpacity={0.7}>
              <Text style={styles.rescanText}>↻ Rescan</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by device name or MAC..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersRow}>
        {(
          [
            { id: 'all', label: `All (${devices.length})` },
            { id: 'named', label: 'Named Devices' },
            { id: 'sensors', label: 'Sensors' },
            { id: 'strong', label: 'Nearby (< -75dBm)' },
          ] as { id: FilterCategory; label: string }[]
        ).map(f => {
          const isSelected = selectedFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => setSelectedFilter(f.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Devices List */}
      <FlatList
        data={filteredDevices}
        keyExtractor={item => item.id}
        renderItem={renderDeviceCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isScanning ? (
              <>
                <ActivityIndicator size="large" color="#38A3E5" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyTitle}>Listening for Advertisements...</Text>
                <Text style={styles.emptySub}>
                  Scanning 2.4 GHz Bluetooth Low Energy channels for HealthMitra and nearby medical devices.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyIcon}>📡</Text>
                <Text style={styles.emptyTitle}>No Devices Found</Text>
                <Text style={styles.emptySub}>
                  Ensure your Bluetooth device is powered on, charged, and in pairing mode.
                </Text>
                <TouchableOpacity style={styles.emptyRescanBtn} onPress={runScan}>
                  <Text style={styles.emptyRescanText}>Scan Again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        }
      />

      {/* Footer Cancel Bar */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
          <Text style={styles.cancelBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    maxWidth: 240,
  },
  headerRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningIndicator: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningDot: {
    fontSize: 18,
  },
  rescanBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  rescanText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearSearch: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 16,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  deviceCardConnecting: {
    borderColor: '#38A3E5',
    backgroundColor: '#F0F9FF',
  },
  deviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceIconText: {
    fontSize: 22,
  },
  deviceInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  macText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  rssiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  rssiDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },
  rssiText: {
    fontSize: 10,
    fontWeight: '700',
  },
  batteryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  batteryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  typeBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  actionCol: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  connectBtn: {
    backgroundColor: '#38A3E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#38A3E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  connectingBox: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  connectingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#38A3E5',
    marginTop: 4,
  },
  beaconBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  beaconText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  emptyContainer: {
    paddingVertical: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  emptyRescanBtn: {
    marginTop: 18,
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyRescanText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    paddingTop: 8,
  },
  cancelBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
});
