// Debug Console JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the debug console
    loadUserInfo();
    loadDeviceInfo();
    loadSessionsData();

    // Set up event listeners
    document.getElementById('refresh-sessions').addEventListener('click', loadSessionsData);
    document.getElementById('clear-sessions').addEventListener('click', clearAllSessions);
    document.getElementById('export-sessions').addEventListener('click', exportSessionsJson);
    document.getElementById('test-api').addEventListener('click', testApiConnection);
});

/**
 * Load and display user information
 */
function loadUserInfo() {
    const userInfoElement = document.getElementById('user-info');
    
    try {
        // Get user UUID from localStorage
        const userId = localStorage.getItem('user_uuid') || 'Not set';
        const userConsent = localStorage.getItem('user_consent') || 'Not provided';
        
        let html = `<div><strong>User ID:</strong> ${userId}</div>`;
        html += `<div><strong>Consent Status:</strong> ${userConsent}</div>`;
        
        // Additional user preferences if available
        const preferManualTracking = localStorage.getItem('prefer_manual_tracking') === 'true';
        html += `<div><strong>Prefer Manual Tracking:</strong> ${preferManualTracking}</div>`;
        
        userInfoElement.innerHTML = html;
    } catch (error) {
        userInfoElement.innerHTML = `<div class="error">Error loading user info: ${error.message}</div>`;
    }
}

/**
 * Load and display device information
 */
function loadDeviceInfo() {
    const deviceInfoElement = document.getElementById('device-info');
    
    try {
        // Get device information
        const info = {
            'Browser': navigator.userAgent,
            'Platform': navigator.platform,
            'Language': navigator.language,
            'Screen Resolution': `${window.screen.width}x${window.screen.height}`,
            'Window Size': `${window.innerWidth}x${window.innerHeight}`,
            'Pixel Ratio': window.devicePixelRatio,
            'Cookies Enabled': navigator.cookieEnabled,
            'Online Status': navigator.onLine ? 'Online' : 'Offline'
        };
        
        let html = '';
        for (const [key, value] of Object.entries(info)) {
            html += `<div><strong>${key}:</strong> ${value}</div>`;
        }
        
        // Check for webcam availability
        html += `<div><strong>Webcam:</strong> <span id="webcam-status">Checking...</span></div>`;
        
        deviceInfoElement.innerHTML = html;
        
        // Check webcam
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                document.getElementById('webcam-status').textContent = 'Available';
                stream.getTracks().forEach(track => track.stop());
            })
            .catch(() => {
                document.getElementById('webcam-status').textContent = 'Not available or denied';
            });
    } catch (error) {
        deviceInfoElement.innerHTML = `<div class="error">Error loading device info: ${error.message}</div>`;
    }
}

/**
 * Load and display session data from localStorage
 */
function loadSessionsData() {
    const sessionsDataElement = document.getElementById('sessions-data');
    
    try {
        // Get all sessions from localStorage
        const sessions = [];
        const sessionKeys = [];
        
        // Find all keys that might be sessions
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('session_')) {
                sessionKeys.push(key);
            }
        }
        
        // No sessions found
        if (sessionKeys.length === 0) {
            sessionsDataElement.innerHTML = '<div>No stored sessions found</div>';
            return;
        }
        
        // Load and parse all sessions
        for (const key of sessionKeys) {
            try {
                const sessionData = JSON.parse(localStorage.getItem(key));
                sessions.push({
                    key: key,
                    timestamp: sessionData.timestamp || 'Unknown',
                    emotion: sessionData.emotion || 'Not recorded',
                    keystrokes: sessionData.keystrokes ? sessionData.keystrokes.length : 0,
                    data: sessionData
                });
            } catch (e) {
                console.error(`Failed to parse session ${key}:`, e);
            }
        }
        
        // Sort sessions by timestamp (newest first)
        sessions.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        // Render sessions
        let html = `<div><strong>Total Sessions:</strong> ${sessions.length}</div>`;
        
        sessions.forEach((session, index) => {
            html += `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                    <div><strong>Session #${index + 1}</strong> (${session.key})</div>
                    <div>Time: ${new Date(session.timestamp).toLocaleString()}</div>
                    <div>Emotion: ${session.emotion}</div>
                    <div>Keystrokes: ${session.keystrokes}</div>
                    <div>
                        <button onclick="viewSession('${session.key}')">View Details</button>
                        <button onclick="deleteSession('${session.key}')">Delete</button>
                    </div>
                </div>
            `;
        });
        
        sessionsDataElement.innerHTML = html;
    } catch (error) {
        sessionsDataElement.innerHTML = `<div class="error">Error loading sessions: ${error.message}</div>`;
    }
}

/**
 * View details of a specific session
 */
function viewSession(sessionKey) {
    try {
        const sessionData = JSON.parse(localStorage.getItem(sessionKey));
        
        // Create a pretty-printed JSON string
        const prettyJson = JSON.stringify(sessionData, null, 2);
        
        // Create a modal to display the data
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modal.style.zIndex = '1000';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        
        const content = document.createElement('div');
        content.style.backgroundColor = 'white';
        content.style.padding = '20px';
        content.style.borderRadius = '8px';
        content.style.maxWidth = '800px';
        content.style.maxHeight = '80%';
        content.style.overflow = 'auto';
        
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.marginTop = '20px';
        closeButton.addEventListener('click', () => document.body.removeChild(modal));
        
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.overflow = 'auto';
        pre.textContent = prettyJson;
        
        content.appendChild(pre);
        content.appendChild(closeButton);
        modal.appendChild(content);
        
        document.body.appendChild(modal);
    } catch (error) {
        alert(`Error viewing session: ${error.message}`);
    }
}

/**
 * Delete a specific session
 */
function deleteSession(sessionKey) {
    if (confirm(`Are you sure you want to delete session ${sessionKey}?`)) {
        try {
            localStorage.removeItem(sessionKey);
            loadSessionsData(); // Refresh the list
            alert('Session deleted successfully');
        } catch (error) {
            alert(`Error deleting session: ${error.message}`);
        }
    }
}

/**
 * Clear all session data from localStorage
 */
function clearAllSessions() {
    if (confirm('Are you sure you want to delete ALL session data? This cannot be undone.')) {
        try {
            // Find and remove all session keys
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('session_')) {
                    keysToRemove.push(key);
                }
            }
            
            // Remove the keys
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            loadSessionsData(); // Refresh the list
            alert(`${keysToRemove.length} sessions deleted successfully`);
        } catch (error) {
            alert(`Error clearing sessions: ${error.message}`);
        }
    }
}

/**
 * Export all session data as a JSON file
 */
function exportSessionsJson() {
    try {
        // Collect all session data
        const sessions = {};
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('session_')) {
                try {
                    sessions[key] = JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    console.error(`Failed to parse session ${key}:`, e);
                    sessions[key] = { error: 'Failed to parse', rawData: localStorage.getItem(key) };
                }
            }
        }
        
        // Create file content
        const content = JSON.stringify(sessions, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `emotion-detection-sessions-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        alert(`Error exporting sessions: ${error.message}`);
    }
}

/**
 * Test API connection to the server
 */
function testApiConnection() {
    const apiResultElement = document.getElementById('api-result');
    apiResultElement.innerHTML = 'Testing API connection...';
    
    // Get API server URL from localStorage or use default
    const serverUrl = localStorage.getItem('server_url') || 'https://emotion-tracking-server.example.com';
    
    // Make a request to the API
    fetch(`${serverUrl}/status`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        // Timeout after 5 seconds
        signal: AbortSignal.timeout(5000)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server returned ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        apiResultElement.innerHTML = `
            <div style="color: green;">✓ Connection successful</div>
            <div>Server: ${serverUrl}</div>
            <div>Status: ${data.status || 'OK'}</div>
            <div>Message: ${data.message || 'No message'}</div>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        `;
    })
    .catch(error => {
        // Check if the error is due to the server not being available
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            apiResultElement.innerHTML = `
                <div style="color: red;">✗ Connection timeout</div>
                <div>Server: ${serverUrl}</div>
                <div>Error: Request timed out after 5 seconds</div>
                <div>The server may be down or unreachable.</div>
            `;
        } else if (error.message.includes('Failed to fetch')) {
            apiResultElement.innerHTML = `
                <div style="color: red;">✗ Connection failed</div>
                <div>Server: ${serverUrl}</div>
                <div>Error: Network error</div>
                <div>The server may be down, unreachable, or CORS is blocking the request.</div>
            `;
        } else {
            apiResultElement.innerHTML = `
                <div style="color: red;">✗ Connection error</div>
                <div>Server: ${serverUrl}</div>
                <div>Error: ${error.message}</div>
            `;
        }
    });
} 