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
          if (typeof faceapi === 'undefined') {
            throw new Error("face-api is not loaded");
          }
          
          // Test direct d'accès aux fichiers modèles (debug)
          const testManifest = await fetch('/models/face-api-models/face_expression_model-weights_manifest.json');
          if (!testManifest.ok) {
            this.detectionStatus.textContent = 'Erreur accès modèle: ' + testManifest.status;
            return false;
          }
          const testBin = await fetch('/models/face-api-models/face_expression_model-shard1.bin');
          if (!testBin.ok) {
            this.detectionStatus.textContent = 'Erreur accès modèle binaire: ' + testBin.status;
            return false;
          }
          
          // Forcer le chemin relatif (sans window.location.origin)
          const modelPath = '/models/face-api-models';
          
          const loadWithTimeout = async (loadPromise, timeout, modelName) => {
            let timer;
            const timeoutPromise = new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error(`Loading ${modelName} timed out after ${timeout}ms`)), timeout);
            });
            
            try {
              await Promise.race([loadPromise, timeoutPromise]);
              clearTimeout(timer);
              return true;
            } catch (error) {
              this.detectionStatus.textContent = `Erreur chargement modèle ${modelName}: ${error.message}`;
              return false;
            }
          };
          
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
          } else {
            this.detectionStatus.textContent = 'Erreur chargement modèles face-api.';
            this.modelLoaded = false;
            return false;
          }
        } catch (modelError) {
          this.detectionStatus.textContent = 'Erreur JS chargement modèle: ' + modelError.message;
          this.modelLoaded = false;
          return false;
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
        this.detectionStatus.textContent = 'Caméra non accessible ou refusée. Mode sans caméra activé.';
        this.isActive = false;
        return false;
      }

      this.video.srcObject = stream;
      this.video.width = 320;
      this.video.height = 240;
      this.isActive = true;
      this.emotionTimeline = [];
      this.sessionStartTime = Date.now();
      // Correction : attendre que la vidéo soit vraiment en train de jouer avant de lancer la détection
      this.video.onplaying = () => {
        if (this.modelLoaded) {
          this.detectionStatus.textContent = 'Camera active. Detecting emotions...';
          this.startEmotionDetection();
        } else {
          this.detectionStatus.textContent = 'Camera active. Emotion detection disabled.';
        }
      };
      // Forcer le démarrage de la vidéo
      this.video.play();
      return true;
    } catch (error) {
      this.detectionStatus.textContent = 'Erreur inattendue. Mode sans caméra activé.';
      this.isActive = false;
      return false;
    }
  }
  
  formatEmotionScores(expressions) {
    if (!expressions) return '<div>No expressions detected</div>';
    
    const sortedEmotions = Object.entries(expressions)
      .sort((a, b) => b[1] - a[1]);
    
    return sortedEmotions.map(([emotion, score]) => {
      const percentage = Math.round(score * 100);
      const barWidth = Math.max(1, percentage);
      
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
  
  getEmotionColor(emotion) {
    const colors = {
      happy: '#4CAF50',
      sad: '#2196F3',
      angry: '#F44336',
      fearful: '#9C27B0',
      disgusted: '#795548',
      surprised: '#FF9800',
      neutral: '#9E9E9E'
    };
    return colors[emotion] || '#FFFFFF';
  }
  
  startEmotionDetection() {
    if (!this.isActive || !this.modelLoaded) {
      this.detectionStatus.textContent = 'Modèles non chargés ou caméra inactive.';
      return;
    }
    // Correction : attendre que la vidéo soit vraiment playing
    if (this.video.paused || this.video.ended || this.video.readyState < 2) {
      this.detectionStatus.textContent = 'La vidéo de la caméra n\'est pas active.';
      setTimeout(() => this.startEmotionDetection(), 500);
      return;
    }
    
    const analyze = async () => {
      if (!this.isActive) {
        return;
      }
      
      try {
        if (this.video.readyState !== 4) {
          this.detectionStatus.textContent = 'Vidéo non prête pour la détection.';
          this.frameTimer = setTimeout(analyze, this.frameInterval);
          return;
        }
        
        // Correction : vérifier que detectSingleFace retourne bien un visage avant d'appeler withFaceExpressions
        const faceDetection = await faceapi.detectSingleFace(
          this.video, 
          new faceapi.TinyFaceDetectorOptions()
        );
        if (!faceDetection) {
          this.debugPanel.innerHTML = '<div>Aucun visage détecté</div>';
          this.detectionStatus.textContent = 'Caméra active. Aucun visage détecté.';
          this.frameTimer = setTimeout(analyze, this.frameInterval);
          return;
        }
        // Si un visage est détecté, on peut alors demander les expressions
        const result = await faceapi.detectSingleFace(
          this.video, 
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceExpressions();
        
        if (result && result.expressions) {
          this.debugPanel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">Emotion Scores:</div>
            ${this.formatEmotionScores(result.expressions)}
          `;
          
          const sorted = Object.entries(result.expressions).sort((a, b) => b[1] - a[1]);
          const [emotion, score] = sorted[0];
          
          if (score > 0.2) {
            const entry = {
              timestamp: Date.now() - this.sessionStartTime,
              emotion,
              score: Math.round(score * 100),
              allEmotions: Object.fromEntries(
                Object.entries(result.expressions).map(([e, s]) => [e, Math.round(s * 100)])
              )
            };
            this.emotionTimeline.push(entry);
            this.detectionStatus.textContent = `Detected emotion: ${emotion} (${Math.round(score * 100)}%)`;
          } else {
            this.detectionStatus.textContent = 'Emotion confidence too low. Veuillez bien faire face à la caméra.';
          }
        } else {
          this.debugPanel.innerHTML = '<div>Aucun visage détecté</div>';
          this.detectionStatus.textContent = 'Caméra active. Aucun visage détecté.';
        }
      } catch (error) {
        this.detectionStatus.textContent = 'Erreur JS détection émotion: ' + error.message;
        this.debugPanel.innerHTML = `<div>Erreur : ${error.message}</div>`;
      }
      
      this.frameTimer = setTimeout(analyze, this.frameInterval);
    };
    
    analyze();
  }
  
  stop() {
    if (this.isActive && this.video.srcObject) {
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
  
  forceEmotion(emotionName = 'neutral', score = 100) {
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
  
  hasDetectedEmotions() {
    return this.emotionTimeline && this.emotionTimeline.length > 0;
  }
  
  getData() {
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
    } else {
      this.sessionStartTime = null;
    }
    
    this.debugPanel.innerHTML = '';
  }
}

// Export the WebcamTracker
window.WebcamTracker = WebcamTracker;