from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os
from dotenv import load_dotenv
import pymysql
from sqlalchemy import text

# Load environment variables
load_dotenv()

# Install PyMySQL as MySQLdb
pymysql.install_as_MySQLdb()

app = Flask(__name__)
CORS(app)

# Database Configuration
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'lt_monitoring')

app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Database Models
class Transformer(db.Model):
    __tablename__ = 'transformer'
    
    transformer_id = db.Column(db.String(50), primary_key=True)
    location = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship with readings
    readings = db.relationship('Reading', backref='transformer', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'transformer_id': self.transformer_id,
            'location': self.location,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Reading(db.Model):
    __tablename__ = 'reading'
    
    id = db.Column(db.Integer, primary_key=True)
    transformer_id = db.Column(db.String(50), db.ForeignKey('transformer.transformer_id'), nullable=False)
    voltage = db.Column(db.Float, nullable=False)
    current = db.Column(db.Float, nullable=False)
    trip_status = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'transformer_id': self.transformer_id,
            'voltage': self.voltage,
            'current': self.current,
            'trip_status': self.trip_status,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

# API Routes

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'LT Line Monitoring System API',
        'version': '1.0',
        'status': 'running'
    })

@app.route('/add_transformer', methods=['POST'])
def add_transformer():
    try:
        data = request.get_json()
        
        if not data or 'transformer_id' not in data or 'location' not in data:
            return jsonify({'error': 'transformer_id and location are required'}), 400
        
        # Check if transformer already exists
        existing = Transformer.query.filter_by(transformer_id=data['transformer_id']).first()
        if existing:
            return jsonify({'error': 'Transformer already exists'}), 409
        
        transformer = Transformer(
            transformer_id=data['transformer_id'],
            location=data['location']
        )
        
        db.session.add(transformer)
        db.session.commit()
        
        return jsonify({
            'message': 'Transformer added successfully',
            'transformer': transformer.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/add_reading', methods=['POST'])
def add_reading():
    try:
        data = request.get_json()
        
        required_fields = ['transformer_id', 'voltage', 'current']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if transformer exists
        transformer = Transformer.query.filter_by(transformer_id=data['transformer_id']).first()
        if not transformer:
            return jsonify({'error': 'Transformer not found'}), 404
        
        # Parse timestamp if provided, otherwise use current time
        timestamp = datetime.utcnow()
        if 'timestamp' in data:
            try:
                timestamp = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
            except ValueError:
                pass  # Use default timestamp if parsing fails
        
        reading = Reading(
            transformer_id=data['transformer_id'],
            voltage=float(data['voltage']),
            current=float(data['current']),
            trip_status=data.get('trip_status', False),
            timestamp=timestamp
        )
        
        db.session.add(reading)
        db.session.commit()
        
        return jsonify({
            'message': 'Reading added successfully',
            'reading': reading.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/get_transformers', methods=['GET'])
def get_transformers():
    try:
        transformers = Transformer.query.all()
        return jsonify({
            'transformers': [t.to_dict() for t in transformers]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_readings/<transformer_id>', methods=['GET'])
def get_readings(transformer_id):
    try:
        # Check if transformer exists
        transformer = Transformer.query.filter_by(transformer_id=transformer_id).first()
        if not transformer:
            return jsonify({'error': 'Transformer not found'}), 404
        
        # Get limit parameter (default to 50 recent readings)
        limit = request.args.get('limit', 50, type=int)
        
        readings = Reading.query.filter_by(transformer_id=transformer_id)\
                                .order_by(Reading.timestamp.desc())\
                                .limit(limit).all()
        
        return jsonify({
            'transformer_id': transformer_id,
            'readings': [r.to_dict() for r in readings]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_latest_reading/<transformer_id>', methods=['GET'])
def get_latest_reading(transformer_id):
    try:
        # Check if transformer exists
        transformer = Transformer.query.filter_by(transformer_id=transformer_id).first()
        if not transformer:
            return jsonify({'error': 'Transformer not found'}), 404
        
        latest_reading = Reading.query.filter_by(transformer_id=transformer_id)\
                                    .order_by(Reading.timestamp.desc())\
                                    .first()
        
        if not latest_reading:
            return jsonify({'error': 'No readings found'}), 404
        
        return jsonify({
            'transformer_id': transformer_id,
            'latest_reading': latest_reading.to_dict()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Test database connection
        db.session.execute(text('SELECT 1'))
        return jsonify({'status': 'healthy', 'database': 'connected'})
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'database': 'disconnected', 'error': str(e)}), 503

# Initialize database
def create_tables():
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")

if __name__ == '__main__':
    # Create tables on startup
    create_tables()
    
    # Get host IP for network access
    import socket
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    print(f"Starting LT Line Monitoring API...")
    print(f"Local access: http://127.0.0.1:5000")
    print(f"Network access: http://{local_ip}:5000")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
