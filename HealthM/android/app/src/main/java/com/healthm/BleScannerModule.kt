package com.healthm

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.location.LocationManager
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class BleScannerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var isScanning = false
    private val deviceNamesCache = ConcurrentHashMap<String, String>()
    private val gattConnections = ConcurrentHashMap<String, BluetoothGatt>()

    private fun getBluetoothAdapter(): BluetoothAdapter? {
        val bluetoothManager =
            reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        return bluetoothManager?.adapter
    }

    private fun getScanner(): BluetoothLeScanner? {
        return getBluetoothAdapter()?.bluetoothLeScanner
    }

    override fun getName(): String = "BleScanner"

    @ReactMethod
    fun isBluetoothAvailable(promise: Promise) {
        try {
            val adapter = getBluetoothAdapter()
            val available = adapter != null
            val enabled = adapter?.isEnabled == true

            val locationManager =
                reactContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            val locationEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                locationManager?.isLocationEnabled == true
            } else {
                locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true ||
                locationManager?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) == true
            }

            val map = Arguments.createMap()
            map.putBoolean("available", available)
            map.putBoolean("enabled", enabled)
            map.putBoolean("locationEnabled", locationEnabled)
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("BLE_ERROR", e.message)
        }
    }

    private val scanCallback = object : ScanCallback() {
        @SuppressLint("MissingPermission")
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            result ?: return
            val device = result.device ?: return
            val address = device.address ?: return

            val rawName = try {
                device.name
            } catch (e: SecurityException) {
                null
            }
            val recordName = result.scanRecord?.deviceName
            val resolvedName = when {
                !rawName.isNullOrBlank() -> rawName
                !recordName.isNullOrBlank() -> recordName
                else -> null
            }

            if (resolvedName != null) {
                deviceNamesCache[address] = resolvedName
            }

            val name = deviceNamesCache[address] ?: "BLE Device (${address.takeLast(5)})"
            val rssi = result.rssi
            val isConnectable = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                result.isConnectable
            } else {
                true
            }

            val eventMap = Arguments.createMap().apply {
                putString("id", address)
                putString("name", name)
                putString("macAddress", address)
                putInt("rssi", rssi)
                putBoolean("isConnectable", isConnectable)
                putString("status", "disconnected")
                putBoolean("hasCustomName", resolvedName != null)

                val services = result.scanRecord?.serviceUuids
                if (services != null && services.isNotEmpty()) {
                    val sArray = Arguments.createArray()
                    services.forEach { sArray.pushString(it.uuid.toString()) }
                    putArray("serviceUuids", sArray)
                }
            }

            sendEvent("onBleDeviceDiscovered", eventMap)
        }

        override fun onBatchScanResults(results: MutableList<ScanResult>?) {
            results?.forEach { onScanResult(ScanSettings.CALLBACK_TYPE_ALL_MATCHES, it) }
        }

        override fun onScanFailed(errorCode: Int) {
            isScanning = false
            val errorMap = Arguments.createMap().apply {
                putInt("errorCode", errorCode)
                putString("errorMessage", getScanErrorMessage(errorCode))
            }
            sendEvent("onBleScanFailed", errorMap)
        }
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun startScan(promise: Promise) {
        try {
            val adapter = getBluetoothAdapter()
            if (adapter == null) {
                promise.reject("NO_BLUETOOTH", "Bluetooth hardware is not available on this device.")
                return
            }

            if (!adapter.isEnabled) {
                promise.reject("BLUETOOTH_DISABLED", "Bluetooth is disabled. Please turn on Bluetooth in settings.")
                return
            }

            val scanner = getScanner()
            if (scanner == null) {
                promise.reject("SCANNER_NULL", "Unable to access BluetoothLeScanner. Please ensure Bluetooth is enabled.")
                return
            }

            if (isScanning) {
                promise.resolve("ALREADY_SCANNING")
                return
            }

            val settings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .setReportDelay(0)
                .build()

            scanner.startScan(null, settings, scanCallback)
            isScanning = true
            promise.resolve("SCAN_STARTED")
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_DENIED", "Bluetooth scan permission not granted: ${e.message}")
        } catch (e: Exception) {
            promise.reject("SCAN_ERROR", "Failed to start BLE scan: ${e.message}")
        }
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun stopScan(promise: Promise) {
        try {
            if (isScanning) {
                getScanner()?.stopScan(scanCallback)
                isScanning = false
            }
            promise.resolve("SCAN_STOPPED")
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message)
        }
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun connectGatt(address: String, promise: Promise) {
        try {
            val adapter = getBluetoothAdapter() ?: run {
                promise.reject("NO_BLUETOOTH", "Bluetooth adapter not found")
                return
            }
            val device = adapter.getRemoteDevice(address)
            if (device == null) {
                promise.reject("DEVICE_NULL", "Could not locate device with address: $address")
                return
            }

            // Disconnect any existing GATT connection
            gattConnections[address]?.close()

            val gatt = device.connectGatt(reactContext, false, object : BluetoothGattCallback() {
                @SuppressLint("MissingPermission")
                override fun onConnectionStateChange(gatt: BluetoothGatt?, status: Int, newState: Int) {
                    val map = Arguments.createMap()
                    map.putString("macAddress", address)
                    if (newState == BluetoothProfile.STATE_CONNECTED) {
                        map.putString("status", "connected")
                        sendEvent("onBleConnectionChanged", map)
                        // Request large MTU for JSON payloads
                        try {
                            gatt?.requestMtu(512)
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                        gatt?.discoverServices()
                    } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                        map.putString("status", "disconnected")
                        sendEvent("onBleConnectionChanged", map)
                        gatt?.close()
                        gattConnections.remove(address)
                    }
                }

                override fun onMtuChanged(gatt: BluetoothGatt?, mtu: Int, status: Int) {
                    println("BLE onMtuChanged: mtu=$mtu status=$status")
                }

                @SuppressLint("MissingPermission")
                override fun onServicesDiscovered(gatt: BluetoothGatt?, status: Int) {
                    if (status == BluetoothGatt.GATT_SUCCESS && gatt != null) {
                        val servicesArray = Arguments.createArray()
                        gatt.services?.forEach { s ->
                            val sUuid = s.uuid.toString().lowercase()
                            servicesArray.pushString(sUuid)

                            // Prioritize custom & telemetry services (skip standard internal GATT 0x1800, 0x1801)
                            if (!sUuid.startsWith("00001800") && !sUuid.startsWith("00001801")) {
                                s.characteristics?.forEach { charac ->
                                    val props = charac.properties
                                    if ((props and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0) ||
                                        (props and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0)) {
                                        subscribeCharacteristic(gatt, charac)
                                    }
                                }
                            }
                        }
                        val map = Arguments.createMap().apply {
                            putString("macAddress", address)
                            putArray("services", servicesArray)
                        }
                        sendEvent("onBleServicesDiscovered", map)
                    }
                }

                override fun onDescriptorWrite(
                    gatt: BluetoothGatt?,
                    descriptor: BluetoothGattDescriptor?,
                    status: Int
                ) {
                    println("BLE onDescriptorWrite: ${descriptor?.uuid} status=$status")
                }

                @Deprecated("Deprecated in Java for API 33")
                override fun onCharacteristicChanged(
                    gatt: BluetoothGatt?,
                    characteristic: BluetoothGattCharacteristic?
                ) {
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                        val charac = characteristic ?: return
                        @Suppress("DEPRECATION")
                        val data = charac.value ?: return
                        dispatchBleData(address, charac, data)
                    }
                }

                override fun onCharacteristicChanged(
                    gatt: BluetoothGatt,
                    characteristic: BluetoothGattCharacteristic,
                    value: ByteArray
                ) {
                    dispatchBleData(address, characteristic, value)
                }

                override fun onCharacteristicRead(
                    gatt: BluetoothGatt,
                    characteristic: BluetoothGattCharacteristic,
                    value: ByteArray,
                    status: Int
                ) {
                    if (status == BluetoothGatt.GATT_SUCCESS) {
                        dispatchBleData(address, characteristic, value)
                    }
                }
            })

            if (gatt != null) {
                gattConnections[address] = gatt
            }
            promise.resolve("CONNECTING")
        } catch (e: Exception) {
            promise.reject("CONNECT_FAIL", e.message)
        }
    }

    @SuppressLint("MissingPermission")
    private fun subscribeCharacteristic(
        gatt: BluetoothGatt,
        characteristic: BluetoothGattCharacteristic
    ): Boolean {
        try {
            val success = gatt.setCharacteristicNotification(characteristic, true)
            if (!success) return false

            val cccdUuid = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
            val descriptor = characteristic.getDescriptor(cccdUuid)
            if (descriptor != null) {
                val value = if ((characteristic.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0) {
                    BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                } else if ((characteristic.properties and BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0) {
                    BluetoothGattDescriptor.ENABLE_INDICATION_VALUE
                } else {
                    BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    gatt.writeDescriptor(descriptor, value)
                } else {
                    @Suppress("DEPRECATION")
                    descriptor.value = value
                    @Suppress("DEPRECATION")
                    gatt.writeDescriptor(descriptor)
                }
            }
            return true
        } catch (e: Exception) {
            e.printStackTrace()
            return false
        }
    }

    private fun dispatchBleData(
        macAddress: String,
        characteristic: BluetoothGattCharacteristic,
        data: ByteArray
    ) {
        val stringData = String(data, Charsets.UTF_8)
        val map = Arguments.createMap().apply {
            putString("macAddress", macAddress)
            putString("serviceUuid", characteristic.service?.uuid?.toString())
            putString("characteristicUuid", characteristic.uuid.toString())
            putString("data", stringData)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        sendEvent("onBleDataReceived", map)
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun enableNotifications(
        address: String,
        serviceUuidStr: String,
        charUuidStr: String,
        promise: Promise
    ) {
        val gatt = gattConnections[address] ?: run {
            promise.reject("NOT_CONNECTED", "Device $address is not connected.")
            return
        }

        try {
            val service = gatt.getService(UUID.fromString(serviceUuidStr)) ?: run {
                promise.reject("SERVICE_NOT_FOUND", "Service $serviceUuidStr not found.")
                return
            }
            val charac = service.getCharacteristic(UUID.fromString(charUuidStr)) ?: run {
                promise.reject("CHAR_NOT_FOUND", "Characteristic $charUuidStr not found.")
                return
            }

            val ok = subscribeCharacteristic(gatt, charac)
            if (ok) {
                promise.resolve("SUBSCRIBED")
            } else {
                promise.reject("SUB_FAILED", "Failed to enable notifications.")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun disconnectGatt(address: String, promise: Promise) {
        try {
            val gatt = gattConnections.remove(address)
            gatt?.disconnect()
            gatt?.close()
            promise.resolve("DISCONNECTED")
        } catch (e: Exception) {
            promise.reject("DISCONNECT_FAIL", e.message)
        }
    }

    private fun sendEvent(eventName: String, params: Any?) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun getScanErrorMessage(errorCode: Int): String {
        return when (errorCode) {
            ScanCallback.SCAN_FAILED_ALREADY_STARTED -> "Scan already started"
            ScanCallback.SCAN_FAILED_APPLICATION_REGISTRATION_FAILED -> "Application registration failed"
            ScanCallback.SCAN_FAILED_FEATURE_UNSUPPORTED -> "BLE Scan feature unsupported"
            ScanCallback.SCAN_FAILED_INTERNAL_ERROR -> "Internal BLE scanner error"
            else -> "BLE scan error ($errorCode)"
        }
    }
}
