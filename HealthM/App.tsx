import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import BluetoothConnectScreen from './src/screens/BluetoothConnectScreen';
import BluetoothScanScreen from './src/screens/BluetoothScanScreen';
import DeviceDetailScreen from './src/screens/DeviceDetailScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import { BluetoothDevice } from './src/services/bluetooth';

type AuthenticatedView = 'bt_connect' | 'bt_scanning' | 'bt_device' | 'home';

function AuthenticatedNavigator(): React.JSX.Element {
  const { logout } = useAuth();
  const [currentView, setCurrentView] = useState<AuthenticatedView>('bt_connect');
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);

  // 1. Loading screen while scanning for our specific device
  if (currentView === 'bt_scanning') {
    return (
      <BluetoothScanScreen
        onDeviceFound={device => {
          setConnectedDevice(device);
          setCurrentView('bt_device');
        }}
        onCancel={() => setCurrentView('bt_connect')}
      />
    );
  }

  // 2. Connected Device Screen with Device Name on the top
  if (currentView === 'bt_device' && connectedDevice) {
    return (
      <DeviceDetailScreen
        device={connectedDevice}
        onDisconnect={() => {
          setConnectedDevice(null);
          setCurrentView('bt_connect');
        }}
        onGoToHome={() => setCurrentView('home')}
      />
    );
  }

  // 3. Optional full health dashboard
  if (currentView === 'home') {
    return <HomeScreen />;
  }

  // 4. Connect page with "Connect" button (Landing page right after login)
  return (
    <BluetoothConnectScreen
      onStartScanning={() => setCurrentView('bt_scanning')}
      onLogout={logout}
    />
  );
}

function RootNavigator(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('./src/assets/logo.png')}
          defaultSource={{ uri: 'https://healthmitra.co.in/assets/img/logo.png' }}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#38A3E5" style={styles.spinner} />
      </View>
    );
  }

  return isAuthenticated ? <AuthenticatedNavigator /> : <LoginScreen />;
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    width: 220,
    height: 70,
    marginBottom: 24,
  },
  spinner: {
    marginTop: 8,
  },
});

export default App;
