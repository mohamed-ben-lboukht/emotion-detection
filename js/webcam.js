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
    
    console.log("WebcamTracker initialized");
  }
  
  async initialize() {
    try {
      console.log("Initializing WebcamTracker");
      // Load face-api.js models from local files
      if (!this.modelLoaded) {
        this.detectionStatus.textContent = 'Loading detection model...';
        try {
          // Vérifier si face-api est disponible
          if (typeof faceapi === 'undefined') {
            throw new Error("face-api is not loaded");
          }
          
          console.log("Attempting to load models from /models/face-api-models");
          
          // Utiliser le chemin absolu pour les modèles
          const modelPath = window.location.origin + '/models/face-api-models';
          console.log("Using model path:", modelPath);
          
          // Load models with timeout promise to avoid hanging forever
          const loadWithTimeout = async (loadPromise, timeout, modelName) => {
            let timer;
            const timeoutPromise = new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error(`Loading ${modelName} timed out after ${timeout}ms`)), timeout);
            });
            
            try {
              await Promise.race([loadPromise, timeoutPromise]);
              clearTimeout(timer);
              console.log(`${modelName} loaded successfully`);
              return true;
            } catch (error) {
              console.error(`Error loading ${modelName}:`, error);
              return false;
            }
          };
          
          // Load each model with timeout
          const tinyFaceLoaded = await loadWithTimeout(
            faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
            10000, 
            "TinyFaceDetector"
          );
          
          const expressionLoaded = await loadWithTimeout(
            faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
            10000, 
            "FaceExpressionNet"
          );
          
          if (tinyFaceLoaded && expressionLoaded) {
            this.modelLoaded = true;
            console.log("All face detection models loaded successfully");
          } else {
            throw new Error("Some models failed to load");
          }
        } catch (modelError) {
          console.error("Model loading error:", modelError);
          this.detectionStatus.textContent = 'Error loading face detection model. Camera will work without emotion detection.';
          this.modelLoaded = false;
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
      
      // Reset emotion timeline and set start time (using milliseconds timestamp instead of ISO string)
      this.emotionTimeline = [];
      this.sessionStartTime = Date.now();
      console.log("Session start time set to:", this.sessionStartTime);
      
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
    if (!this.isActive || !this.modelLoaded) {
      console.log("Cannot start emotion detection:", 
                 this.isActive ? "Model not loaded" : "Camera not active");
      return;
    }
    
    console.log("Starting emotion detection");
    
    const analyze = async () => {
      if (!this.isActive) {
        console.log("Emotion detection stopped (camera inactive)");
        return;
      }
      
      try {
        // Check if video is ready
        if (this.video.readyState !== 4) {
          console.log("Video not ready yet");
          this.frameTimer = setTimeout(analyze, this.frameInterval);
          return;
        }
        
        console.log("Analyzing video frame for emotions");
        
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
            const entry = {
              timestamp: Date.now() - this.sessionStartTime,
              emotion,
              score: Math.round(score * 100),
              allEmotions: Object.fromEntries(
                Object.entries(result.expressions).map(([e, s]) => [e, Math.round(s * 100)])
              )
            };
            
            console.log("Adding emotion to timeline:", entry);
            this.emotionTimeline.push(entry);
            
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
      
      // Schedule next analysis
      this.frameTimer = setTimeout(analyze, this.frameInterval);
      console.log("Next emotion analysis scheduled in", this.frameInterval, "ms");
    };
    
    // Start the analysis loop
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
  
  // Fonction pour forcer la détection d'une émotion (si l'utilisateur veut sauvegarder sans détection automatique)
  forceEmotion(emotionName = 'neutral', score = 100) {
    console.log(`Forcing emotion: ${emotionName} with score ${score}`);
    
    const timestamp = Date.now() - this.sessionStartTime;
    const allEmotions = {
      "neutral": 0,
      "happy": 0,
      "sad": 0,
      "angry": 0,
      "fearful": 0,
      "disgusted": 0,
      "surprised": 0
    };
    
    // Set the specified emotion to the given score
    allEmotions[emotionName] = score;
    
    const entry = {
      timestamp,
      emotion: emotionName,
      score,
      allEmotions
    };
    
    this.emotionTimeline.push(entry);
    this.detectionStatus.textContent = `Emotion manually set: ${emotionName} (${score}%)`;
    
    return entry;
  }
  
  // Method to check if we have any emotions detected
  hasDetectedEmotions() {
    return this.emotionTimeline && this.emotionTimeline.length > 0;
  }
  
  getData() {
    console.log("WebcamTracker getData called");
    console.log("emotionTimeline length:", this.emotionTimeline.length);
    console.log("isActive:", this.isActive);
    console.log("modelLoaded:", this.modelLoaded);
    
    // If no emotions detected but camera is active, add a default neutral emotion
    if (this.isActive && this.emotionTimeline.length === 0) {
      console.log("No emotions detected, adding neutral placeholder");
      this.forceEmotion('neutral', 100);
    }
    
    return {
      sessionStartTime: this.sessionStartTime,
      emotionTimeline: this.emotionTimeline,
      isActive: this.isActive
    };
  }
  
  reset() {
    this.emotionTimeline = [];
    
    if (this.isActive) {
      this.sessionStartTime = Date.now();
      console.log("Session reset, new start time:", this.sessionStartTime);
    } else {
      this.sessionStartTime = null;
      console.log("Session reset (camera inactive)");
    }
    
    this.debugPanel.innerHTML = '';
  }
}

// Export the WebcamTracker
window.WebcamTracker = WebcamTracker;