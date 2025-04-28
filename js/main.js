/**
 * Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize trackers
  const manualKeystrokeTracker = new KeystrokeTracker('typing-area');
  const musicKeystrokeTracker = new KeystrokeTracker('music-typing-area');
  const webcamKeystrokeTracker = new KeystrokeTracker('webcam-typing-area');
  const emotionsHandler = new EmotionsHandler();
  const webcamTracker = new WebcamTracker();
  
  // Get DOM elements
  const optionCards = document.querySelectorAll('.option-card');
  const sections = document.querySelectorAll('.tracking-section');
  const backButtons = document.querySelectorAll('.back-button');
  const saveButtons = document.querySelectorAll('.save-button');
  const viewDataButton = document.getElementById('view-data');
  
  // Option card click handlers
  optionCards.forEach(card => {
    card.addEventListener('click', () => {
      const optionId = card.id;
      let targetSection;
      
      // Hide main options
      document.querySelector('.options').classList.add('hidden');
      
      // Show appropriate section based on option selected
      if (optionId === 'manual-option') {
        targetSection = document.getElementById('manual-tracking');
      } else if (optionId === 'music-option') {
        targetSection = document.getElementById('music-tracking');
      } else if (optionId === 'webcam-option') {
        targetSection = document.getElementById('webcam-tracking');
        // Initialize webcam
        webcamTracker.initialize();
      }
      
      if (targetSection) {
        targetSection.classList.remove('hidden');
      }
    });
  });
  
  // Back button handlers
  backButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Hide all sections
      sections.forEach(section => {
        section.classList.add('hidden');
      });
      
      // Show main options
      document.querySelector('.options').classList.remove('hidden');
      
      // Stop webcam if active
      webcamTracker.stop();
      
      // Stop music if playing
      emotionsHandler.stopMusic();
    });
  });
  
  // Save button handlers
  document.getElementById('save-manual').addEventListener('click', () => {
    const emotionData = emotionsHandler.getManualEmotionData();
    
    // Validate that at least one emotion is non-zero
    if (!emotionsHandler.validateEmotions(emotionData)) {
      alert('Please set at least one emotion to a value above 0%');
      return;
    }
    
    const keystrokeData = manualKeystrokeTracker.getData();
    
    saveData('manual', {
      emotions: emotionData,
      text: keystrokeData.text,
      keystrokeData: keystrokeData.keystrokeData,
      timestamp: new Date().toISOString()
    });
    
    manualKeystrokeTracker.reset();
    emotionsHandler.resetManualEmotions();
  });
  
  document.getElementById('save-music').addEventListener('click', () => {
    const emotionData = emotionsHandler.getEmotionData();
    
    // Validate that at least one emotion is non-zero
    if (!emotionsHandler.validateEmotions(emotionData)) {
      alert('Please set at least one emotion to a value above 0%');
      return;
    }
    
    const keystrokeData = musicKeystrokeTracker.getData();
    
    saveData('music', {
      emotions: emotionData,
      text: keystrokeData.text,
      keystrokeData: keystrokeData.keystrokeData,
      timestamp: new Date().toISOString()
    });
    
    musicKeystrokeTracker.reset();
    emotionsHandler.resetEmotions();
  });
  
  document.getElementById('save-webcam').addEventListener('click', () => {
    const emotionData = webcamTracker.getEmotionData();
    const keystrokeData = webcamKeystrokeTracker.getData();
    
    saveData('webcam', {
      emotionData: emotionData,
      text: keystrokeData.text,
      keystrokeData: keystrokeData.keystrokeData,
      timestamp: new Date().toISOString()
    });
    
    webcamKeystrokeTracker.reset();
    webcamTracker.reset();
  });
  
  // Emotion button handlers
  document.querySelectorAll('.emotion-buttons button').forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      document.querySelectorAll('.emotion-buttons button').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Add active class to the clicked button
      button.classList.add('active');
    });
  });
  
  // View Data button handler
  viewDataButton.addEventListener('click', () => {
    // Hide all sections
    sections.forEach(section => {
      section.classList.add('hidden');
    });
    
    // Show data view
    document.getElementById('data-view').classList.remove('hidden');
    
    // Hide main options
    document.querySelector('.options').classList.add('hidden');
    
    // Display the data
    displayStoredData();
  });
  
  // Function to save data to the server
  async function saveData(type, data) {
    try {
      const response = await fetch('/save-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Data saved successfully to CSV file: ${result.filename}`);
        return true;
      } else {
        alert(`Error saving data: ${result.message}`);
        return false;
      }
    } catch (error) {
      console.error('Error saving data:', error);
      alert(`Error saving data: ${error.message}`);
      return false;
    }
  }
  
  // Function to display stored data from server
  async function displayStoredData() {
    const dataDisplay = document.getElementById('data-display');
    dataDisplay.innerHTML = '<p>Loading data...</p>';
    
    try {
      const response = await fetch('/list-files');
      const data = await response.json();
      
      if (!data.files || data.files.length === 0) {
        dataDisplay.innerHTML = '<p>No data files found.</p>';
        return;
      }
      
      let html = '<h3>CSV Data Files</h3>';
      
      // Group files by type for better organization
      const fileTypes = {
        manual: { name: 'Manual Tracking', files: [] },
        music: { name: 'Music-Based Tracking', files: [] },
        webcam: { name: 'Webcam Tracking', files: [] }
      };
      
      // Sort files into categories
      data.files.forEach(file => {
        if (file.type in fileTypes) {
          fileTypes[file.type].files.push(file);
        }
      });
      
      // Create section for each type
      for (const [type, info] of Object.entries(fileTypes)) {
        if (info.files.length > 0) {
          html += `<div class="data-category">
            <h4>${info.name} Data</h4>`;
          
          info.files.forEach(file => {
            if (!file.exists) {
              html += `<p>No data has been recorded yet.</p>`;
              return;
            }
            
            const modified = new Date(file.modified).toLocaleString();
            const fileSize = (file.size / 1024).toFixed(2); // Convert to KB
            
            html += `
              <div class="data-entry">
                <p><strong>Filename:</strong> ${file.name}</p>
                <p><strong>Last updated:</strong> ${modified}</p>
                <p><strong>Size:</strong> ${fileSize} KB</p>
                <a href="${file.path}" class="download-button" download>Download CSV</a>
              </div>
            `;
          });
          
          html += `</div>`;
        }
      }
      
      dataDisplay.innerHTML = html;
      
    } catch (error) {
      console.error('Error fetching data files:', error);
      dataDisplay.innerHTML = `<p>Error loading data: ${error.message}</p>`;
    }
  }
}); 