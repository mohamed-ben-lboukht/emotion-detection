/**
 * Face Detection Module
 * 
 * This module initializes face detection models and provides utility functions
 * for emotion detection in the application.
 */

(function() {
  console.log("FaceDetection module loaded");
  
  // Path to face detection models
  const MODEL_PATH = window.location.origin + '/models/face-api-models';
  
  // Check if face-api.js is loaded
  if (typeof faceapi === 'undefined') {
    console.error("Error: face-api.js is not loaded");
    return;
  }
  
  // Create a loader for models with timeout
  const loadModelWithTimeout = async (loadPromise, timeout, modelName) => {
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
  
  // Preload face detection models
  const loadModels = async () => {
    try {
      console.log("Preloading face detection models from", MODEL_PATH);
      
      try {
        // First try to fetch the manifest to check if it's accessible
        const tinyFaceResponse = await fetch(`${MODEL_PATH}/tiny_face_detector_model-weights_manifest.json`);
        const expressionResponse = await fetch(`${MODEL_PATH}/face_expression_model-weights_manifest.json`);
        
        if (!tinyFaceResponse.ok || !expressionResponse.ok) {
          console.error("Model manifest files are not accessible");
          console.error("TinyFace response:", tinyFaceResponse.status);
          console.error("Expression response:", expressionResponse.status);
          document.dispatchEvent(new CustomEvent('faceDetectionModelsError', { 
            detail: { error: "Model manifest files not accessible" } 
          }));
          return false;
        }
        2
        const tinyFaceBinResponse = await fetch(`${MODEL_PATH}/tiny_face_detector_model-shard1.bin`);
        const expressionBinResponse = await fetch(`${MODEL_PATH}/face_expression_model-shard1.bin`);
        
        if (!tinyFaceBinResponse.ok || !expressionBinResponse.ok) {
          console.error("Model binary files are not accessible");
          console.error("TinyFace bin response:", tinyFaceBinResponse.status);
          console.error("Expression bin response:", expressionBinResponse.status);
          document.dispatchEvent(new CustomEvent('faceDetectionModelsError', { 
            detail: { error: "Model binary files not accessible" } 
          }));
          return false;
        }
        
        console.log("All model files are accessible");
      } catch (fetchError) {
        console.error("Error fetching model files:", fetchError);
        document.dispatchEvent(new CustomEvent('faceDetectionModelsError', { 
          detail: { error: fetchError.message } 
        }));
        return false;
      }
      
      // Always force unload existing models to ensure clean loading
      try {
        console.log("Disposing existing models if loaded");
        if (faceapi.nets.tinyFaceDetector.isLoaded) {
          faceapi.nets.tinyFaceDetector.dispose();
        }
        
        if (faceapi.nets.faceExpressionNet.isLoaded) {
          faceapi.nets.faceExpressionNet.dispose();
        }
      } catch (disposeError) {
        console.error("Error disposing models:", disposeError);
        // Continue anyway, don't return
      }
      
      // Set explicit weights path
      const tinyFaceDetectorPath = `${MODEL_PATH}/tiny_face_detector_model`;
      const faceExpressionPath = `${MODEL_PATH}/face_expression_model`;
      
      console.log("Loading face detection models with explicit paths:");
      console.log("- TinyFaceDetector:", tinyFaceDetectorPath);
      console.log("- FaceExpressionNet:", faceExpressionPath);
      
      try {
        // First load TinyFaceDetector
        console.log("Loading TinyFaceDetector...");
        await faceapi.nets.tinyFaceDetector.load(tinyFaceDetectorPath);
        console.log("TinyFaceDetector loaded:", faceapi.nets.tinyFaceDetector.isLoaded);
      
        // Then load FaceExpressionNet
        console.log("Loading FaceExpressionNet...");
        await faceapi.nets.faceExpressionNet.load(faceExpressionPath);
        console.log("FaceExpressionNet loaded:", faceapi.nets.faceExpressionNet.isLoaded);
        
        // Verify models are loaded
        if (faceapi.nets.tinyFaceDetector.isLoaded && faceapi.nets.faceExpressionNet.isLoaded) {
          console.log("✅ All face detection models successfully loaded and verified");
          document.dispatchEvent(new CustomEvent('faceDetectionModelsLoaded'));
          return true;
        } else {
          console.warn("❌ Models loading verification failed");
          if (!faceapi.nets.tinyFaceDetector.isLoaded) {
            console.error("TinyFaceDetector failed verification");
          }
          if (!faceapi.nets.faceExpressionNet.isLoaded) {
            console.error("FaceExpressionNet failed verification");
          }
          document.dispatchEvent(new CustomEvent('faceDetectionModelsError', {
            detail: { error: "Model loading verification failed" }
          }));
          return false;
        }
      } catch (loadError) {
        console.error("Error loading models directly:", loadError);
        
        // Try alternate loading method as fallback
        console.log("Trying alternate loading method as fallback...");
        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH);
          await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_PATH);
      
          if (faceapi.nets.tinyFaceDetector.isLoaded && faceapi.nets.faceExpressionNet.isLoaded) {
            console.log("✅ All models loaded with fallback method");
        document.dispatchEvent(new CustomEvent('faceDetectionModelsLoaded'));
            return true;
      } else {
            console.error("❌ Fallback loading failed");
            document.dispatchEvent(new CustomEvent('faceDetectionModelsError', {
              detail: { error: "Fallback loading failed" }
            }));
            return false;
          }
        } catch (fallbackError) {
          console.error("Fallback loading error:", fallbackError);
          document.dispatchEvent(new CustomEvent('faceDetectionModelsError', {
            detail: { error: fallbackError.message }
          }));
          return false;
        }
      }
    } catch (error) {
      console.error("Error during face detection model preloading:", error);
      document.dispatchEvent(new CustomEvent('faceDetectionModelsError', { 
        detail: { error: error.message } 
      }));
      return false;
    }
  };
  
  // Start loading models when document is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadModels);
  } else {
    // Document already loaded, start immediately
    loadModels();
  }

  // Expose utility functions to global scope
  window.faceDetectionUtils = {
    // Utility function to get dominant emotion from expressions
    getDominantEmotion: (expressions) => {
      if (!expressions) return null;
      
      // Find emotion with highest score
      return Object.entries(expressions)
        .sort((a, b) => b[1] - a[1])
        .shift();
    },
    
    // Utility function to map emotions to colors
    getEmotionColor: (emotion) => {
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
    },
    
    // Manual model loading method for debugging
    loadModelsManually: async () => {
      console.log("⚠️ Manually triggering model loading");
      return await loadModels();
    },
    
    // Get model loading status
    areModelsLoaded: () => {
      const tinyFaceLoaded = faceapi.nets.tinyFaceDetector.isLoaded;
      const expressionsLoaded = faceapi.nets.faceExpressionNet.isLoaded;
      console.log("Model loading status check:", {
        tinyFaceDetector: tinyFaceLoaded,
        faceExpressionNet: expressionsLoaded
      });
      return tinyFaceLoaded && expressionsLoaded;
    },
    
    // Get model path
    getModelPath: () => MODEL_PATH,
    
    // Test emotion detection on a sample image
    testEmotionDetection: async (videoElement) => {
      if (!videoElement) {
        console.error("No video element provided for testing");
        return { success: false, error: "No video element provided" };
      }
      
      console.log("Testing emotion detection on video element");
      console.log("- Model load status:", window.faceDetectionUtils.areModelsLoaded());
      console.log("- Video element readyState:", videoElement.readyState);
      
      if (videoElement.readyState < 2) {
        console.warn("Video not ready for detection test");
        return { success: false, error: "Video not ready" };
      }
      
      try {
        if (!faceapi.nets.tinyFaceDetector.isLoaded || !faceapi.nets.faceExpressionNet.isLoaded) {
          console.error("Models not loaded for test detection");
          
          // Try to load models one more time
          try {
            console.log("Attempting to load models before test");
            const loadSuccess = await loadModels();
            if (!loadSuccess) {
              return { 
                success: false, 
                error: "Failed to load models before test" 
              };
            }
          } catch (loadError) {
            return { 
              success: false, 
              error: "Error loading models: " + loadError.message 
            };
          }
        }
        
        // Try to do simple face detection first
        console.log("Attempting simple face detection");
        const faceDetection = await faceapi.detectSingleFace(
          videoElement, 
          new faceapi.TinyFaceDetectorOptions({ 
            scoreThreshold: 0.2,
            inputSize: 224
          })
        );
        
        console.log("Simple face detection result:", faceDetection);
        
        if (!faceDetection) {
          return { 
            success: false, 
            error: "No face detected in test" 
          };
        }
        
        // Now try with expressions
        console.log("Attempting detection with expressions");
        const detection = await faceapi.detectSingleFace(
          videoElement, 
          new faceapi.TinyFaceDetectorOptions({ 
            scoreThreshold: 0.2,
            inputSize: 224
          })
        ).withFaceExpressions();
        
        if (detection && detection.expressions) {
          console.log("Test detection successful:", detection);
          return { success: true, detection };
        } else {
          console.warn("Face detected but no expressions in test");
          return { 
            success: false, 
            error: "Face found but no expressions detected",
            faceDetection
          };
        }
      } catch (error) {
        console.error("Error in test emotion detection:", error);
        return { success: false, error: error.message };
      }
    },
    
    // Force unload and reload all models
    reloadModels: async () => {
      console.log("🔄 Force reloading all models");
      try {
        // Dispose current models
        if (faceapi.nets.tinyFaceDetector.isLoaded) {
          console.log("Disposing TinyFaceDetector");
          faceapi.nets.tinyFaceDetector.dispose();
        }
        
        if (faceapi.nets.faceExpressionNet.isLoaded) {
          console.log("Disposing FaceExpressionNet");
          faceapi.nets.faceExpressionNet.dispose();
        }
        
        // Load fresh
        return await loadModels();
      } catch (error) {
        console.error("Error in reloadModels:", error);
        return false;
      }
    }
  };
})(); 

// Face Detection Services
const FaceDetectionService = {
  modelLoaded: false,
  detectionActive: false,
  lastDetectionTime: 0,
  detectionInterval: 500, // Detection frequency in ms
  currentEmotion: 'neutral',
  confidenceThreshold: 0.5,
  
  initFaceDetection: async function() {
    try {
      // Update status indicator
      const statusEl = document.getElementById('detection-status');
      const indicatorEl = document.getElementById('detection-indicator');
      
      if (statusEl) statusEl.textContent = 'Loading face detection models...';
      if (indicatorEl) indicatorEl.style.backgroundColor = '#FFC107'; // Yellow while loading
      
      // Set model path
      const modelPath = '/models/face-api-models';
      
      try {
        // Try loading models with error handling
        await Promise.all([
          faceapi.nets.tinyFaceDetector.load(modelPath).catch(err => {
            console.warn('Could not load face detector model:', err.message);
            throw new Error('Face detector model failed to load');
          }),
          faceapi.nets.faceExpressionNet.load(modelPath).catch(err => {
            console.warn('Could not load expression model:', err.message);
            throw new Error('Expression model failed to load');
          })
        ]);
        
        this.modelLoaded = true;
        if (statusEl) statusEl.textContent = 'Face detection ready';
        if (indicatorEl) indicatorEl.style.backgroundColor = '#4CAF50'; // Green when ready
        
        console.log('Face detection models loaded successfully');
        return true;
      } catch (error) {
        console.error('Error loading face detection models:', error);
        this.modelLoaded = false;
        if (statusEl) statusEl.textContent = 'Could not load detection models. Using manual mode.';
        if (indicatorEl) indicatorEl.style.backgroundColor = '#F44336'; // Red on error
        
        // Show manual emotion selection more prominently
        const manualEmotions = document.getElementById('manual-emotions');
        if (manualEmotions) {
          manualEmotions.style.display = 'block';
          manualEmotions.style.padding = '15px';
          manualEmotions.style.background = 'rgba(255,255,255,0.9)';
          manualEmotions.style.borderRadius = '8px';
          manualEmotions.style.marginTop = '20px';
          manualEmotions.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        }
        
        return false;
      }
    } catch (error) {
      console.error('Fatal error in face detection initialization:', error);
      const statusEl = document.getElementById('detection-status');
      if (statusEl) statusEl.textContent = 'Face detection not available. Please use manual emotion selection.';
      return false;
    }
  },
  
  startDetection: async function(videoEl) {
    if (!this.modelLoaded) {
      console.warn('Cannot start detection - models not loaded');
      return false;
    }
    
    if (!videoEl || videoEl.readyState !== 4) {
      console.warn('Video element not ready');
      return false;
    }
    
    this.detectionActive = true;
    this.detectEmotions(videoEl);
    return true;
  },
  
  stopDetection: function() {
    this.detectionActive = false;
  },
  
  detectEmotions: async function(videoEl) {
    if (!this.detectionActive) return;
    
    const now = Date.now();
    if (now - this.lastDetectionTime < this.detectionInterval) {
      requestAnimationFrame(() => this.detectEmotions(videoEl));
      return;
    }
    
    this.lastDetectionTime = now;
    
    try {
      if (videoEl.readyState === 4) {
        const detections = await faceapi.detectSingleFace(
          videoEl, 
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })
        ).withFaceExpressions();
        
        if (detections) {
          this.processDetections(detections);
        } else {
          // No face detected
          document.getElementById('detection-indicator').classList.remove('active');
        }
      }
    } catch (error) {
      console.error('Error during emotion detection:', error);
    }
    
    if (this.detectionActive) {
      requestAnimationFrame(() => this.detectEmotions(videoEl));
    }
  },
  
  processDetections: function(detections) {
    const indicator = document.getElementById('detection-indicator');
    indicator.classList.add('active');
    
    // Get highest confidence emotion
    const expressions = detections.expressions;
    let highestEmotion = 'neutral';
    let highestConfidence = 0;
    
    for (const [emotion, confidence] of Object.entries(expressions)) {
      if (confidence > highestConfidence && confidence > this.confidenceThreshold) {
        highestConfidence = confidence;
        highestEmotion = emotion;
      }
    }
    
    this.currentEmotion = highestEmotion;
    document.getElementById('detection-status').textContent = 
      `Detected emotion: ${highestEmotion} (${Math.round(highestConfidence * 100)}%)`;
    
    // Emit event for other components
    const event = new CustomEvent('emotionDetected', {
      detail: { emotion: highestEmotion, confidence: highestConfidence }
    });
    document.dispatchEvent(event);
  },
  
  getCurrentEmotion: function() {
    return this.currentEmotion;
  },
  
  setManualEmotion: function(emotion) {
    this.currentEmotion = emotion;
    document.getElementById('manual-emotion-status').textContent = `Manual emotion set: ${emotion}`;
    
    // Emit event for other components
    const event = new CustomEvent('emotionDetected', {
      detail: { emotion: emotion, confidence: 1.0, manual: true }
    });
    document.dispatchEvent(event);
  }
};

// Initialize manual emotion buttons
document.addEventListener('DOMContentLoaded', function() {
  const emotionButtons = document.querySelectorAll('.emotion-btn');
  emotionButtons.forEach(button => {
    button.addEventListener('click', function() {
      const emotion = this.getAttribute('data-emotion');
      FaceDetectionService.setManualEmotion(emotion);
    });
  });
});

// Export for use in other modules
window.FaceDetectionService = FaceDetectionService; 