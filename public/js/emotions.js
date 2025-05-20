/**
 * Music Playback Module
 * 
 * Handles playing music samples while user is typing
 */

class MusicHandler {
  constructor() {
    this.currentAudio = null;
    this.currentMusicType = null;
    this.playbackStartTime = null;
    
    this.musicMappings = {
      'happy': 'css/assets/music/happy.mp3',
      'sad': 'css/assets/music/sad.mp3',
      'energetic': 'css/assets/music/energetic.mp3',
      'calm': 'css/assets/music/calm.mp3'
    };
    
    this.playbackHistory = [];
    
    this.initEventListeners();
  }
  
  initEventListeners() {
    // Set up music play buttons
    document.querySelectorAll('.play-button').forEach(button => {
      button.addEventListener('click', () => {
        const musicType = button.parentElement.getAttribute('data-music');
        this.playMusic(musicType);
      });
    });
  }
  
  playMusic(musicType) {
    // Stop any currently playing music
    if (this.currentAudio) {
      this.stopMusic();
    }
    
    // Create and play the new audio
    if (musicType in this.musicMappings) {
      const audio = new Audio(this.musicMappings[musicType]);
      audio.loop = true;
      
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        alert('Could not play the music. Please check if the audio file exists.');
      });
      
      this.currentAudio = audio;
      this.currentMusicType = musicType;
      this.playbackStartTime = new Date().toISOString();
      
      // Update the UI to show which music is playing
      document.querySelectorAll('.music-item').forEach(item => {
        if (item.getAttribute('data-music') === musicType) {
          item.classList.add('playing');
        } else {
          item.classList.remove('playing');
        }
      });
      
      // Update currently playing text
      const currentlyPlayingDiv = document.querySelector('.currently-playing');
      if (currentlyPlayingDiv) {
        currentlyPlayingDiv.textContent = `Currently playing: ${this.getMusicTypeName(musicType)}`;
      }
    }
  }
  
  stopMusic() {
    if (this.currentAudio) {
      // Record the playback session
      if (this.currentMusicType && this.playbackStartTime) {
        this.playbackHistory.push({
          musicType: this.currentMusicType,
          startTime: this.playbackStartTime,
          endTime: new Date().toISOString()
        });
      }
      
      this.currentAudio.pause();
      this.currentAudio = null;
      this.currentMusicType = null;
      
      // Update UI to show no music is playing
      document.querySelectorAll('.music-item').forEach(item => {
        item.classList.remove('playing');
      });
      
      // Update currently playing text
      const currentlyPlayingDiv = document.querySelector('.currently-playing');
      if (currentlyPlayingDiv) {
        currentlyPlayingDiv.textContent = 'No music playing';
      }
    }
  }
  
  getMusicTypeName(musicType) {
    const names = {
      'happy': 'Upbeat Music',
      'sad': 'Melancholic Music',
      'energetic': 'Energetic Music',
      'calm': 'Calm Music'
    };
    
    return names[musicType] || musicType;
  }
  
  getCurrentMusic() {
    return this.currentMusicType;
  }
  
  getData() {
    return {
      currentMusicType: this.currentMusicType,
      playbackStartTime: this.playbackStartTime,
      playbackHistory: this.playbackHistory
    };
  }
  
  reset() {
    this.stopMusic();
    this.playbackHistory = [];
  }
}

/**
 * Unified Emotions Handler
 * 
 * Handles both manual emotion input and FaceAPI emotion detection
 */

class EmotionsHandler {
  constructor() {
    this.currentEmotions = {
      happy: 0,
      sad: 0,
      angry: 0,
      fearful: 0,
      disgusted: 0,
      surprised: 0,
      neutral: 0
    };
    
    this.emotionHistory = [];
    this.lastUpdateTime = null;
    
    this.initEventListeners();
  }
  
  initEventListeners() {
    // Set up emotion sliders
    document.querySelectorAll('.emotion-slider input[type="range"]').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const emotion = e.target.name;
        const value = parseInt(e.target.value);
        this.updateEmotion(emotion, value);
      });
    });
  }
  
  updateEmotion(emotion, value) {
    if (emotion in this.currentEmotions) {
      this.currentEmotions[emotion] = value;
      this.lastUpdateTime = new Date().toISOString();
      
      // Update the display value
      const valueDisplay = document.getElementById(`${emotion}-val`);
      if (valueDisplay) {
        valueDisplay.textContent = value;
      }
    }
  }
  
  updateFromFaceAPI(expressions) {
    if (!expressions) return;
    
    // Convert FaceAPI scores to percentages (0-100)
    Object.entries(expressions).forEach(([emotion, score]) => {
      const percentage = Math.round(score * 100);
      this.updateEmotion(emotion, percentage);
    });
    
    // Record in history
    this.emotionHistory.push({
      timestamp: new Date().toISOString(),
      emotions: { ...this.currentEmotions }
    });
  }
  
  getDominantEmotion() {
    return Object.entries(this.currentEmotions)
      .sort((a, b) => b[1] - a[1])
      .shift();
  }
  
  getData() {
    return {
      currentEmotions: { ...this.currentEmotions },
      emotionHistory: [...this.emotionHistory],
      lastUpdateTime: this.lastUpdateTime
    };
  }
  
  reset() {
    this.currentEmotions = {
      happy: 0,
      sad: 0,
      angry: 0,
      fearful: 0,
      disgusted: 0,
      surprised: 0,
      neutral: 0
    };
    this.emotionHistory = [];
    this.lastUpdateTime = null;
    
    // Reset all sliders
    document.querySelectorAll('.emotion-slider input[type="range"]').forEach(slider => {
      slider.value = 0;
      const valueDisplay = document.getElementById(`${slider.name}-val`);
      if (valueDisplay) {
        valueDisplay.textContent = '0';
      }
    });
  }
}

// Export the MusicHandler and EmotionsHandler
window.MusicHandler = window.EmotionsHandler = { MusicHandler, EmotionsHandler };