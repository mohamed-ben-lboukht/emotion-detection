// Script to fetch and display MongoDB data in admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Add a button to the dashboard
    const adminActions = document.querySelector('.admin-actions') || document.body;
    
    const mongoButton = document.createElement('button');
    mongoButton.id = 'fetch-mongo-data';
    mongoButton.className = 'admin-button';
    mongoButton.textContent = 'Load MongoDB Data';
    adminActions.appendChild(mongoButton);
    
    // Add container for displaying data
    const dataContainer = document.createElement('div');
    dataContainer.id = 'mongo-data-container';
    dataContainer.className = 'data-container';
    dataContainer.style.display = 'none';
    dataContainer.innerHTML = `
        <h3>MongoDB Data</h3>
        <div class="data-controls">
            <button id="download-all-mongo">Download All Data</button>
            <button id="extract-to-json">Extract to JSON Files</button>
        </div>
        <div id="mongo-data-list" class="data-list"></div>
    `;
    document.body.appendChild(dataContainer);
    
    // Event listeners
    mongoButton.addEventListener('click', fetchMongoData);
    document.getElementById('download-all-mongo').addEventListener('click', downloadAllData);
    document.getElementById('extract-to-json').addEventListener('click', extractToJsonFiles);
    
    // Function to fetch MongoDB data
    function fetchMongoData() {
        dataContainer.style.display = 'block';
        const dataList = document.getElementById('mongo-data-list');
        dataList.innerHTML = '<p>Loading data from MongoDB...</p>';
        
        fetch('/api/sessions')
            .then(response => response.json())
            .then(data => {
                if (data.length === 0) {
                    dataList.innerHTML = '<p>No data found in MongoDB</p>';
                    return;
                }
                
                dataList.innerHTML = `<p>Found ${data.length} sessions</p>`;
                const table = document.createElement('table');
                table.className = 'data-table';
                
                // Create table header
                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr>
                        <th>Session ID</th>
                        <th>Date</th>
                        <th>Context</th>
                        <th>Text Length</th>
                        <th>Emotions</th>
                        <th>Actions</th>
                    </tr>
                `;
                table.appendChild(thead);
                
                // Create table body
                const tbody = document.createElement('tbody');
                data.forEach(session => {
                    const tr = document.createElement('tr');
                    
                    // Format date
                    const date = new Date(session.startTime).toLocaleString();
                    
                    // Get main emotion
                    let mainEmotion = 'N/A';
                    if (session.emotionData && Object.keys(session.emotionData).length > 0) {
                        const emotions = Object.entries(session.emotionData);
                        emotions.sort((a, b) => b[1] - a[1]);
                        mainEmotion = `${emotions[0][0]} (${Math.round(emotions[0][1] * 100)}%)`;
                    }
                    
                    tr.innerHTML = `
                        <td>${session.sessionId}</td>
                        <td>${date}</td>
                        <td>${session.context || 'N/A'}</td>
                        <td>${session.text ? session.text.length : 0} chars</td>
                        <td>${mainEmotion}</td>
                        <td>
                            <button class="view-details" data-id="${session.sessionId}">View</button>
                            <button class="download-session" data-id="${session.sessionId}">Download</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                dataList.appendChild(table);
                
                // Add event listeners for buttons
                document.querySelectorAll('.view-details').forEach(button => {
                    button.addEventListener('click', function() {
                        const sessionId = this.getAttribute('data-id');
                        const session = data.find(s => s.sessionId === sessionId);
                        displaySessionDetails(session);
                    });
                });
                
                document.querySelectorAll('.download-session').forEach(button => {
                    button.addEventListener('click', function() {
                        const sessionId = this.getAttribute('data-id');
                        const session = data.find(s => s.sessionId === sessionId);
                        downloadSession(session);
                    });
                });
            })
            .catch(error => {
                dataList.innerHTML = `<p>Error loading data: ${error.message}</p>`;
                console.error('Error fetching MongoDB data:', error);
            });
    }
    
    // Function to display session details
    function displaySessionDetails(session) {
        const detailsModal = document.createElement('div');
        detailsModal.className = 'modal';
        detailsModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h3>Session Details</h3>
                <pre>${JSON.stringify(session, null, 2)}</pre>
            </div>
        `;
        document.body.appendChild(detailsModal);
        
        const closeBtn = detailsModal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            detailsModal.remove();
        });
        
        window.addEventListener('click', event => {
            if (event.target === detailsModal) {
                detailsModal.remove();
            }
        });
    }
    
    // Function to download a single session
    function downloadSession(session) {
        const dataStr = JSON.stringify(session, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportName = `session_${session.sessionId}_${new Date(session.startTime).toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
    }
    
    // Function to download all data
    function downloadAllData() {
        fetch('/api/sessions')
            .then(response => response.json())
            .then(data => {
                const dataStr = JSON.stringify(data, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                
                const exportName = `all_sessions_${new Date().toISOString().slice(0,10)}.json`;
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportName);
                linkElement.click();
            })
            .catch(error => {
                console.error('Error downloading all data:', error);
                alert('Error downloading data: ' + error.message);
            });
    }
    
    // Function to extract MongoDB data to JSON files
    function extractToJsonFiles() {
        // Admin password - in a real app, use a more secure approach
        const password = prompt('Enter admin password:');
        
        if (!password) return;
        
        fetch(`/admin/extract-data?password=${encodeURIComponent(password)}`)
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert(`Successfully extracted ${result.count} sessions to JSON files.`);
                } else {
                    alert(`Error: ${result.message}`);
                }
            })
            .catch(error => {
                console.error('Error extracting to JSON files:', error);
                alert('Error: ' + error.message);
            });
    }
}); 