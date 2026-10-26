import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BluetoothDevice,
  scanForSpecificDevice,
  TARGET_DEVICE_NAME,
} from '../services/bluetooth';

interface Props {
  onDeviceFound: (device: BluetoothDevice) => void;
  onCancel: () => void;
}

export default function BluetoothScanScreen({ onDeviceFound, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const [scanStatus, setScanStatus] = useState('Initializing Bluetooth...');

  // Animated pulse radar rings
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createPulseAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createPulseAnimation(pulse1, 0);
    const anim2 = createPulseAnimation(pulse2, 900);

    anim1.start();
    anim2.start();

    // Start scanning for our specific device
    let isMounted = true;
    scanForSpecificDevice(status => {
      if (isMounted) {
        setScanStatus(status);
      }
    })
      .then(device => {
        if (isMounted) {
          // Found device! Proceed to device screen
          onDeviceFound(device);
        }
      })
      .catch(err => {
        console.error('Scan error:', err);
      });

    return () => {
      isMounted = false;
      anim1.stop();
      anim2.stop();
    };
  }, [onDeviceFound, pulse1, pulse2]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scanning for Device</Text>
        <Text style={styles.targetLabel}>Target: {TARGET_DEVICE_NAME}</Text>
      </View>

      {/* Center Radar Animation */}
      <View style={styles.radarContainer}>
        {/* Outer Pulsing Waves */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [
                {
                  scale: pulse1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 2.4],
                  }),
                },
              ],
              opacity: pulse1.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [0.6, 0.2, 0],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [
                {
                  scale: pulse2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 2.4],
                  }),
                },
              ],
              opacity: pulse2.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [0.6, 0.2, 0],
              }),
            },
          ]}
        />

        {/* Center Hub */}
        <View style={styles.centerHub}>
          <Text style={styles.radarIcon}>🔍</Text>
        </View>
      </View>

      {/* Live Status and Cancel */}
      <View style={styles.bottomSection}>
        <View style={styles.statusBox}>
          <ActivityIndicator color="#38A3E5" size="small" style={styles.spinner} />
          <Text style={styles.statusText}>{scanStatus}</Text>
        </View>

        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancel Scan</Text>
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
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  targetLabel: {
    fontSize: 13,
    color: '#38A3E5',
    fontWeight: '600',
  },
  radarContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#38A3E5',
  },
  centerHub: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#38A3E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38A3E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  radarIcon: {
    fontSize: 34,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  spinner: {
    marginRight: 10,
  },
  statusText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
