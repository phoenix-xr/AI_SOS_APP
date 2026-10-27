/*
 * ============================================================================
 * HealthMitra - ESP32 BLE Medical Telemetry Mock Device
 * ============================================================================
 * Board: ESP32 Dev Module / ESP32-WROOM-32
 * Framework: Arduino IDE (ESP32 by Espressif Systems)
 *
 * Description:
 * Advertises as "HealthMitra-ESP32" over Bluetooth Low Energy (BLE).
 * When connected to the HealthMitra Android app, it automatically streams
 * real-time dummy medical telemetry (Heart Rate, SpO2, Temperature, Battery)
 * over BLE GATT notifications every 1.5 seconds.
 * ============================================================================
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Board detection & Onboard LED pin:
// Classic ESP32 uses GPIO 2 (active HIGH)
// ESP32-C3 (SuperMini, DevKitM-1, XIAO) uses GPIO 8 (active LOW)
#if defined(CONFIG_IDF_TARGET_ESP32C3) || defined(ARDUINO_ESP32C3_DEV)
  #define LED_PIN 8
  #define LED_ON  LOW
  #define LED_OFF HIGH
#elif defined(LED_BUILTIN)
  #define LED_PIN LED_BUILTIN
  #define LED_ON  HIGH
  #define LED_OFF LOW
#else
  #define LED_PIN 2
  #define LED_ON  HIGH
  #define LED_OFF LOW
#endif

// Unique UUIDs for HealthMitra Service and Telemetry Characteristic
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
BLE2902* pBLE2902 = nullptr;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Mock medical telemetry state
int heartRate = 72;
int spo2 = 98;
float bodyTemp = 36.6;
int batteryLevel = 95;
int stepCount = 3540;
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 1500; // Send telemetry every 1.5 seconds

/**
 * Server Callbacks for handling client connection & disconnection
 */
class HealthServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    digitalWrite(LED_PIN, LED_ON); // Turn ON LED when connected
    if (pBLE2902 != nullptr) {
      pBLE2902->setNotifications(true); // Ensure notifications are active
    }
    Serial.println("[BLE] Client connected to HealthMitra-ESP32!");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    digitalWrite(LED_PIN, LED_OFF); // Turn OFF LED when disconnected
    Serial.println("[BLE] Client disconnected.");
  }
};

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- Starting HealthMitra ESP32 BLE Telemetry Server ---");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LED_OFF);

  // 1. Initialize BLE with advertised device name
  BLEDevice::init("HealthMitra-ESP32");
  BLEDevice::setMTU(512); // Support large JSON payloads without truncation

  // 2. Create the BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new HealthServerCallbacks());

  // 3. Create the Health GATT Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // 4. Create the Telemetry Characteristic (Read + Notify)
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  // 5. Add Client Characteristic Configuration Descriptor (0x2902) for Notifications
  pBLE2902 = new BLE2902();
  pBLE2902->setNotifications(true); // Active notifications by default
  pCharacteristic->addDescriptor(pBLE2902);

  // Initial dummy value
  pCharacteristic->setValue("{\"status\":\"ready\"}");

  // 6. Start the Service
  pService->start();

  // 7. Configure and start BLE Advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // functions that help with connection speed
  pAdvertising->setMinPreferred(0x12);
  
  BLEDevice::startAdvertising();
  Serial.println("[BLE] Advertising started as 'HealthMitra-ESP32'.");
  Serial.println("[BLE] Waiting for HealthMitra App to connect...\n");
}

void loop() {
  // Disconnection handling: Restart advertising so client can reconnect
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); // give the bluetooth stack the chance to get things ready
    pServer->startAdvertising(); // restart advertising
    Serial.println("[BLE] Restarted advertising after disconnect.");
    oldDeviceConnected = deviceConnected;
  }
  
  // Connection handling: Detect new connection
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  // If connected, stream dummy health telemetry periodically
  if (deviceConnected && (millis() - lastSendTime >= sendInterval)) {
    lastSendTime = millis();

    // 1. Simulate subtle natural vital variations
    heartRate = constrain(heartRate + random(-2, 3), 66, 88);
    spo2 = constrain(spo2 + random(-1, 2), 96, 100);
    bodyTemp = constrain(bodyTemp + (random(-1, 2) * 0.05), 36.3, 37.1);
    stepCount += random(0, 5);

    // Slowly discharge battery every 100 packets
    if (random(0, 50) == 0 && batteryLevel > 15) {
      batteryLevel--;
    }

    // 2. Build JSON telemetry payload
    char jsonBuffer[128];
    snprintf(jsonBuffer, sizeof(jsonBuffer),
      "{\"heartRate\":%d,\"spo2\":%d,\"temperature\":%.1f,\"battery\":%d,\"steps\":%d}",
      heartRate, spo2, bodyTemp, batteryLevel, stepCount
    );

    // 3. Notify connected Android app with exact length
    pCharacteristic->setValue((uint8_t*)jsonBuffer, strlen(jsonBuffer));
    pCharacteristic->notify();

    // Log to Serial Monitor
    Serial.print("[BLE Sent] -> ");
    Serial.println(jsonBuffer);
  }

  delay(20);
}
