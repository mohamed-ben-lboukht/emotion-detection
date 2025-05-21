const crypto = require('crypto');

const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/[\u0000-\u001F\u007F-\u009F<>"'\\]/g, '');
};

const validateAndSanitizeData = (type, data) => {
  // Clone to avoid modifying the original
  const sanitizedData = JSON.parse(JSON.stringify(data));
  
  // Ensure required fields
  if (!sanitizedData.userId) {
    sanitizedData.userId = crypto.randomBytes(16).toString('hex');
  }
  
  if (!sanitizedData.sessionId) {
    sanitizedData.sessionId = crypto.randomBytes(16).toString('hex');
  }
  
  // Sanitize text content
  if (sanitizedData.text) {
    sanitizedData.text = sanitizeText(sanitizedData.text);
  } else {
    sanitizedData.text = "";
  }
  
  // Ensure timestamp
  if (!sanitizedData.timestamp) {
    sanitizedData.timestamp = new Date().toISOString();
  }
  
  // Handle different formats of emotions data
  if (sanitizedData.emotions) {
    if (typeof sanitizedData.emotions === 'object' && !Array.isArray(sanitizedData.emotions)) {
      const emotionValues = Object.entries(sanitizedData.emotions)
        .map(([emotion, value]) => ({ emotion, value }));
      
      // Find the dominant emotion
      const dominantEmotion = emotionValues.reduce(
        (max, current) => current.value > max.value ? current : max, 
        { emotion: 'neutral', value: 0 }
      );
      
      // Create a timeline entry
      sanitizedData.emotionTimeline = [{
        timestamp: 0,
        emotion: dominantEmotion.emotion,
        score: dominantEmotion.value,
        allEmotions: sanitizedData.emotions
      }];
    }
  }
  
  // Ensure emotionTimeline is always present
  if (!sanitizedData.emotionTimeline) {
    sanitizedData.emotionTimeline = [];
  }
  
  // Ensure context
  if (!sanitizedData.context) {
    sanitizedData.context = type;
  }
  
  return sanitizedData;
};

module.exports = {
  sanitizeText,
  validateAndSanitizeData
}; 