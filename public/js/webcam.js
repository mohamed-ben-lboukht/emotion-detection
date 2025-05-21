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
    this.frameInterval = 300; // Reduced interval for more frequent detection
    this.frameTimer = null;
    this.useManualMode = false; // Don't force manual mode initially
    this.detectionAttempts = 0;
    this.maxDetectionAttempts = 5;
    this.lastDetectedEmotion = null;
    this.emotionSmoothingBuffer = []; // Pour lisser les détections
    this.bufferSize = 3; // Taille du buffer de lissage
    
    // Create debug panel for emotion scores
    this.debugPanel = document.createElement('div');
    this.debugPanel.className = 'emotion-debug-panel';
    this.debugPanel.style.cssText = 'background-color: rgba(0,0,0,0.7); color: white; padding: 10px; margin-top: 10px; border-radius: 5px; font-family: monospace; max-width: 400px;';
    
    // Insert debug panel after detection status
    if (this.detectionStatus) {
      this.detectionStatus.parentNode.insertBefore(this.debugPanel, this.detectionStatus.nextSibling);
    }
    
    // Récupérer l'indicateur visuel
    this.detectionIndicator = document.getElementById('detection-indicator');
    if (this.detectionIndicator) {
      this.detectionIndicator.classList.remove('active');
    }
    
    console.log("WebcamTracker initialized");
  }
  
  async initialize() {
    try {
      console.log("Initializing WebcamTracker");
      
      // Récupérer l'indicateur visuel
      this.detectionIndicator = document.getElementById('detection-indicator');
      if (this.detectionIndicator) {
        this.detectionIndicator.classList.remove('active');
      }
      
      // Activons d'abord la caméra sans se préoccuper des modèles
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.detectionStatus.textContent = 'Votre navigateur ne supporte pas l\'accès à la caméra. Mode sans caméra activé.';
        this.isActive = false;
        return false;
      }

      this.detectionStatus.textContent = 'Demande d\'accès à la caméra...';
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          } 
        });
      } catch (error) {
        console.error("Camera access error:", error);
        this.detectionStatus.textContent = 'Caméra non accessible ou refusée. Mode sans caméra activé.';
        this.isActive = false;
        return false;
      }

      this.video.srcObject = stream;
      this.video.width = 400;
      this.video.height = 300;
      this.video.style.display = 'block'; // Ensure video is visible
      this.isActive = true;
      this.emotionTimeline = [];
      this.sessionStartTime = Date.now();
      
      // Setup manual emotion buttons first so they're always available
      this.setupManualEmotionButtons();
      
      // Attendre que la vidéo soit prête avant de continuer
      await new Promise((resolve) => {
        const videoReadyCheck = () => {
          if (this.video.readyState >= 2) {
            resolve();
        } else {
            setTimeout(videoReadyCheck, 100);
          }
        };
        
        this.video.onloadeddata = () => {
          console.log("Video loaded and ready");
          resolve();
        };
        
        // Start checking immediately
        videoReadyCheck();
        
        // Also resolve after timeout in case event doesn't fire
        setTimeout(resolve, 2000);
      });
      
      // Once video is ready, try to load models
      const modelsLoaded = await this.tryLoadModels();
      
      // Immédiatement démarrer la vidéo
      try {
        await this.video.play();
        console.log("Video playback started");
        
        // Activer l'indicateur une fois que la vidéo est en cours de lecture
        if (this.detectionIndicator) {
          this.detectionIndicator.style.backgroundColor = '#FFC107'; // Jaune pendant l'initialisation
        }
      } catch (playError) {
        console.error("Error starting video playback:", playError);
      }
      
      this.detectionStatus.textContent = 'Caméra active! Initialisation de la détection d\'émotions...';
      
      // Start detection immediately
      setTimeout(() => {
        this.startEmotionDetection();
        
        // After a few seconds, check if detection is working
        setTimeout(() => {
          if (this.emotionTimeline.length === 0) {
            console.log("No emotions detected after delay, enabling manual mode");
            this.useManualMode = true;
            this.detectionStatus.textContent = 'Mode manuel activé - utilisez les boutons ci-dessous';
            this.debugPanel.innerHTML = '<div>Mode manuel activé - utilisez les boutons ci-dessous</div>';
            
            // Update indicator
            if (this.detectionIndicator) {
              this.detectionIndicator.style.backgroundColor = '#F44336'; // Rouge = mode manuel
            }
            
            // Highlight pour attirer l'attention sur les boutons manuels
            document.getElementById('manual-emotions').style.animation = 'pulse 2s infinite';
            document.getElementById('manual-emotions').style.display = 'block';
            
            // Ajouter un style pour l'animation
            if (!document.getElementById('pulse-animation-style')) {
              const style = document.createElement('style');
              style.id = 'pulse-animation-style';
              style.textContent = `
                @keyframes pulse {
                  0% { box-shadow: 0 0 0 0 rgba(67, 97, 238, 0.7); }
                  70% { box-shadow: 0 0 0 10px rgba(67, 97, 238, 0); }
                  100% { box-shadow: 0 0 0 0 rgba(67, 97, 238, 0); }
                }
              `;
              document.head.appendChild(style);
            }
          }
        }, 4000);
      }, 500);
      
      return true;
    } catch (error) {
      console.error("Unexpected error in WebcamTracker.initialize():", error);
      this.detectionStatus.textContent = 'Erreur inattendue. Mode sans caméra activé.';
      this.isActive = false;
      return false;
    }
  }
  
  async tryLoadModels() {
    // Ne pas bloquer l'initialisation avec le chargement des modèles
    try {
      // Tentative de vérification que face-api est chargé
      if (typeof faceapi === 'undefined') {
        console.error("ERREUR: face-api.js n'est pas disponible!");
        this.detectionStatus.textContent = 'Erreur: face-api.js non disponible. Utilisez les boutons manuels.';
        return false;
      }
      
      this.detectionStatus.textContent = 'Chargement des modèles de détection...';
      
      // First try using the faceDetectionUtils helper from the loaded script
      if (typeof window.faceDetectionUtils !== 'undefined') {
        try {
          console.log("Attempting to load models via faceDetectionUtils");
          const modelLoadSuccess = await window.faceDetectionUtils.loadModelsManually();
          
          if (modelLoadSuccess) {
            this.modelLoaded = true;
            console.log("Face detection models loaded via utils");
            this.detectionStatus.textContent = 'Modèles de détection chargés avec succès!';
            return true;
          } else {
            console.warn("faceDetectionUtils failed to load models");
          }
        } catch (error) {
          console.error("Error loading models via utils:", error);
        }
      }
      
      // Fallback to direct loading if utils failed or aren't available
      if (!this.modelLoaded) {
        try {
          const modelPath = window.location.origin + '/models/weights';
          console.log("Trying direct model loading from:", modelPath);
          
          // First verify the models exist by fetching the manifest files
          try {
            const tiny_manifest_response = await fetch(`${modelPath}/tiny_face_detector_model-weights_manifest.json`);
            const expression_manifest_response = await fetch(`${modelPath}/face_expression_model-weights_manifest.json`);
            
            if (!tiny_manifest_response.ok || !expression_manifest_response.ok) {
              console.error("Model manifest files not accessible");
              this.detectionStatus.textContent = 'Erreur: Fichiers modèles inaccessibles. Utilisez les boutons manuels.';
              return false;
            }
            
            console.log("Model manifest files are accessible");
          } catch (fetchError) {
            console.error("Error fetching model files:", fetchError);
            this.detectionStatus.textContent = 'Erreur: Impossible d\'accéder aux fichiers modèles.';
            return false;
          }
          
          // Dispose of any previously loaded models to avoid conflicts
          if (faceapi.nets.tinyFaceDetector.isLoaded) {
            await faceapi.nets.tinyFaceDetector.dispose();
          }
          if (faceapi.nets.faceExpressionNet.isLoaded) {
            await faceapi.nets.faceExpressionNet.dispose();
          }
          
          // Try multiple loading methods for redundancy
          try {
            // First method - load with direct path
            await faceapi.nets.tinyFaceDetector.load(modelPath);
            await faceapi.nets.faceExpressionNet.load(modelPath);
            
            if (faceapi.nets.tinyFaceDetector.isLoaded && faceapi.nets.faceExpressionNet.isLoaded) {
              this.modelLoaded = true;
              console.log("Models loaded via direct loading");
              this.detectionStatus.textContent = 'Modèles chargés avec succès!';
              return true;
            }
          } catch (directLoadError) {
            console.error("Error with direct model loading:", directLoadError);
            
            // Try alternate loading method
            try {
              await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
              await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
              
              if (faceapi.nets.tinyFaceDetector.isLoaded && faceapi.nets.faceExpressionNet.isLoaded) {
                this.modelLoaded = true;
                console.log("Models loaded via URI method");
                this.detectionStatus.textContent = 'Modèles chargés avec méthode alternative!';
                return true;
              }
            } catch (uriLoadError) {
              console.error("Error with URI model loading:", uriLoadError);
            }
          }
        } catch (directError) {
          console.error("Error in direct model loading:", directError);
        }
      }
      
      // Si nous arrivons ici, aucune méthode n'a fonctionné
      console.error("All model loading methods failed");
      this.detectionStatus.textContent = 'Impossible de charger les modèles. Utilisez les boutons manuels.';
      return false;
    } catch (error) {
      console.error("Error in tryLoadModels:", error);
      return false;
    }
  }
  
  formatEmotionScores(expressions) {
    if (!expressions) return '<div>No expressions detected</div>';
    
    const sortedEmotions = Object.entries(expressions)
      .sort((a, b) => b[1] - a[1]);
    
    // Afficher seulement les 3 émotions principales pour gagner de l'espace
    const topEmotions = sortedEmotions.slice(0, 3);
    
    // Style plus compact
    return `
      <div style="display: flex; flex-wrap: wrap; gap: 4px;">
        ${topEmotions.map(([emotion, score]) => {
      const percentage = Math.round(score * 100);
      return `
            <div style="flex: 0 0 30%; min-width: 70px;">
              <div style="font-size: 11px; display: flex; justify-content: space-between;">
            <span>${emotion}</span>
            <span>${percentage}%</span>
          </div>
              <div style="background-color: #444; height: 6px; border-radius: 3px;">
                <div style="background-color: ${this.getEmotionColor(emotion)}; width: ${percentage}%; height: 100%; border-radius: 3px;"></div>
          </div>
        </div>
      `;
        }).join('')}
      </div>
    `;
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
  
  // Nouvelle méthode pour lisser les émotions et éviter les fluctuations
  smoothEmotion(newEmotion, newScore) {
    // Ajouter la nouvelle émotion au buffer
    this.emotionSmoothingBuffer.push({ emotion: newEmotion, score: newScore });
    
    // Limiter la taille du buffer
    if (this.emotionSmoothingBuffer.length > this.bufferSize) {
      this.emotionSmoothingBuffer.shift();
    }
    
    // Si le buffer n'est pas encore plein, renvoyer la nouvelle émotion
    if (this.emotionSmoothingBuffer.length < this.bufferSize) {
      return { emotion: newEmotion, score: newScore };
    }
    
    // Compter les occurrences de chaque émotion dans le buffer
    const emotionCounts = {};
    this.emotionSmoothingBuffer.forEach(item => {
      emotionCounts[item.emotion] = (emotionCounts[item.emotion] || 0) + 1;
    });
    
    // Trouver l'émotion la plus fréquente
    let maxCount = 0;
    let dominantEmotion = newEmotion;
    
    for (const [emotion, count] of Object.entries(emotionCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    }
    
    // Calculer le score moyen pour cette émotion
    const scoreSum = this.emotionSmoothingBuffer
      .filter(item => item.emotion === dominantEmotion)
      .reduce((sum, item) => sum + item.score, 0);
    
    const avgScore = scoreSum / emotionCounts[dominantEmotion];
    
    return { emotion: dominantEmotion, score: avgScore };
  }
  
  startEmotionDetection() {
    // Si le mode manuel est forcé, ne pas lancer la détection
    if (this.useManualMode) {
      this.detectionStatus.textContent = 'Mode manuel activé - utilisez les boutons ci-dessous';
      
      // Update indicator
      if (this.detectionIndicator) {
        this.detectionIndicator.style.backgroundColor = '#F44336'; // Rouge = mode manuel
      }
      
      return;
    }
    
    if (!this.isActive) {
      this.detectionStatus.textContent = 'La caméra n\'est pas active.';
      return;
    }
    
    if (!this.modelLoaded) {
      this.detectionStatus.textContent = 'Les modèles de détection ne sont pas chargés.';
      this.tryLoadModels().then(success => {
        if (success) {
      setTimeout(() => this.startEmotionDetection(), 500);
        } else {
          this.useManualMode = true;
          this.detectionStatus.textContent = 'Impossible de charger les modèles. Mode manuel activé.';
          
          // Update indicator
          if (this.detectionIndicator) {
            this.detectionIndicator.style.backgroundColor = '#F44336'; // Rouge = mode manuel
          }
        }
      });
      return;
    }
    
    // Check if video is ready and playing
    if (this.video.paused || this.video.ended || !this.video.readyState) {
      console.log("Video not ready for detection, readyState:", this.video.readyState);
      this.detectionStatus.textContent = 'La vidéo n\'est pas prête. Tentative dans 1 seconde...';
      setTimeout(() => this.startEmotionDetection(), 1000);
      return;
    }
    
    console.log("Starting emotion detection loop");
    this.detectionStatus.textContent = 'Détection d\'émotions en cours...';
    
    // Clear any existing timer
    if (this.frameTimer) {
      clearTimeout(this.frameTimer);
    }
    
    let failureCount = 0;
    const MAX_FAILURES = 5;
    
    // Masquer la section manuelle puisque la détection automatique commence
    const manualSection = document.getElementById('manual-emotions');
    if (manualSection) {
      manualSection.style.display = 'none';
    }
    
    const analyze = async () => {
      if (!this.isActive) {
        console.log("Detection stopped - camera inactive");
        return;
      }
      
      try {
        // First verify faceapi is still available
        if (typeof faceapi === 'undefined') {
          throw new Error("face-api is no longer available");
        }
        
        // Very permissive detection options for better success rate
        const options = new faceapi.TinyFaceDetectorOptions({ 
          scoreThreshold: 0.05, // Reduced threshold even more for easier detection
          inputSize: 128 // Smaller input size for better performance
        });
        
        try {
          // First just try to detect a face without expressions
          let faceDetection = null;
          try {
            faceDetection = await faceapi.detectSingleFace(this.video, options);
          } catch (faceDetectError) {
            console.error("Error in basic face detection:", faceDetectError);
          }
          
          if (!faceDetection) {
            this.detectionAttempts++;
            console.log(`No face detected (attempt ${this.detectionAttempts}/${this.maxDetectionAttempts})`);
            
            // Update indicator
            if (this.detectionIndicator) {
              this.detectionIndicator.style.backgroundColor = '#FFC107'; // Jaune = en attente
            }
            
            if (this.detectionAttempts >= this.maxDetectionAttempts) {
              // Switch to manual mode after too many failures
              this.useManualMode = true;
              this.debugPanel.innerHTML = '<div>Aucun visage détecté après plusieurs tentatives. Mode manuel activé.</div>';
              this.detectionStatus.textContent = 'Mode manuel activé - utilisez les boutons ci-dessous';
              
              // Update indicator to red
              if (this.detectionIndicator) {
                this.detectionIndicator.style.backgroundColor = '#F44336'; // Rouge = mode manuel
              }
              
              // Afficher la section manuelle en cas d'échec
              if (manualSection) {
                manualSection.style.display = 'block';
                manualSection.style.animation = 'pulse 2s infinite';
              }
              return;
            }
            
            this.debugPanel.innerHTML = '<div>Aucun visage détecté. Regardez directement la caméra.</div>';
            this.detectionStatus.textContent = 'Ajustez votre position face à la caméra.';
          this.frameTimer = setTimeout(analyze, this.frameInterval);
          return;
        }
        
          // Reset attempts counter since we found a face
          this.detectionAttempts = 0;
          console.log("Face detected with score:", faceDetection.score);
          
          // Add visual feedback when face is detected
          this.video.style.border = "3px solid #4CAF50";
          setTimeout(() => {
            this.video.style.border = "";
          }, 500);
          
          // Update indicator to green since face is detected
          if (this.detectionIndicator) {
            this.detectionIndicator.classList.add('active');
            this.detectionIndicator.style.backgroundColor = '#4CAF50'; // Vert = détection active
          }
          
          // Show face detected message even if no emotions
          this.detectionStatus.textContent = 'Visage détecté! Analyse des émotions...';
          
          // Try to get expressions
          let fullDetection = null;
          try {
            fullDetection = await faceapi.detectSingleFace(this.video, options)
              .withFaceExpressions();
          } catch (expressionError) {
            console.error("Error getting expressions:", expressionError);
            this.debugPanel.innerHTML = '<div>Visage détecté mais erreur lors de l\'analyse des émotions.</div>';
            this.detectionStatus.textContent = 'Visage détecté, erreur lors de l\'analyse des émotions.';
          this.frameTimer = setTimeout(analyze, this.frameInterval);
          return;
        }
          
          if (fullDetection && fullDetection.expressions) {
            console.log("Got expressions:", fullDetection.expressions);
            
            // Update debug panel with emotion scores
            this.debugPanel.innerHTML = `${this.formatEmotionScores(fullDetection.expressions)}`;
            
            // Find dominant emotion
            const sorted = Object.entries(fullDetection.expressions)
              .sort((a, b) => b[1] - a[1]);
            
          const [emotion, score] = sorted[0];
          
            // Use an extremely low threshold for better sensitivity
            if (score > 0.005) { // Extremely low threshold to detect any emotion
              // Appliquer le lissage d'émotion pour éviter les fluctuations
              const smoothed = this.smoothEmotion(emotion, Math.round(score * 100));
              
            const entry = {
              timestamp: Date.now() - this.sessionStartTime,
                emotion: smoothed.emotion,
                score: smoothed.score,
              allEmotions: Object.fromEntries(
                  Object.entries(fullDetection.expressions).map(([e, s]) => [e, Math.round(s * 100)])
                )
              };
              
              // Seulement ajouter à la timeline si l'émotion a changé ou si le score a changé significativement
              if (!this.lastDetectedEmotion || 
                  this.lastDetectedEmotion.emotion !== smoothed.emotion || 
                  Math.abs(this.lastDetectedEmotion.score - smoothed.score) > 5) {
                
            this.emotionTimeline.push(entry);
                this.lastDetectedEmotion = smoothed;
                
                // Animation fluide de changement d'émotion
                this.detectionStatus.style.transition = 'opacity 0.3s';
                this.detectionStatus.style.opacity = '0';
                
                setTimeout(() => {
                  this.detectionStatus.textContent = `Émotion détectée: ${smoothed.emotion} (${smoothed.score}%)`;
                  this.detectionStatus.style.opacity = '1';
                }, 300);
              }
              
              // Masquer définitivement la section manuelle puisque l'automatique fonctionne
              if (manualSection) {
                manualSection.style.display = 'none';
              }
              
              // Reset failure count on success
              failureCount = 0;
            } else {
              this.detectionStatus.textContent = 'Émotion détectée mais confiance faible. Regardez la caméra.';
            }
          } else {
            console.log("Face found but no expressions");
            this.debugPanel.innerHTML = '<div>Visage détecté mais pas d\'émotions identifiées</div>';
            this.detectionStatus.textContent = 'Visage détecté, mais expressions non identifiées.';
          }
        } catch (detectionError) {
          failureCount++;
          console.error("Error during face/emotion detection:", detectionError);
          
          if (failureCount >= MAX_FAILURES) {
            console.error("Maximum failures reached, switching to manual mode");
            this.useManualMode = true;
            this.detectionStatus.textContent = 'Erreurs répétées de détection. Utilisez les boutons manuels.';
            // Afficher la section manuelle en cas d'échec
            if (manualSection) {
              manualSection.style.display = 'block';
              manualSection.style.animation = 'pulse 2s infinite';
            }
            return;
          }
          
          this.debugPanel.innerHTML = `<div>Erreur de détection (${failureCount}/${MAX_FAILURES}): ${detectionError.message}</div>`;
          this.detectionStatus.textContent = 'Erreur de détection, nouvelle tentative...';
        }
      } catch (error) {
        failureCount++;
        console.error("General analysis error:", error);
        
        if (failureCount >= MAX_FAILURES) {
          console.error("Maximum general failures reached, switching to manual mode");
          this.useManualMode = true;
          this.detectionStatus.textContent = 'Erreurs répétées. Utilisez les boutons manuels.';
          document.getElementById('manual-emotions').style.animation = 'pulse 2s infinite';
          return;
        }
        
        this.detectionStatus.textContent = `Erreur d'analyse (${failureCount}/${MAX_FAILURES}). Réessai...`;
        this.debugPanel.innerHTML = `<div>Erreur: ${error.message}</div>`;
      }
      
      // Schedule next frame analysis
      this.frameTimer = setTimeout(analyze, this.frameInterval);
    };
    
    // Start the detection loop
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
    this.detectionStatus.textContent = `Émotion définie manuellement: ${emotionName} (${score}%)`;
    
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
  
  // Set up manual emotion buttons
  setupManualEmotionButtons() {
    const emotionButtons = document.querySelectorAll('.emotion-btn');
    const statusElement = document.getElementById('manual-emotion-status');
    
    if (emotionButtons) {
      emotionButtons.forEach(button => {
        button.addEventListener('click', () => {
          const emotion = button.getAttribute('data-emotion');
          if (emotion) {
            const entry = this.forceEmotion(emotion);
            console.log("Manual emotion set:", entry);
            
            // Update the status text
            if (statusElement) {
              const emotionName = emotion.charAt(0).toUpperCase() + emotion.slice(1);
              statusElement.textContent = `Émotion sélectionnée : ${emotionName}`;
              statusElement.style.color = this.getEmotionColor(emotion);
            }
            
            // Highlight selected button
            emotionButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            
            // Also update the detection status
            if (this.detectionStatus) {
              this.detectionStatus.textContent = `Émotion définie manuellement : ${emotion}`;
            }
          }
        });
      });
      console.log("Manual emotion buttons initialized");
    }
  }
}

// Export the WebcamTracker
window.WebcamTracker = WebcamTracker;

// Webcam initialization and handling
document.addEventListener('DOMContentLoaded', function() {
  // Only initialize when webcam section is shown
  document.getElementById('webcam-option').addEventListener('click', function() {
    initWebcam();
  });

  function initWebcam() {
    const video = document.getElementById('webcam');
    const statusEl = document.getElementById('detection-status');
    
    if (!video || !statusEl) return;
    
    // Check if we're already initialized
    if (video.srcObject) {
      console.log('Webcam already initialized');
      return;
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      statusEl.textContent = 'Camera access not supported in your browser. Please use manual mode.';
      statusEl.style.color = '#F44336';
      showManualEmotionControls();
      return;
    }
    
    // Start camera with error handling
    navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    })
    .then(stream => {
      // Connect the camera stream to video element
      video.srcObject = stream;
      statusEl.textContent = 'Camera connected. Initializing face detection...';
      
      // When video is playing, initialize face detection
      video.addEventListener('play', function() {
        // Initialize face detection once video is playing
        FaceDetectionService.initFaceDetection()
          .then(success => {
            if (success) {
              FaceDetectionService.startDetection(video);
            } else {
              showManualEmotionControls();
            }
          })
          .catch(error => {
            console.error('Error initializing face detection:', error);
            statusEl.textContent = 'Face detection error. Please use manual mode.';
            showManualEmotionControls();
          });
      });
    })
    .catch(error => {
      console.error('Error accessing the camera:', error);
      let errorMessage = 'Camera access denied or camera not available.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera access and reload the page.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera detected. Please connect a camera and reload the page.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application. Please close other camera apps.';
      }
      
      statusEl.textContent = errorMessage;
      statusEl.style.color = '#F44336';
      showManualEmotionControls();
    });
  }
  
  function showManualEmotionControls() {
    const manualControls = document.getElementById('manual-emotions');
    if (manualControls) {
      manualControls.style.display = 'block';
      manualControls.style.padding = '20px';
      manualControls.style.background = '#f8f9fa';
      manualControls.style.border = '1px solid #dee2e6';
      manualControls.style.borderRadius = '8px';
      manualControls.style.marginTop = '20px';
      manualControls.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    }
  }
  
  // Back button should stop webcam
  document.querySelectorAll('.back-button').forEach(button => {
    button.addEventListener('click', function() {
      const video = document.getElementById('webcam');
      if (video && video.srcObject) {
        // Stop all video tracks
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
      }
      
      // Stop face detection if active
      if (window.FaceDetectionService) {
        window.FaceDetectionService.stopDetection();
      }
    });
  });
});