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
      
      // Load TinyFaceDetector model
      const tinyFaceLoaded = await loadModelWithTimeout(
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
        15000, 
        "TinyFaceDetector"
      );
      
      // Load FaceExpressionNet model
      const expressionLoaded = await loadModelWithTimeout(
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_PATH),
        15000, 
        "FaceExpressionNet"
      );
      
      if (tinyFaceLoaded && expressionLoaded) {
        console.log("All face detection models successfully preloaded");
        document.dispatchEvent(new CustomEvent('faceDetectionModelsLoaded'));
      } else {
        console.warn("Some face detection models failed to load");
        document.dispatchEvent(new CustomEvent('faceDetectionModelsError'));
      }
    } catch (error) {
      console.error("Error during face detection model preloading:", error);
      document.dispatchEvent(new CustomEvent('faceDetectionModelsError', { 
        detail: { error: error.message } 
      }));
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
    }
  };
})(); 