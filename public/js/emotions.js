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

// Export the MusicHandler
window.MusicHandler = window.EmotionsHandler = MusicHandler; // Keep EmotionsHandler for backward compatibility