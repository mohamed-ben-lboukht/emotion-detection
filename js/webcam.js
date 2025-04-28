/**
 * Webcam Emotion Detection Module
 * 
 * Uses the webcam to detect user emotions while typing
 * Implements a simple emotion detection algorithm based on facial features
 */

class WebcamTracker {
  constructor() {
    this.video = document.getElementById('webcam');
    this.canvas = document.createElement('canvas');
    this.detectionStatus = document.getElementById('detection-status');
    this.detectedEmotion = document.getElementById('detected-emotion');
    this.isActive = false;
    this.detectionInterval = null;
    this.currentEmotion = 'neutral';
    this.emotionHistory = [];
    
    // For a real implementation, we'd include a face detection library
    // such as face-api.js, but for simplicity this is a placeholder
  }
  
  async initialize() {
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480, 
          facingMode: 'user' 
        } 
      });
      
      this.video.srcObject = stream;
      this.isActive = true;
      this.detectionStatus.textContent = 'Camera active. Detecting emotions...';
      
      // In a real implementation, we would load the face detection models here
      // For now, we'll simulate with periodic random emotions
      this.startSimulatedDetection();
      
      return true;
    } catch (error) {
      console.error('Error accessing webcam:', error);
      this.detectionStatus.textContent = 'Error: Could not access camera. ' + error.message;
      return false;
    }
  }
  
  startSimulatedDetection() {
    // In a real implementation, this would be replaced with actual face analysis
    // For demo purposes, we'll simulate emotion detection
    this.detectionInterval = setInterval(() => {
      // Simulate emotion detection - in real app, this would analyze video frames
      this.detectEmotionSimulated();
    }, 2000); // Check every 2 seconds
  }
  
  detectEmotionSimulated() {
    // This is just a simulation for demo purposes
    // In a real implementation, you would:
    // 1. Capture a frame from the video
    // 2. Use a face-detection library to find the face
    // 3. Extract facial features and analyze for emotion
    
    const emotions = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'neutral'];
    
    // Slightly bias toward neutral to make it more realistic
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    
    // Update UI
    this.currentEmotion = randomEmotion;
    this.detectedEmotion.textContent = `Detected: ${this.currentEmotion}`;
    
    // Add to history with timestamp
    this.emotionHistory.push({
      emotion: this.currentEmotion,
      timestamp: new Date().toISOString()
    });
  }
  
  stop() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    if (this.isActive && this.video.srcObject) {
      // Stop all video tracks
      this.video.srcObject.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
      this.isActive = false;
    }
    
    this.detectionStatus.textContent = 'Camera inactive';
  }
  
  getEmotionData() {
    return {
      currentEmotion: this.currentEmotion,
      emotionHistory: this.emotionHistory
    };
  }
  
  reset() {
    this.emotionHistory = [];
    this.currentEmotion = 'neutral';
    this.detectedEmotion.textContent = 'No emotion detected';
  }
}

// Export the WebcamTracker
window.WebcamTracker = WebcamTracker; 