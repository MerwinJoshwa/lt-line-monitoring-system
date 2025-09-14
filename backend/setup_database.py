#!/usr/bin/env python3
"""
LT Line Monitoring System - Database Setup Script

This script helps set up the database and create sample data for testing.
"""

import os
import sys
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Transformer, Reading
from sqlalchemy import text

# Load environment variables
load_dotenv()

def create_database_tables():
    """Create all database tables"""
    print("Creating database tables...")
    with app.app_context():
        try:
            db.create_all()
            print("✓ Database tables created successfully!")
            return True
        except Exception as e:
            print(f"✗ Error creating tables: {e}")
            return False

def create_sample_transformers():
    """Create sample transformers for testing"""
    print("Creating sample transformers...")
    
    sample_transformers = [
        {"transformer_id": "TX001", "location": "Feeder Line 1 - Sector A"},
        {"transformer_id": "TX002", "location": "Feeder Line 2 - Sector B"},
        {"transformer_id": "TX003", "location": "Feeder Line 3 - Commercial Zone"},
        {"transformer_id": "TX004", "location": "Feeder Line 4 - Residential Area"},
    ]
    
    with app.app_context():
        try:
            created_count = 0
            for transformer_data in sample_transformers:
                # Check if transformer already exists
                existing = Transformer.query.filter_by(
                    transformer_id=transformer_data['transformer_id']
                ).first()
                
                if not existing:
                    transformer = Transformer(
                        transformer_id=transformer_data['transformer_id'],
                        location=transformer_data['location']
                    )
                    db.session.add(transformer)
                    created_count += 1
                    print(f"  + Added transformer: {transformer_data['transformer_id']}")
                else:
                    print(f"  - Transformer {transformer_data['transformer_id']} already exists")
            
            db.session.commit()
            print(f"✓ Created {created_count} sample transformers!")
            return True
        except Exception as e:
            db.session.rollback()
            print(f"✗ Error creating sample transformers: {e}")
            return False

def create_sample_readings(days_back=7, readings_per_day=288):
    """
    Create sample readings for testing
    
    Args:
        days_back (int): Number of days back to create data for
        readings_per_day (int): Number of readings per day (288 = every 5 minutes)
    """
    print(f"Creating sample readings for last {days_back} days...")
    
    with app.app_context():
        try:
            transformers = Transformer.query.all()
            if not transformers:
                print("  ! No transformers found. Please create transformers first.")
                return False
            
            total_readings = 0
            
            for transformer in transformers:
                print(f"  + Generating readings for {transformer.transformer_id}...")
                
                # Create readings for the specified time period
                start_time = datetime.utcnow() - timedelta(days=days_back)
                
                for day in range(days_back):
                    current_date = start_time + timedelta(days=day)
                    
                    # Simulate different patterns for different transformers
                    base_voltage = 220 + random.uniform(-10, 10)
                    base_current = 5 + random.uniform(-2, 2)
                    
                    # Add some variation based on time of day
                    for reading_num in range(readings_per_day):
                        timestamp = current_date + timedelta(
                            minutes=(reading_num * 1440 // readings_per_day)
                        )
                        
                        # Time-based variations (higher load during day)
                        hour = timestamp.hour
                        time_factor = 1.0
                        if 6 <= hour <= 22:  # Day time
                            time_factor = 1.2 + 0.3 * random.random()
                        else:  # Night time
                            time_factor = 0.6 + 0.2 * random.random()
                        
                        # Generate realistic readings
                        voltage = base_voltage + random.uniform(-5, 5)
                        current = max(0, base_current * time_factor + random.uniform(-1, 1))
                        
                        # Simulate occasional trips (very rare)
                        trip_status = False
                        if random.random() < 0.001:  # 0.1% chance of trip
                            trip_status = True
                            current = 0  # No current during trip
                        
                        # Create reading
                        reading = Reading(
                            transformer_id=transformer.transformer_id,
                            voltage=round(voltage, 1),
                            current=round(current, 3),
                            trip_status=trip_status,
                            timestamp=timestamp
                        )
                        
                        db.session.add(reading)
                        total_readings += 1
                
                # Commit readings for this transformer
                db.session.commit()
                print(f"    ✓ Added {days_back * readings_per_day} readings")
            
            print(f"✓ Created {total_readings} sample readings!")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"✗ Error creating sample readings: {e}")
            return False

def check_database_connection():
    """Check if database connection is working"""
    print("Checking database connection...")
    
    with app.app_context():
        try:
            # Try to execute a simple query
            db.session.execute(text('SELECT 1'))
            print("✓ Database connection successful!")
            return True
        except Exception as e:
            print(f"✗ Database connection failed: {e}")
            print("\nPlease check:")
            print("1. MySQL is running")
            print("2. Database credentials in .env file")
            print("3. Database exists")
            return False

def main():
    """Main setup function"""
    print("=" * 50)
    print("LT Line Monitoring System - Database Setup")
    print("=" * 50)
    
    # Check database connection
    if not check_database_connection():
        return False
    
    # Create tables
    if not create_database_tables():
        return False
    
    # Ask user if they want sample data
    print("\n" + "=" * 50)
    response = input("Do you want to create sample data for testing? (y/n): ").lower().strip()
    
    if response in ['y', 'yes']:
        print("Creating sample data...")
        
        # Create sample transformers
        if not create_sample_transformers():
            return False
        
        # Ask about sample readings
        print("\n" + "-" * 30)
        response = input("Create sample readings? This may take a moment... (y/n): ").lower().strip()
        
        if response in ['y', 'yes']:
            days = input("How many days of data? (default: 7): ").strip()
            try:
                days = int(days) if days else 7
            except ValueError:
                days = 7
            
            if not create_sample_readings(days_back=days):
                return False
    
    print("\n" + "=" * 50)
    print("Setup completed successfully! 🎉")
    print("=" * 50)
    print("\nNext steps:")
    print("1. Start the Flask backend: python app.py")
    print("2. Open the frontend dashboard: frontend/index.html")
    print("3. Configure and upload ESP8266 code")
    print("\nAPI will be available at: http://localhost:5000")
    print("Dashboard will show your sample data!")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
