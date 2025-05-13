const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: String,
  startTime: Date,
  endTime: Date,
  keystrokes: [{
    key: String,
    timestamp: Number,
    emotion: String,
    emotionScore: Number
  }],
  typingSpeed: Number,
  totalKeystrokes: Number
});

module.exports = mongoose.model('Session', sessionSchema); 