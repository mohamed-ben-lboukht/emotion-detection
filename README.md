# Emotion Detection - Keystroke Dynamics Application

Web application for emotion detection and keystroke dynamics data collection.

## Features

- Emotion detection via webcam
- Keystroke timing collection
- Intuitive user interface
- Secure data storage
- Easy deployment with Docker

## Installation and Quick Start

### With Docker (Recommended)

1. Make sure you have Docker and Docker Compose installed
2. Clone this repository
3. Run the startup script:

```bash
./docker-start.sh
```

The application will be accessible at: http://localhost:3001

### Without Docker

1. Make sure you have Node.js (version 14+) and MongoDB installed
2. Clone this repository
3. Install dependencies:

```bash
npm install
```

4. Start the application:

```bash
npm run dev
```

The application will be accessible at: http://localhost:3001

## Project Structure

```
emotion-detection/
├── app.js                  # Main Express server
├── package.json            # npm configuration
├── config/                 # Configuration files
│   └── database.js         # MongoDB connection
├── middleware/             # Express middleware
│   └── security.js         # Security headers middleware
├── utils/                  # Utility functions
│   ├── fileUtils.js        # File handling utilities
│   └── sanitization.js     # Data sanitization utilities
├── routes/                 # API routes
│   ├── api.js              # Main API endpoints
│   └── admin.js            # Admin dashboard endpoints
├── models/                 # Database models
│   └── Session.js          # MongoDB session schema
├── data/                   # Data storage directory
│   └── sessions/           # Session data stored as JSON
├── public/                 # Static files
│   ├── index.html          # Main page
│   ├── css/                # CSS styles
│   ├── js/                 # JavaScript files
│   └── models/             # Emotion detection models
├── admin/                  # Admin interface
│   ├── dashboard.html      # Admin dashboard 
│   └── login.html          # Admin login page
├── Dockerfile              # Docker configuration
└── docker-compose.yml      # Docker Compose configuration
```

## Deployment

### On Render.com

The `render.yaml` file allows for easy deployment on [Render.com](https://render.com).

### On Other Platforms

Follow the instructions in the [DOCKER_README.md](DOCKER_README.md) file for deployment details on other platforms.

## Maintenance

To clean up the project and remove temporary files:

```bash
./clean.sh
```

## Testing the Application

Run the test script to verify that the application is correctly set up:

```bash
npm test
```

## Security

The application implements several security measures:
- HTTP security headers
- Data sanitization
- CSP (Content Security Policy)
- Rate limiting

## Setup for Data Persistence on Render

### 1. Create a MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account
2. Create a new cluster (the free tier is sufficient)
3. Create a database user with password
4. In Network Access, allow access from everywhere (or specify your Render IP)
5. Get your connection string from "Connect" > "Connect your application"

### 2. Configure Environment Variables on Render
Add the following environment variables to your Render deployment:

Replace the `MONGODB_URI` with your actual MongoDB connection string, and change the admin password.

### 3. How to Access Your Data

#### From Admin Dashboard
1. Go to `/admin/dashboard` in your application
2. Use the "MongoDB Data" section to:
   - Load MongoDB data
   - Download all data
   - Extract to JSON files

#### From API Endpoints
- `/api/sessions` - Get all sessions as JSON
- `/api/admin/sessions` - Browse and download JSON files
- `/api/admin/extract-data` - Extract MongoDB data to JSON files
