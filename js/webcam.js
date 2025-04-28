/**
 * Webcam Capture Module
 * 
 * Captures video from webcam while user is typing
 * Adds real-time facial emotion detection using face-api.js
 */

class WebcamTracker {
  constructor() {
    this.video = document.getElementById('webcam');
    this.detectionStatus = document.getElementById('detection-status');
    this.isActive = false;
    this.sessionStartTime = null;
    this.emotionTimeline = [];
    this.modelLoaded = false;
    this.frameInterval = 500; // ms between two analyses
    this.frameTimer = null;
    
    // Create debug panel for emotion scores
    this.debugPanel = document.createElement('div');
    this.debugPanel.className = 'emotion-debug-panel';
    this.debugPanel.style.cssText = 'background-color: rgba(0,0,0,0.7); color: white; padding: 10px; margin-top: 10px; border-radius: 5px; font-family: monospace; max-width: 400px;';
    
    // Insert debug panel after detection status
    if (this.detectionStatus) {
      this.detectionStatus.parentNode.insertBefore(this.debugPanel, this.detectionStatus.nextSibling);
    }
  }
  
  async initialize() {
    try {
      // Load face-api.js models from local files
      if (!this.modelLoaded) {
        this.detectionStatus.textContent = 'Loading detection model...';
        try {
          // Use the new models directory
          await faceapi.nets.tinyFaceDetector.loadFromUri('/models/face-api-models');
          await faceapi.nets.faceExpressionNet.loadFromUri('/models/face-api-models');
          this.modelLoaded = true;
          console.log("Face detection models loaded successfully");
        } catch (modelError) {
          console.error("Model loading error:", modelError);
          this.detectionStatus.textContent = 'Error loading face detection model. Camera will work without emotion detection.';
        }
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.detectionStatus.textContent = 'Votre navigateur ne supporte pas l\'accès à la caméra. Mode sans caméra activé.';
        this.isActive = false;
        return false;
      }

      this.detectionStatus.textContent = 'Demande d\'accès à la caméra...';
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (error) {
        console.error("Camera access error:", error);
        this.detectionStatus.textContent = 'Caméra non accessible ou refusée. Mode sans caméra activé.';
        this.isActive = false;
        return false;
      }

      this.video.srcObject = stream;
      this.isActive = true;
      this.sessionStartTime = new Date().toISOString();
      
      // Start emotion detection if models loaded successfully
      if (this.modelLoaded) {
        this.detectionStatus.textContent = 'Camera active. Detecting emotions...';
        this.startEmotionDetection();
      } else {
        this.detectionStatus.textContent = 'Camera active. Emotion detection disabled.';
      }
      
      return true;
    } catch (error) {
      console.error("Unexpected error:", error);
      this.detectionStatus.textContent = 'Erreur inattendue. Mode sans caméra activé.';
      this.isActive = false;
      return false;
    }
  }
  
  // Helper function to format emotion scores for display
  formatEmotionScores(expressions) {
    if (!expressions) return '<div>No expressions detected</div>';
    
    // Sort emotions by score (highest first)
    const sortedEmotions = Object.entries(expressions)
      .sort((a, b) => b[1] - a[1]);
    
    // Format as HTML, with bars visualizing the scores
    return sortedEmotions.map(([emotion, score]) => {
      const percentage = Math.round(score * 100);
      const barWidth = Math.max(1, percentage); // At least 1px wide
      
      return `
        <div style="margin: 5px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>${emotion}</span>
            <span>${percentage}%</span>
          </div>
          <div style="background-color: #444; width: 100%; height: 10px; border-radius: 5px;">
            <div style="background-color: ${this.getEmotionColor(emotion)}; width: ${barWidth}%; height: 100%; border-radius: 5px;"></div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // Map emotions to colors for visualization
  getEmotionColor(emotion) {
    const colors = {
      happy: '#4CAF50',      // Green
      sad: '#2196F3',        // Blue
      angry: '#F44336',      // Red
      fearful: '#9C27B0',    // Purple
      disgusted: '#795548',  // Brown
      surprised: '#FF9800',  // Orange
      neutral: '#9E9E9E'     // Gray
    };
    return colors[emotion] || '#FFFFFF';
  }
  
  startEmotionDetection() {
    if (!this.isActive || !this.modelLoaded) return;
    
    const analyze = async () => {
      if (!this.isActive) return;
      
      try {
        // Check if video is ready
        if (this.video.readyState !== 4) {
          console.log("Video not ready yet");
          this.frameTimer = setTimeout(analyze, this.frameInterval);
          return;
        }
        
        // Get all detected faces with expressions
        const result = await faceapi.detectSingleFace(
          this.video, 
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceExpressions();
        
        if (result && result.expressions) {
          // Log full expression data to console
          console.log("All detected emotions:", result.expressions);
          
          // Update debug panel with all emotion scores
          this.debugPanel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">Emotion Scores:</div>
            ${this.formatEmotionScores(result.expressions)}
          `;
          
          // Take the dominant emotion (highest score)
          const sorted = Object.entries(result.expressions).sort((a, b) => b[1] - a[1]);
          const [emotion, score] = sorted[0];
          
          // Only record emotions with a minimum confidence
          if (score > 0.2) { // Lower threshold to 20% confidence to capture more emotions
            this.emotionTimeline.push({
              timestamp: Date.now() - new Date(this.sessionStartTime).getTime(),
              emotion,
              score: Math.round(score * 100),
              allEmotions: Object.fromEntries(
                Object.entries(result.expressions).map(([e, s]) => [e, Math.round(s * 100)])
              )
            });
            this.detectionStatus.textContent = `Detected emotion: ${emotion} (${Math.round(score * 100)}%)`;
          } else {
            this.detectionStatus.textContent = 'Emotion confidence too low. Please face the camera.';
          }
        } else {
          this.debugPanel.innerHTML = '<div>No face detected</div>';
          this.detectionStatus.textContent = 'Camera active. No face detected.';
        }
      } catch (error) {
        console.error("Error during emotion detection:", error);
        this.detectionStatus.textContent = 'Camera active. Error in emotion detection.';
        this.debugPanel.innerHTML = `<div>Error: ${error.message}</div>`;
      }
      
      this.frameTimer = setTimeout(analyze, this.frameInterval);
    };
    
    analyze();
  }
  
  stop() {
    if (this.isActive && this.video.srcObject) {
      // Stop all video tracks
      this.video.srcObject.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
      this.isActive = false;
    }
    if (this.frameTimer) {
      clearTimeout(this.frameTimer);
      this.frameTimer = null;
    }
    this.detectionStatus.textContent = 'Camera inactive';
    this.debugPanel.innerHTML = '';
  }
  
  getData() {
    return {
      sessionStartTime: this.sessionStartTime,
      emotionTimeline: this.emotionTimeline,
      isActive: this.isActive
    };
  }
  
  reset() {
    this.sessionStartTime = null;
    this.emotionTimeline = [];
    if (this.isActive) {
      this.sessionStartTime = new Date().toISOString();
    }
    this.debugPanel.innerHTML = '';
  }
}

// Export the WebcamTracker
window.WebcamTracker = WebcamTracker;