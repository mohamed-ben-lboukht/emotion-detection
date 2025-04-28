# Emotion Tracker

A simple web application for tracking emotions and keystroke patterns. This application allows users to record their keystroke data while expressing emotions in three different ways:

1. **Manual Tracking**: Type freely and manually select your emotional state
2. **Music-Based Tracking**: Listen to different music tracks and rate your emotional responses
3. **Webcam Tracking**: Use webcam-based facial expression detection to track emotions while typing

## Setup Instructions

This is a simple web application that runs in any modern browser. No special installation is required.

### Running Locally

1. Download or clone the repository
2. Open the `index.html` file in a web browser
   - For webcam functionality, you need to run the app through a web server due to security restrictions
   - You can use a simple local server like Python's built-in server:
     ```
     # Python 3
     python -m http.server
     
     # Python 2
     python -m SimpleHTTPServer
     ```
   - Then access the app at http://localhost:8000

### Music Files

For the music-based tracking to work, you need to add music files in the `assets/music/` directory:
- `happy.mp3`
- `sad.mp3`
- `energetic.mp3`
- `calm.mp3`

## Features

### Keystroke Data Collection

All three tracking methods collect the following keystroke timing data:
- **press-press**: Time between consecutive key presses
- **press-release**: Time a key is held down
- **release-release**: Time between consecutive key releases
- **release-press**: Time between a key release and the next key press

All times are measured in milliseconds.

### Data Storage

All collected data is stored locally in your browser's localStorage. You can:
- View all collected data
- Export data as a JSON file
- Clear all data

## Privacy & Security

- All data is stored locally on your device
- The webcam feed is processed locally and is not transmitted anywhere
- No external APIs are used for emotion detection

## Browser Compatibility

This application works on modern browsers including:
- Chrome (Recommended)
- Firefox
- Edge
- Safari

## Technical Notes

- This app uses vanilla JavaScript without external frameworks
- Keystroke timing is captured using the browser's performance API
- The webcam emotion detection in this simple version is simulated for demonstration purposes 