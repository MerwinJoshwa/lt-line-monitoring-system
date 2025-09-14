// Dashboard Configuration
const CONFIG = {
    API_BASE_URL: 'http://localhost:5000',
    REFRESH_INTERVAL: 5000, // 5 seconds
    CHART_MAX_POINTS: 50,
    VOLTAGE_THRESHOLDS: {
        low: 200,
        high: 250
    },
    CURRENT_THRESHOLDS: {
        low: 0.1,
        high: 15
    }
};

// Global Variables
let currentTransformerId = null;
let refreshInterval = null;
let trendsChart = null;
let lastTripStatus = false;

// DOM Elements
const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
    statusText: document.getElementById('statusText'),
    lastUpdate: document.getElementById('lastUpdate'),
    transformerSelect: document.getElementById('transformerSelect'),
    autoRefresh: document.getElementById('autoRefresh'),
    voltageValue: document.getElementById('voltageValue'),
    voltageStatus: document.getElementById('voltageStatus'),
    currentValue: document.getElementById('currentValue'),
    currentStatus: document.getElementById('currentStatus'),
    tripStatus: document.getElementById('tripStatus'),
    tripText: document.getElementById('tripText'),
    readingsTableBody: document.getElementById('readingsTableBody'),
    recordsLimit: document.getElementById('recordsLimit'),
    timeRange: document.getElementById('timeRange'),
    alertModal: document.getElementById('alertModal'),
    alertTransformer: document.getElementById('alertTransformer'),
    alertTime: document.getElementById('alertTime'),
    closeAlert: document.getElementById('closeAlert'),
    acknowledgeAlert: document.getElementById('acknowledgeAlert'),
    viewDetails: document.getElementById('viewDetails')
};

// Utility Functions
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function getStatusClass(value, thresholds) {
    if (value < thresholds.low || value > thresholds.high) {
        return 'critical';
    }
    if (value < thresholds.low * 1.1 || value > thresholds.high * 0.9) {
        return 'warning';
    }
    return 'normal';
}

function updateConnectionStatus(connected) {
    if (connected) {
        elements.connectionStatus.classList.add('connected');
        elements.statusText.textContent = 'Connected';
    } else {
        elements.connectionStatus.classList.remove('connected');
        elements.statusText.textContent = 'Disconnected';
    }
}

function showAlert(transformerId, timestamp) {
    elements.alertTransformer.textContent = transformerId;
    elements.alertTime.textContent = formatTimestamp(timestamp);
    elements.alertModal.style.display = 'block';
    
    // Play alert sound (if available)
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQcBi2NzfHThywAHAA==');
        audio.play().catch(() => {}); // Ignore errors if audio fails
    } catch (e) {}
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    try {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        updateConnectionStatus(false);
        throw error;
    }
}

async function loadTransformers() {
    try {
        const data = await apiRequest('/get_transformers');
        
        elements.transformerSelect.innerHTML = '<option value="">Select a transformer...</option>';
        
        if (data.transformers && data.transformers.length > 0) {
            data.transformers.forEach(transformer => {
                const option = document.createElement('option');
                option.value = transformer.transformer_id;
                option.textContent = `${transformer.transformer_id} - ${transformer.location}`;
                elements.transformerSelect.appendChild(option);
            });
        } else {
            elements.transformerSelect.innerHTML = '<option value="">No transformers found</option>';
        }
        
        updateConnectionStatus(true);
    } catch (error) {
        elements.transformerSelect.innerHTML = '<option value="">Error loading transformers</option>';
        console.error('Error loading transformers:', error);
    }
}

async function loadLatestReading(transformerId) {
    try {
        const data = await apiRequest(`/get_latest_reading/${transformerId}`);
        
        if (data.latest_reading) {
            const reading = data.latest_reading;
            updateReadingCards(reading);
            elements.lastUpdate.textContent = formatTimestamp(reading.timestamp);
            updateConnectionStatus(true);
            
            // Check for trip status change
            if (reading.trip_status && !lastTripStatus) {
                showAlert(transformerId, reading.timestamp);
            }
            lastTripStatus = reading.trip_status;
        }
    } catch (error) {
        console.error('Error loading latest reading:', error);
        // Clear displays on error
        elements.voltageValue.textContent = '--';
        elements.currentValue.textContent = '--';
        elements.lastUpdate.textContent = '--';
    }
}

async function loadReadings(transformerId, limit = 25) {
    try {
        const data = await apiRequest(`/get_readings/${transformerId}?limit=${limit}`);
        
        if (data.readings) {
            updateReadingsTable(data.readings);
            updateTrendsChart(data.readings);
        }
    } catch (error) {
        console.error('Error loading readings:', error);
        elements.readingsTableBody.innerHTML = '<tr><td colspan="5" class="loading">Error loading readings</td></tr>';
    }
}

// UI Update Functions
function updateReadingCards(reading) {
    // Update voltage
    elements.voltageValue.textContent = reading.voltage.toFixed(1);
    const voltageClass = getStatusClass(reading.voltage, CONFIG.VOLTAGE_THRESHOLDS);
    elements.voltageStatus.className = `reading-status ${voltageClass}`;
    elements.voltageStatus.textContent = voltageClass === 'normal' ? 'Normal' : 
                                        voltageClass === 'warning' ? 'Warning' : 'Critical';
    
    // Update current
    elements.currentValue.textContent = reading.current.toFixed(2);
    const currentClass = getStatusClass(reading.current, CONFIG.CURRENT_THRESHOLDS);
    elements.currentStatus.className = `reading-status ${currentClass}`;
    elements.currentStatus.textContent = currentClass === 'normal' ? 'Normal' : 
                                        currentClass === 'warning' ? 'Warning' : 'Critical';
    
    // Update trip status
    const tripContainer = elements.tripStatus;
    const tripIcon = tripContainer.querySelector('i');
    
    if (reading.trip_status) {
        tripContainer.className = 'trip-status alert';
        tripIcon.className = 'fas fa-exclamation-triangle';
        elements.tripText.textContent = 'LINE TRIP DETECTED';
    } else {
        tripContainer.className = 'trip-status normal';
        tripIcon.className = 'fas fa-check-circle';
        elements.tripText.textContent = 'Normal Operation';
    }
}

function updateReadingsTable(readings) {
    const tbody = elements.readingsTableBody;
    tbody.innerHTML = '';
    
    if (!readings || readings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">No readings available</td></tr>';
        return;
    }
    
    readings.forEach(reading => {
        const row = document.createElement('tr');
        
        // Status determination
        const voltageStatus = getStatusClass(reading.voltage, CONFIG.VOLTAGE_THRESHOLDS);
        const currentStatus = getStatusClass(reading.current, CONFIG.CURRENT_THRESHOLDS);
        const overallStatus = reading.trip_status ? 'critical' : 
                             (voltageStatus === 'critical' || currentStatus === 'critical') ? 'critical' :
                             (voltageStatus === 'warning' || currentStatus === 'warning') ? 'warning' : 'normal';
        
        row.innerHTML = `
            <td>${formatTimestamp(reading.timestamp)}</td>
            <td>${reading.voltage.toFixed(1)}</td>
            <td>${reading.current.toFixed(2)}</td>
            <td><span class="status-badge ${overallStatus}">${overallStatus.toUpperCase()}</span></td>
            <td>${reading.trip_status ? '<span class="status-badge critical">TRIP</span>' : '<span class="status-badge normal">OK</span>'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function initializeTrendsChart() {
    const ctx = document.getElementById('trendsChart').getContext('2d');
    
    trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Voltage (V)',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                yAxisID: 'voltage'
            }, {
                label: 'Current (A)',
                data: [],
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                tension: 0.4,
                yAxisID: 'current'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return formatTimestamp(context[0].label);
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    ticks: {
                        callback: function(value, index, values) {
                            const label = this.getLabelForValue(value);
                            const date = new Date(label);
                            return date.toLocaleTimeString('en-IN', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            });
                        },
                        maxTicksLimit: 10
                    }
                },
                voltage: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Voltage (V)',
                        color: '#3498db'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        color: '#3498db'
                    }
                },
                current: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Current (A)',
                        color: '#e74c3c'
                    },
                    ticks: {
                        color: '#e74c3c'
                    }
                }
            }
        }
    });
}

function updateTrendsChart(readings) {
    if (!trendsChart || !readings || readings.length === 0) return;
    
    // Sort readings by timestamp (oldest first for chart)
    const sortedReadings = [...readings].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Limit to last N points to prevent chart from becoming too crowded
    const limitedReadings = sortedReadings.slice(-CONFIG.CHART_MAX_POINTS);
    
    const labels = limitedReadings.map(r => r.timestamp);
    const voltageData = limitedReadings.map(r => r.voltage);
    const currentData = limitedReadings.map(r => r.current);
    
    trendsChart.data.labels = labels;
    trendsChart.data.datasets[0].data = voltageData;
    trendsChart.data.datasets[1].data = currentData;
    
    trendsChart.update('none'); // Update without animation for better performance
}

// Event Handlers
function setupEventListeners() {
    // Transformer selection
    elements.transformerSelect.addEventListener('change', (e) => {
        currentTransformerId = e.target.value;
        if (currentTransformerId) {
            loadLatestReading(currentTransformerId);
            loadReadings(currentTransformerId, parseInt(elements.recordsLimit.value));
        } else {
            // Clear displays when no transformer selected
            elements.voltageValue.textContent = '--';
            elements.currentValue.textContent = '--';
            elements.lastUpdate.textContent = '--';
            elements.readingsTableBody.innerHTML = '<tr><td colspan="5" class="loading">Select a transformer to view readings</td></tr>';
            if (trendsChart) {
                trendsChart.data.labels = [];
                trendsChart.data.datasets[0].data = [];
                trendsChart.data.datasets[1].data = [];
                trendsChart.update();
            }
        }
    });
    
    // Auto-refresh toggle
    elements.autoRefresh.addEventListener('change', (e) => {
        if (e.target.checked) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });
    
    // Records limit change
    elements.recordsLimit.addEventListener('change', (e) => {
        if (currentTransformerId) {
            loadReadings(currentTransformerId, parseInt(e.target.value));
        }
    });
    
    // Time range change (for future implementation)
    elements.timeRange.addEventListener('change', (e) => {
        if (currentTransformerId) {
            // This could be extended to filter readings by time range
            loadReadings(currentTransformerId, parseInt(elements.recordsLimit.value));
        }
    });
    
    // Alert modal handlers
    elements.closeAlert.addEventListener('click', () => {
        elements.alertModal.style.display = 'none';
    });
    
    elements.acknowledgeAlert.addEventListener('click', () => {
        elements.alertModal.style.display = 'none';
        // Here you could add logic to mark the alert as acknowledged in the backend
    });
    
    elements.viewDetails.addEventListener('click', () => {
        elements.alertModal.style.display = 'none';
        // Here you could add logic to show detailed information about the trip
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === elements.alertModal) {
            elements.alertModal.style.display = 'none';
        }
    });
}

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    
    refreshInterval = setInterval(() => {
        if (currentTransformerId) {
            loadLatestReading(currentTransformerId);
            loadReadings(currentTransformerId, parseInt(elements.recordsLimit.value));
        }
    }, CONFIG.REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing LT Line Monitoring Dashboard...');
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize charts
    initializeTrendsChart();
    
    // Load initial data
    await loadTransformers();
    
    // Start auto-refresh if enabled
    if (elements.autoRefresh.checked) {
        startAutoRefresh();
    }
    
    console.log('Dashboard initialized successfully!');
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});

// Export for debugging (optional)
window.Dashboard = {
    CONFIG,
    currentTransformerId,
    loadTransformers,
    loadLatestReading,
    loadReadings,
    trendsChart
};
