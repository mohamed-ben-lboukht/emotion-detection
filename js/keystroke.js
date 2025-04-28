/**
 * Keystroke Data Collection Module
 * 
 * Collects timing data for keystrokes including:
 * - press-press: time between consecutive key presses
 * - press-release: time a key is held down
 * - release-release: time between consecutive key releases
 * - release-press: time between a key release and the next key press
 */

class KeystrokeTracker {
  constructor(textareaId) {
    this.textarea = document.getElementById(textareaId);
    this.keystrokeData = [];
    this.lastKeyPressTime = null;
    this.lastKeyReleaseTime = null;
    this.pressedKeys = new Map(); // To track currently pressed keys

    if (this.textarea) {
      this.initEventListeners();
    } else {
      console.error(`Textarea with ID "${textareaId}" not found`);
    }
  }

  initEventListeners() {
    // Key press event
    this.textarea.addEventListener('keydown', (event) => {
      const currentTime = performance.now();
      const key = event.key;
      
      // Record the press time for this key
      if (!this.pressedKeys.has(key)) {
        this.pressedKeys.set(key, currentTime);
        
        // Calculate press-press time if there was a previous press
        if (this.lastKeyPressTime !== null) {
          this.keystrokeData.push({
            type: 'press-press',
            key1: this.lastKeyPressKey,
            key2: key,
            timeMs: currentTime - this.lastKeyPressTime
          });
        }
        
        // Calculate release-press time if there was a previous release
        if (this.lastKeyReleaseTime !== null) {
          this.keystrokeData.push({
            type: 'release-press',
            key1: this.lastKeyReleaseKey,
            key2: key,
            timeMs: currentTime - this.lastKeyReleaseTime
          });
        }
        
        this.lastKeyPressTime = currentTime;
        this.lastKeyPressKey = key;
      }
    });

    // Key release event
    this.textarea.addEventListener('keyup', (event) => {
      const currentTime = performance.now();
      const key = event.key;
      
      // Only process if we have recorded this key being pressed
      if (this.pressedKeys.has(key)) {
        const pressTime = this.pressedKeys.get(key);
        
        // Calculate press-release time (how long the key was held)
        this.keystrokeData.push({
          type: 'press-release',
          key: key,
          timeMs: currentTime - pressTime
        });
        
        // Remove this key from pressedKeys
        this.pressedKeys.delete(key);
        
        // Calculate release-release time if there was a previous release
        if (this.lastKeyReleaseTime !== null) {
          this.keystrokeData.push({
            type: 'release-release',
            key1: this.lastKeyReleaseKey,
            key2: key,
            timeMs: currentTime - this.lastKeyReleaseTime
          });
        }
        
        this.lastKeyReleaseTime = currentTime;
        this.lastKeyReleaseKey = key;
      }
    });
  }

  // Get all collected keystroke data
  getData() {
    return {
      text: this.textarea.value,
      keystrokeData: this.keystrokeData
    };
  }

  // Reset all tracking data
  reset() {
    this.keystrokeData = [];
    this.lastKeyPressTime = null;
    this.lastKeyReleaseTime = null;
    this.pressedKeys.clear();
    this.textarea.value = '';
  }
}

// Export the KeystrokeTracker
window.KeystrokeTracker = KeystrokeTracker; 