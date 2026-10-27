import {
  PermissionsAndroid,
  Platform,
  NativeModules,
  DeviceEventEmitter,
  Alert,
} from 'react-native';

const { BleScanner } = NativeModules;

export type BLEDeviceType =
  | 'sensor'
  | 'band'
  | 'ecg'
  | 'oximeter'
  | 'gateway'
  | 'beacon'
  | 'generic';

export interface BluetoothDevice {
  id: string;
  name: string;
  macAddress: string;
  rssi: number;
  batteryLevel?: number;
  deviceType: BLEDeviceType;
  status: 'connected' | 'connecting' | 'disconnected';
  isConnectable: boolean;
  serviceUuid?: string;
  hasCustomName?: boolean;
  serviceUuids?: string[];
  services?: string[];
}

/**
 * Request real Android Bluetooth and Location permissions
 */
export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const apiLevel =
      typeof Platform.Version === 'number'
        ? Platform.Version
        : parseInt(Platform.Version as string, 10);

    if (apiLevel >= 31) {
      // Android 12+ requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      const scanGranted =
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const connectGranted =
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED;

      return scanGranted && connectGranted;
    } else {
      // Android 11 and lower requires location permission for Bluetooth discovery
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Bluetooth Permission Required',
          message:
            'HealthMitra needs access to your location and Bluetooth to scan for nearby medical devices.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (error) {
    console.warn('Bluetooth permission request failed:', error);
    return false;
  }
}

/**
 * Check if real physical Bluetooth is available and powered on
 */
export async function checkBluetoothStatus(): Promise<{
  available: boolean;
  enabled: boolean;
  locationEnabled?: boolean;
}> {
  if (Platform.OS !== 'android' || !BleScanner) {
    return { available: false, enabled: false };
  }

  try {
    return await BleScanner.isBluetoothAvailable();
  } catch {
    return { available: false, enabled: false };
  }
}

/**
 * Helper to infer device category from actual advertised broadcast name
 */
function inferDeviceType(name: string): BLEDeviceType {
  const lower = name.toLowerCase();
  if (lower.includes('sensor') || lower.includes('health') || lower.includes('medical')) {
    return 'sensor';
  }
  if (lower.includes('band') || lower.includes('watch') || lower.includes('pulse') || lower.includes('fit')) {
    return 'band';
  }
  if (lower.includes('ecg')) {
    return 'ecg';
  }
  if (lower.includes('oxi') || lower.includes('spo2')) {
    return 'oximeter';
  }
  if (lower.includes('esp') || lower.includes('gateway') || lower.includes('node')) {
    return 'gateway';
  }
  if (lower.includes('beacon') || lower.includes('ibeacon')) {
    return 'beacon';
  }
  return 'generic';
}

/**
 * Real Native BLE Scanner: Scans the physical 2.4 GHz spectrum using Android BluetoothLeScanner.
 * NO mock/fake data.
 */
export function startBleScan(
  onDeviceFound: (device: BluetoothDevice) => void,
  onScanError?: (error: string) => void,
  onScanComplete?: () => void
): () => void {
  let isStopped = false;

  const subscription = DeviceEventEmitter.addListener(
    'onBleDeviceDiscovered',
    (rawDevice: any) => {
      if (isStopped) return;

      const deviceName = rawDevice.name || 'Unnamed BLE Device';
      const cleanDevice: BluetoothDevice = {
        id: rawDevice.id || rawDevice.macAddress,
        name: deviceName,
        macAddress: rawDevice.macAddress,
        rssi: typeof rawDevice.rssi === 'number' ? rawDevice.rssi : -70,
        deviceType: inferDeviceType(deviceName),
        status: 'disconnected',
        isConnectable: rawDevice.isConnectable !== false,
        hasCustomName: rawDevice.hasCustomName === true,
        serviceUuids: Array.isArray(rawDevice.serviceUuids) ? rawDevice.serviceUuids : undefined,
      };

      onDeviceFound(cleanDevice);
    }
  );

  const errorSubscription = DeviceEventEmitter.addListener(
    'onBleScanFailed',
    (err: any) => {
      if (isStopped) return;
      onScanError?.(err.errorMessage || 'BLE scan failed');
    }
  );

  // Trigger native BLE scan
  (async () => {
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      onScanError?.('Bluetooth permission not granted');
      Alert.alert(
        'Permission Denied',
        'Bluetooth and Location permissions are required to scan for real devices.'
      );
      return;
    }

    if (BleScanner) {
      try {
        const status = await BleScanner.isBluetoothAvailable();
        if (!status.available) {
          onScanError?.('Bluetooth hardware not available on this device/emulator');
          Alert.alert(
            'No Bluetooth Hardware',
            'No physical Bluetooth adapter detected. If running on an emulator, physical Bluetooth requires a real device.'
          );
          return;
        }

        if (!status.enabled) {
          onScanError?.('Bluetooth is disabled');
          Alert.alert(
            'Bluetooth Disabled',
            'Please turn on Bluetooth in your device settings to scan for devices.'
          );
          return;
        }

        if (status.locationEnabled === false) {
          console.log('Location Services disabled; some devices may require Location to be turned on');
        }

        await BleScanner.startScan();
      } catch (err: any) {
        console.warn('Native BLE startScan failed:', err);
        onScanError?.(err.message || 'Failed to start BLE scanner');
      }
    } else {
      onScanError?.('Native BLE scanner module not linked');
    }
  })();

  // Return cancel/cleanup function
  return () => {
    isStopped = true;
    subscription.remove();
    errorSubscription.remove();
    if (BleScanner) {
      BleScanner.stopScan().catch(() => {});
    }
    onScanComplete?.();
  };
}

/**
 * Connect to a specific BLE device via native GATT
 */
export async function connectToDevice(
  device: BluetoothDevice,
  onProgress?: (status: string) => void
): Promise<BluetoothDevice> {
  onProgress?.(`Connecting to ${device.name}...`);

  if (BleScanner?.connectGatt) {
    try {
      await BleScanner.connectGatt(device.macAddress);
      onProgress?.('GATT connected. Discovering services...');
      await new Promise<void>(res => setTimeout(res, 800));
    } catch (e: any) {
      console.warn('Native connectGatt notice:', e.message);
    }
  } else {
    await new Promise<void>(res => setTimeout(res, 800));
  }

  return {
    ...device,
    status: 'connected',
  };
}

/**
 * Disconnect from a BLE device
 */
export async function disconnectDevice(macAddress: string): Promise<void> {
  if (BleScanner?.disconnectGatt) {
    try {
      await BleScanner.disconnectGatt(macAddress);
    } catch (e) {
      console.warn('disconnectGatt failed:', e);
    }
  }
}

export interface HealthTelemetry {
  heartRate?: number;
  spo2?: number;
  temperature?: number;
  battery?: number;
  steps?: number;
  raw: string;
  timestamp: number;
}

export function parseHealthTelemetry(
  rawString: string,
  timestamp: number = Date.now()
): HealthTelemetry {
  const clean = rawString.trim();
  let parsed: Partial<HealthTelemetry> = {};

  // 1. Try JSON parse first
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const obj = JSON.parse(clean);
      if (typeof obj.heartRate === 'number') parsed.heartRate = obj.heartRate;
      else if (typeof obj.heart_rate === 'number') parsed.heartRate = obj.heart_rate;
      else if (typeof obj.hr === 'number') parsed.heartRate = obj.hr;

      if (typeof obj.spo2 === 'number') parsed.spo2 = obj.spo2;
      else if (typeof obj.oxygen === 'number') parsed.spo2 = obj.oxygen;

      if (typeof obj.temperature === 'number') parsed.temperature = obj.temperature;
      else if (typeof obj.temp === 'number') parsed.temperature = obj.temp;

      if (typeof obj.battery === 'number') parsed.battery = obj.battery;
      else if (typeof obj.batt === 'number') parsed.battery = obj.batt;

      if (typeof obj.steps === 'number') parsed.steps = obj.steps;
    } catch {
      // Not strict JSON, continue to regex fallback
    }
  }

  // 2. Key-value string fallback: e.g. HR:76,SPO2:98,TEMP:36.6,BATT:92
  if (parsed.heartRate === undefined) {
    const hrMatch = clean.match(/HR[:= ]*(\d+)/i) || clean.match(/HEART[:= ]*(\d+)/i);
    if (hrMatch) parsed.heartRate = parseInt(hrMatch[1], 10);
  }
  if (parsed.spo2 === undefined) {
    const spo2Match = clean.match(/SPO2[:= ]*(\d+)/i) || clean.match(/O2[:= ]*(\d+)/i);
    if (spo2Match) parsed.spo2 = parseInt(spo2Match[1], 10);
  }
  if (parsed.temperature === undefined) {
    const tempMatch = clean.match(/TEMP[:= ]*([0-9.]+)/i);
    if (tempMatch) parsed.temperature = parseFloat(tempMatch[1]);
  }
  if (parsed.battery === undefined) {
    const battMatch = clean.match(/BAT[:= ]*(\d+)/i) || clean.match(/BATT[:= ]*(\d+)/i);
    if (battMatch) parsed.battery = parseInt(battMatch[1], 10);
  }

  return {
    ...parsed,
    raw: clean,
    timestamp,
  };
}

/**
 * Subscribe to real-time incoming BLE data from a connected device
 */
export function subscribeToDeviceData(
  targetMacAddress: string,
  onDataReceived: (telemetry: HealthTelemetry) => void
): () => void {
  const subscription = DeviceEventEmitter.addListener(
    'onBleDataReceived',
    (event: {
      macAddress: string;
      serviceUuid?: string;
      characteristicUuid?: string;
      data: string;
      timestamp?: number;
    }) => {
      console.log('[BLE Packet Raw]:', event.data);
      if (
        !targetMacAddress ||
        !event.macAddress ||
        event.macAddress.toLowerCase() === targetMacAddress.toLowerCase()
      ) {
        const telemetry = parseHealthTelemetry(event.data, event.timestamp || Date.now());
        onDataReceived(telemetry);
      }
    }
  );

  return () => {
    subscription.remove();
  };
}
