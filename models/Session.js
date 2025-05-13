const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: String,
  startTime: Date,
  endTime: Date,
  keystrokes: [Number],
  typingSpeed: Number,
  totalKeystrokes: Number,
  text: String,
  context: String,
  deviceInfo: {
    browser: String,
    os: String,
    screen: String
  },
  emotionData: {
    happy: Number,
    sad: Number,
    anger: Number,
    fear: Number,
    surprise: Number,
    disgust: Number,
    neutral: Number
  },
  emotionTimeline: [{
    timestamp: Number,
    emotion: String,
    score: Number,
    allEmotions: Object
  }],
  userId: String,
  cameraActive: Boolean,
  musicId: String
});

module.exports = mongoose.model('Session', sessionSchema); 