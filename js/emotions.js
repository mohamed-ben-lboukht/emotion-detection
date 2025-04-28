/**
 * Emotions and Music Module
 * 
 * Handles playing music samples and tracking emotion data
 */

class EmotionsHandler {
  constructor() {
    this.currentAudio = null;
    this.emotions = {
      happy: 0,
      sad: 0,
      anger: 0,
      fear: 0
    };
    
    this.manualEmotions = {
      happy: 0,
      sad: 0,
      anger: 0,
      fear: 0,
      surprise: 0
    };
    
    this.musicMappings = {
      'happy': 'assets/music/happy.mp3',
      'sad': 'assets/music/sad.mp3',
      'energetic': 'assets/music/energetic.mp3',
      'calm': 'assets/music/calm.mp3'
    };
    
    this.initEventListeners();
  }
  
  initEventListeners() {
    // Set up slider value displays for music section
    document.querySelectorAll('.music-tracking .slider-group input[type="range"]').forEach(slider => {
      this.setupSlider(slider, 'emotions');
    });
    
    // Set up slider value displays for manual section
    document.querySelectorAll('#manual-tracking .slider-group input[type="range"]').forEach(slider => {
      this.setupSlider(slider, 'manualEmotions');
    });
    
    // Set up music play buttons
    document.querySelectorAll('.play-button').forEach(button => {
      button.addEventListener('click', () => {
        const musicType = button.parentElement.getAttribute('data-music');
        this.playMusic(musicType);
      });
    });
  }
  
  setupSlider(slider, emotionType) {
    const valueDisplay = slider.nextElementSibling;
    
    slider.addEventListener('input', () => {
      valueDisplay.textContent = `${slider.value}%`;
      
      // Update the emotions object
      const emotionName = slider.id.split('-')[0];
      if (emotionType === 'emotions' && emotionName in this.emotions) {
        this.emotions[emotionName] = parseInt(slider.value);
      } else if (emotionType === 'manualEmotions') {
        const emotionName = slider.id.split('-')[1];
        if (emotionName in this.manualEmotions) {
          this.manualEmotions[emotionName] = parseInt(slider.value);
        }
      }
    });
  }
  
  playMusic(musicType) {
    // Stop any currently playing music
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
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
      
      // Update the UI to show which music is playing
      document.querySelectorAll('.music-item').forEach(item => {
        if (item.getAttribute('data-music') === musicType) {
          item.classList.add('playing');
        } else {
          item.classList.remove('playing');
        }
      });
    }
  }
  
  stopMusic() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
      
      // Update UI to show no music is playing
      document.querySelectorAll('.music-item').forEach(item => {
        item.classList.remove('playing');
      });
    }
  }
  
  getEmotionData() {
    return this.emotions;
  }
  
  getManualEmotionData() {
    return this.manualEmotions;
  }
  
  // Check if at least one emotion is set to a non-zero value
  validateEmotions(emotionObj) {
    return Object.values(emotionObj).some(value => value > 0);
  }
  
  resetEmotions() {
    this.emotions = {
      happy: 0,
      sad: 0,
      anger: 0,
      fear: 0
    };
    
    // Reset all sliders to 0
    document.querySelectorAll('#music-tracking .slider-group input[type="range"]').forEach(slider => {
      slider.value = 0;
      slider.nextElementSibling.textContent = '0%';
    });
    
    this.stopMusic();
  }
  
  resetManualEmotions() {
    this.manualEmotions = {
      happy: 0,
      sad: 0,
      anger: 0,
      fear: 0,
      surprise: 0
    };
    
    // Reset all sliders to 0
    document.querySelectorAll('#manual-tracking .slider-group input[type="range"]').forEach(slider => {
      slider.value = 0;
      slider.nextElementSibling.textContent = '0%';
    });
  }
}

// Export the EmotionsHandler
window.EmotionsHandler = EmotionsHandler; 