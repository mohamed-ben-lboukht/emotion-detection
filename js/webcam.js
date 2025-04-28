/**
 * Webcam Capture Module
 * 
 * Captures video from webcam while user is typing
 * No emotion detection is performed - camera feed is for future reference only
 */

class WebcamTracker {
  constructor() {
    this.video = document.getElementById('webcam');
    this.detectionStatus = document.getElementById('detection-status');
    this.isActive = false;
    this.sessionStartTime = null;
    this.recordingTimestamp = null;
    
    // Video recording capabilities would need additional implementation
    // This is just a basic webcam access setup
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
      this.sessionStartTime = new Date().toISOString();
      this.detectionStatus.textContent = 'Camera active. Video feed available.';
      return true;
    } catch (error) {
      console.error('Error accessing webcam:', error);
      this.detectionStatus.textContent = 'Error: Could not access camera. ' + error.message;
      return false;
    }
  }
  
  startRecording() {
    if (!this.isActive) {
      console.error('Camera not active. Cannot start recording reference.');
      return false;
    }
    
    this.recordingTimestamp = new Date().toISOString();
    this.detectionStatus.textContent = 'Camera active. Recording reference.';
    return true;
    
    // Note: Actual video recording would require MediaRecorder API
    // This is a placeholder for that functionality
  }
  
  stop() {
    if (this.isActive && this.video.srcObject) {
      // Stop all video tracks
      this.video.srcObject.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
      this.isActive = false;
    }
    
    this.detectionStatus.textContent = 'Camera inactive';
  }
  
  getData() {
    return {
      sessionStartTime: this.sessionStartTime,
      recordingTimestamp: this.recordingTimestamp,
      isActive: this.isActive,
      // In a full implementation, reference to recorded video or frames would be included
    };
  }
  
  reset() {
    this.sessionStartTime = null;
    this.recordingTimestamp = null;
    if (this.isActive) {
      this.sessionStartTime = new Date().toISOString();
    }
  }
}

// Export the WebcamTracker
window.WebcamTracker = WebcamTracker;