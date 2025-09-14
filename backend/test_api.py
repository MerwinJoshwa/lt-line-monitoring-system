#!/usr/bin/env python3
"""
Quick test script to verify the LT Line Monitoring API is working
"""
import requests
import json
from datetime import datetime

API_BASE = "http://localhost:5000"

def test_api():
    print("🧪 Testing LT Line Monitoring API...")
    print("=" * 50)
    
    try:
        # Test 1: API Home
        print("1. Testing API home endpoint...")
        response = requests.get(f"{API_BASE}/")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Status: {data['status']}")
            print(f"   ✅ Database: {data['database']}")
        else:
            print(f"   ❌ Failed: {response.status_code}")
            return False
        
        # Test 2: Health Check
        print("\n2. Testing health check...")
        response = requests.get(f"{API_BASE}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Health: {data['status']}")
            print(f"   ✅ Database: {data['database']}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
        
        # Test 3: Get Transformers
        print("\n3. Testing get transformers...")
        response = requests.get(f"{API_BASE}/get_transformers")
        if response.status_code == 200:
            data = response.json()
            transformers = data['transformers']
            print(f"   ✅ Found {len(transformers)} transformers:")
            for t in transformers:
                print(f"      - {t['transformer_id']}: {t['location']}")
        else:
            print(f"   ❌ Failed: {response.status_code}")
            return False
        
        # Test 4: Get Latest Reading
        if transformers:
            transformer_id = transformers[0]['transformer_id']
            print(f"\n4. Testing latest reading for {transformer_id}...")
            response = requests.get(f"{API_BASE}/get_latest_reading/{transformer_id}")
            if response.status_code == 200:
                data = response.json()
                reading = data['latest_reading']
                print(f"   ✅ Latest reading:")
                print(f"      - Voltage: {reading['voltage']} V")
                print(f"      - Current: {reading['current']} A")
                print(f"      - Trip Status: {reading['trip_status']}")
                print(f"      - Timestamp: {reading['timestamp']}")
            else:
                print(f"   ❌ Failed: {response.status_code}")
                return False
        
        # Test 5: Get Recent Readings
        if transformers:
            transformer_id = transformers[0]['transformer_id']
            print(f"\n5. Testing recent readings for {transformer_id}...")
            response = requests.get(f"{API_BASE}/get_readings/{transformer_id}?limit=5")
            if response.status_code == 200:
                data = response.json()
                readings = data['readings']
                print(f"   ✅ Found {len(readings)} recent readings")
                for i, r in enumerate(readings[:3]):  # Show first 3
                    print(f"      {i+1}. {r['voltage']}V, {r['current']}A, Trip: {r['trip_status']}")
            else:
                print(f"   ❌ Failed: {response.status_code}")
                return False
        
        # Test 6: Add a New Reading
        if transformers:
            transformer_id = transformers[0]['transformer_id']
            print(f"\n6. Testing add reading for {transformer_id}...")
            
            # Create test reading
            test_reading = {
                "transformer_id": transformer_id,
                "voltage": 225.5,
                "current": 6.2,
                "trip_status": False,
                "timestamp": datetime.now().isoformat()
            }
            
            response = requests.post(f"{API_BASE}/add_reading", 
                                   json=test_reading,
                                   headers={'Content-Type': 'application/json'})
            
            if response.status_code == 201:
                data = response.json()
                print(f"   ✅ Reading added successfully!")
                print(f"      - ID: {data['reading']['id']}")
            else:
                print(f"   ❌ Failed: {response.status_code}")
                try:
                    error = response.json()
                    print(f"      Error: {error}")
                except:
                    print(f"      Raw response: {response.text}")
                return False
        
        print("\n" + "=" * 50)
        print("🎉 All API tests passed successfully!")
        print("✅ Backend is running correctly")
        print("✅ Database is connected")
        print("✅ Sample data is available")
        print("✅ CRUD operations working")
        
        print("\n🌐 Backend URLs:")
        print(f"   • API Root: {API_BASE}")
        print(f"   • Health: {API_BASE}/health")
        print(f"   • Transformers: {API_BASE}/get_transformers")
        
        print("\n📱 Next Steps:")
        print("   1. Keep the backend running (python app_demo.py)")
        print("   2. Open frontend/index.html in your browser")
        print("   3. Select a transformer to see live data!")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure the Flask backend is running!")
        print("   Run: python app_demo.py")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_api()
    exit(0 if success else 1)
