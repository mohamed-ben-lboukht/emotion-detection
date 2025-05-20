/**
 * Webcam Capture Module
 * 
 * Captures video from webcam while user is typing
 * Adds real-time facial emotion detection using face-api.js
 */

class WebcamTracker {
  constructor() {
    this.video = null;
    this.canvas = null;
    this.isTracking = false;
    this.emotionsHandler = new EmotionsHandler();
    this.detectionInterval = null;
  }

  async initialize() {
    try {
      this.video = document.getElementById('webcam');
      this.canvas = document.createElement('canvas');
      
      if (!this.video) {
        throw new Error('Video element not found');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.video.srcObject = stream;
      
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          resolve();
        };
      });

      this.startTracking();
    } catch (error) {
      console.error('Error initializing webcam:', error);
      alert('Could not access webcam. Please make sure you have granted camera permissions.');
    }
  }

  startTracking() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.detectionInterval = setInterval(async () => {
      if (!this.video || !this.video.srcObject) return;

      try {
        const detections = await faceapi.detectAllFaces(
          this.video,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceExpressions();

        if (detections.length > 0) {
          const expressions = detections[0].expressions;
          this.emotionsHandler.updateFromFaceAPI(expressions);
          
          // Update UI
          const status = document.getElementById('detection-status');
          if (status) {
            status.textContent = `Detected: ${this.emotionsHandler.getDominantEmotion()[0]}`;
          }
        }
      } catch (error) {
        console.error('Error during face detection:', error);
      }
    }, 100); // Check every 100ms
  }

  stop() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    if (this.video && this.video.srcObject) {
      const tracks = this.video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.video.srcObject = null;
    }
    
    this.isTracking = false;
  }

  getData() {
    return {
      emotions: this.emotionsHandler.getData(),
      isTracking: this.isTracking
    };
  }
}

// Export the WebcamTracker
window.WebcamTracker = WebcamTracker;