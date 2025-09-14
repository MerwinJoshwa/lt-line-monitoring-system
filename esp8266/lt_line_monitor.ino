/*
 * LT Line Monitoring System - ESP8266 Code
 * 
 * This code reads voltage and current from sensors and sends data to Flask backend
 * 
 * Hardware Requirements:
 * - ESP8266 (NodeMCU or Wemos D1 Mini)
 * - ZMPT101B Voltage Sensor
 * - SCT-013 Current Transformer with ADS1115 ADC
 * - Breadboard and jumper wires
 * 
 * Pin Connections:
 * - ZMPT101B: A0 (analog input)
 * - ADS1115: SDA (D2), SCL (D1)
 * - Status LED: D4 (built-in LED)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <WiFiClient.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";          // Replace with your WiFi SSID
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // Replace with your WiFi password

// Server Configuration
const char* SERVER_URL = "http://192.168.1.100:5000"; // Replace with your Flask server IP
const char* TRANSFORMER_ID = "TX001";               // Unique transformer ID

// Pin Definitions
#define VOLTAGE_PIN A0          // ZMPT101B connected to A0
#define STATUS_LED LED_BUILTIN  // Built-in LED for status indication
#define SCL_PIN D1              // I2C Clock for ADS1115
#define SDA_PIN D2              // I2C Data for ADS1115

// Sensor Configuration
#define VOLTAGE_SAMPLES 100     // Number of samples for voltage reading
#define CURRENT_SAMPLES 100     // Number of samples for current reading
#define VOLTAGE_CALIBRATION 250.0  // Calibration factor for voltage sensor
#define CURRENT_CALIBRATION 10.0   // Calibration factor for current sensor
#define TRIP_THRESHOLD 0.05     // Current threshold for detecting line trip (A)
#define VOLTAGE_MIN_THRESHOLD 180.0  // Minimum voltage for normal operation

// Timing Configuration
#define READING_INTERVAL 5000   // Send readings every 5 seconds
#define WIFI_TIMEOUT 20000      // WiFi connection timeout
#define HTTP_TIMEOUT 10000      // HTTP request timeout

// Global Objects
Adafruit_ADS1115 ads;          // ADS1115 ADC for current measurement
WiFiClient wifiClient;
HTTPClient httpClient;
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 19800, 60000); // IST timezone (+5:30)

// Global Variables
unsigned long lastReadingTime = 0;
bool wifiConnected = false;
bool tripAlerted = false;
float lastVoltage = 0;
float lastCurrent = 0;

void setup() {
    Serial.begin(115200);
    Serial.println("\n=== LT Line Monitoring System ===");
    Serial.println("Initializing ESP8266...");
    
    // Initialize pins
    pinMode(STATUS_LED, OUTPUT);
    digitalWrite(STATUS_LED, HIGH); // LED off initially (inverted logic)
    
    // Initialize I2C
    Wire.begin(SDA_PIN, SCL_PIN);
    
    // Initialize ADS1115
    if (!ads.begin()) {
        Serial.println("ERROR: Failed to initialize ADS1115!");
        blinkError();
    } else {
        Serial.println("ADS1115 initialized successfully");
        ads.setGain(GAIN_FOUR);  // +/- 1.024V range for current sensor
    }
    
    // Connect to WiFi
    connectToWiFi();
    
    // Initialize NTP client
    if (wifiConnected) {
        timeClient.begin();
        timeClient.update();
        Serial.println("NTP client initialized");
    }
    
    // Send initial transformer registration
    if (wifiConnected) {
        registerTransformer();
    }
    
    Serial.println("Setup complete. Starting monitoring...");
    digitalWrite(STATUS_LED, LOW); // LED on to indicate ready
}

void loop() {
    // Check WiFi connection
    if (WiFi.status() != WL_CONNECTED) {
        wifiConnected = false;
        connectToWiFi();
    } else {
        wifiConnected = true;
    }
    
    // Take readings at specified interval
    if (millis() - lastReadingTime >= READING_INTERVAL) {
        if (wifiConnected) {
            takeAndSendReading();
        }
        lastReadingTime = millis();
    }
    
    // Update NTP time periodically
    if (wifiConnected && millis() % 60000 == 0) {
        timeClient.update();
    }
    
    delay(100); // Small delay to prevent watchdog reset
}

void connectToWiFi() {
    Serial.print("Connecting to WiFi: ");
    Serial.println(WIFI_SSID);
    
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    unsigned long startTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_TIMEOUT) {
        delay(500);
        Serial.print(".");
        digitalWrite(STATUS_LED, !digitalRead(STATUS_LED)); // Blink during connection
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        digitalWrite(STATUS_LED, LOW); // LED on when connected
        Serial.println();
        Serial.println("WiFi connected successfully!");
        Serial.print("IP address: ");
        Serial.println(WiFi.localIP());
    } else {
        wifiConnected = false;
        digitalWrite(STATUS_LED, HIGH); // LED off when disconnected
        Serial.println();
        Serial.println("WiFi connection failed!");
    }
}

float readVoltage() {
    float sum = 0;
    float maxValue = 0;
    
    // Take multiple samples and find peak
    for (int i = 0; i < VOLTAGE_SAMPLES; i++) {
        float sample = analogRead(VOLTAGE_PIN);
        sum += sample;
        if (sample > maxValue) {
            maxValue = sample;
        }
        delayMicroseconds(100);
    }
    
    // Convert to RMS voltage
    float avgValue = sum / VOLTAGE_SAMPLES;
    float voltage = (maxValue - avgValue) * VOLTAGE_CALIBRATION / 1024.0;
    
    // Apply calibration and filtering
    voltage = voltage * 0.707; // Convert peak to RMS
    
    return voltage;
}

float readCurrent() {
    float sum = 0;
    float maxValue = 0;
    float minValue = 32767;
    
    // Take multiple samples from ADS1115
    for (int i = 0; i < CURRENT_SAMPLES; i++) {
        int16_t adcValue = ads.readADC_SingleEnded(0);
        float sample = abs(adcValue);
        
        sum += sample;
        if (sample > maxValue) maxValue = sample;
        if (sample < minValue) minValue = sample;
        
        delayMicroseconds(500);
    }
    
    // Calculate RMS current
    float avgValue = sum / CURRENT_SAMPLES;
    float current = (maxValue - minValue) * CURRENT_CALIBRATION / 32767.0;
    
    // Apply filtering for noise reduction
    if (current < 0.1) current = 0; // Filter out noise
    
    return current;
}

bool detectTrip(float voltage, float current) {
    // Trip detection logic:
    // 1. Current suddenly drops to near zero while voltage is present
    // 2. This indicates a line break or disconnection
    
    if (voltage > VOLTAGE_MIN_THRESHOLD && current < TRIP_THRESHOLD) {
        if (lastCurrent > TRIP_THRESHOLD) {
            // Current dropped suddenly - potential trip
            return true;
        }
    }
    
    return false;
}

void registerTransformer() {
    Serial.println("Registering transformer with server...");
    
    // Create JSON payload
    StaticJsonDocument<200> doc;
    doc["transformer_id"] = TRANSFORMER_ID;
    doc["location"] = "Distribution Feeder Line 1"; // Update as needed
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Send HTTP POST request
    httpClient.begin(wifiClient, String(SERVER_URL) + "/add_transformer");
    httpClient.addHeader("Content-Type", "application/json");
    httpClient.setTimeout(HTTP_TIMEOUT);
    
    int httpResponseCode = httpClient.POST(jsonString);
    
    if (httpResponseCode > 0) {
        String response = httpClient.getString();
        Serial.print("Transformer registration response: ");
        Serial.println(response);
    } else {
        Serial.print("Transformer registration failed. HTTP error: ");
        Serial.println(httpResponseCode);
    }
    
    httpClient.end();
}

void takeAndSendReading() {
    Serial.println("Taking sensor readings...");
    
    // Read sensors
    float voltage = readVoltage();
    float current = readCurrent();
    bool tripStatus = detectTrip(voltage, current);
    
    // Update last readings
    lastVoltage = voltage;
    lastCurrent = current;
    
    // Print readings to serial
    Serial.print("Voltage: ");
    Serial.print(voltage, 2);
    Serial.print(" V, Current: ");
    Serial.print(current, 3);
    Serial.print(" A");
    
    if (tripStatus) {
        Serial.print(" [TRIP DETECTED]");
        if (!tripAlerted) {
            blinkAlert();
            tripAlerted = true;
        }
    } else {
        tripAlerted = false;
    }
    Serial.println();
    
    // Send to server
    sendReading(voltage, current, tripStatus);
}

void sendReading(float voltage, float current, bool tripStatus) {
    // Get current timestamp
    String timestamp = getTimestamp();
    
    // Create JSON payload
    StaticJsonDocument<300> doc;
    doc["transformer_id"] = TRANSFORMER_ID;
    doc["voltage"] = round(voltage * 10) / 10.0;  // Round to 1 decimal place
    doc["current"] = round(current * 1000) / 1000.0;  // Round to 3 decimal places
    doc["trip_status"] = tripStatus;
    doc["timestamp"] = timestamp;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.print("Sending data: ");
    Serial.println(jsonString);
    
    // Send HTTP POST request
    httpClient.begin(wifiClient, String(SERVER_URL) + "/add_reading");
    httpClient.addHeader("Content-Type", "application/json");
    httpClient.setTimeout(HTTP_TIMEOUT);
    
    int httpResponseCode = httpClient.POST(jsonString);
    
    if (httpResponseCode > 0) {
        String response = httpClient.getString();
        Serial.print("Server response (");
        Serial.print(httpResponseCode);
        Serial.print("): ");
        Serial.println(response);
        
        // Blink LED on successful transmission
        quickBlink();
    } else {
        Serial.print("HTTP POST failed. Error: ");
        Serial.println(httpResponseCode);
        blinkError();
    }
    
    httpClient.end();
}

String getTimestamp() {
    if (wifiConnected && timeClient.isTimeSet()) {
        // Get current time from NTP
        unsigned long epochTime = timeClient.getEpochTime();
        
        // Convert to readable format (ISO 8601)
        time_t rawTime = epochTime;
        struct tm *timeInfo = gmtime(&rawTime);
        
        char buffer[32];
        sprintf(buffer, "%04d-%02d-%02d %02d:%02d:%02d",
                timeInfo->tm_year + 1900,
                timeInfo->tm_mon + 1,
                timeInfo->tm_mday,
                timeInfo->tm_hour,
                timeInfo->tm_min,
                timeInfo->tm_sec);
        
        return String(buffer);
    } else {
        // Fallback to millis if NTP not available
        return String(millis());
    }
}

void quickBlink() {
    digitalWrite(STATUS_LED, HIGH);
    delay(100);
    digitalWrite(STATUS_LED, LOW);
}

void blinkError() {
    for (int i = 0; i < 3; i++) {
        digitalWrite(STATUS_LED, HIGH);
        delay(200);
        digitalWrite(STATUS_LED, LOW);
        delay(200);
    }
}

void blinkAlert() {
    for (int i = 0; i < 10; i++) {
        digitalWrite(STATUS_LED, HIGH);
        delay(100);
        digitalWrite(STATUS_LED, LOW);
        delay(100);
    }
}

// Diagnostic function to test sensors (call from serial monitor)
void testSensors() {
    Serial.println("=== Sensor Test ===");
    
    Serial.print("Raw ADC (A0): ");
    Serial.println(analogRead(VOLTAGE_PIN));
    
    Serial.print("ADS1115 Channel 0: ");
    Serial.println(ads.readADC_SingleEnded(0));
    
    Serial.print("Calculated Voltage: ");
    Serial.println(readVoltage());
    
    Serial.print("Calculated Current: ");
    Serial.println(readCurrent());
    
    Serial.println("=== Test Complete ===");
}
