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
  constructor(textareaId, speedDisplayId = null, countDisplayId = null) {
    this.textarea = document.getElementById(textareaId);
    this.speedDisplay = speedDisplayId ? document.getElementById(speedDisplayId) : null;
    this.countDisplay = countDisplayId ? document.getElementById(countDisplayId) : null;
    this.keystrokeData = [];
    this.lastKeyPressTime = null;
    this.lastKeyReleaseTime = null;
    this.pressedKeys = new Map(); // To track currently pressed keys
    this.sessionStartTime = null;
    this.keystrokeCount = 0;
    this.typingSpeedUpdateInterval = null;

    if (this.textarea) {
      this.initEventListeners();
    } else {
      console.error(`Textarea with ID "${textareaId}" not found`);
    }
  }

  initEventListeners() {
    // Start session when the textarea gets focus
    this.textarea.addEventListener('focus', () => {
      if (!this.sessionStartTime) {
        this.sessionStartTime = performance.now();
        // Start updating typing speed regularly if display element exists
        if (this.speedDisplay) {
          this.typingSpeedUpdateInterval = setInterval(() => this.updateTypingSpeed(), 1000);
        }
      }
    });

    // Key press event
    this.textarea.addEventListener('keydown', (event) => {
      const currentTime = performance.now();
      const key = event.key;
      
      // Initialize session start time if not set
      if (!this.sessionStartTime) {
        this.sessionStartTime = currentTime;
      }
      
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
        
        // Increment keystroke count (only on release to avoid counting held keys)
        this.keystrokeCount++;
        
        // Update keystroke count display if element exists
        if (this.countDisplay) {
          this.countDisplay.textContent = `Keystrokes: ${this.keystrokeCount}`;
        }
        
        // Update typing speed immediately
        this.updateTypingSpeed();
      }
    });
  }

  // Calculate and update typing speed display (characters per minute)
  updateTypingSpeed() {
    if (!this.sessionStartTime || !this.speedDisplay) return;
    
    const currentTime = performance.now();
    const elapsedMinutes = (currentTime - this.sessionStartTime) / 60000; // Convert to minutes
    
    if (elapsedMinutes > 0) {
      const charsCount = this.textarea.value.length;
      const cpm = Math.round(charsCount / elapsedMinutes);
      this.speedDisplay.textContent = `Typing Speed: ${cpm} CPM`;
    }
  }

  // Get all collected keystroke data
  getData() {
    return {
      text: this.textarea.value,
      keystrokeData: this.keystrokeData,
      sessionDurationMs: this.sessionStartTime ? performance.now() - this.sessionStartTime : 0,
      keystrokeCount: this.keystrokeCount
    };
  }

  // Reset all tracking data
  reset() {
    this.keystrokeData = [];
    this.lastKeyPressTime = null;
    this.lastKeyReleaseTime = null;
    this.pressedKeys.clear();
    this.sessionStartTime = null;
    this.keystrokeCount = 0;
    this.textarea.value = '';
    
    // Reset displays
    if (this.countDisplay) {
      this.countDisplay.textContent = 'Keystrokes: 0';
    }
    if (this.speedDisplay) {
      this.speedDisplay.textContent = 'Typing Speed: 0 CPM';
    }
    
    // Clear interval
    if (this.typingSpeedUpdateInterval) {
      clearInterval(this.typingSpeedUpdateInterval);
      this.typingSpeedUpdateInterval = null;
    }
  }
  
  // Stop collecting data but keep the current text
  stopTracking() {
    if (this.typingSpeedUpdateInterval) {
      clearInterval(this.typingSpeedUpdateInterval);
      this.typingSpeedUpdateInterval = null;
    }
  }
}

// Export the KeystrokeTracker
window.KeystrokeTracker = KeystrokeTracker;