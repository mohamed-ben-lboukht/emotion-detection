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
  }
  
  async initialize() {
    try {
      // Load face-api.js models if not already loaded
      if (!this.modelLoaded) {
        this.detectionStatus.textContent = 'Loading detection model...';
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
        await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
        this.modelLoaded = true;
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
        this.detectionStatus.textContent = 'Caméra non accessible ou refusée. Mode sans caméra activé.';
        this.isActive = false;
        return false;
      }

      this.video.srcObject = stream;
      this.isActive = true;
      this.sessionStartTime = new Date().toISOString();
      this.detectionStatus.textContent = 'Camera active. Detecting emotions...';
      this.startEmotionDetection();
      return true;
    } catch (error) {
      this.detectionStatus.textContent = 'Erreur inattendue. Mode sans caméra activé.';
      this.isActive = false;
      return false;
    }
  }
  
  startEmotionDetection() {
    if (!this.isActive) return;
    const analyze = async () => {
      if (!this.isActive) return;
      const result = await faceapi.detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
      if (result && result.expressions) {
        // Take the dominant emotion
        const sorted = Object.entries(result.expressions).sort((a, b) => b[1] - a[1]);
        const [emotion, score] = sorted[0];
        this.emotionTimeline.push({
          timestamp: Date.now() - new Date(this.sessionStartTime).getTime(),
          emotion,
          score: Math.round(score * 100)
        });
        this.detectionStatus.textContent = `Detected emotion: ${emotion} (${Math.round(score * 100)}%)`;
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
  }
}

// Export the WebcamTracker
window.WebcamTracker = WebcamTracker;