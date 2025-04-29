/**
 * Main Application Logic for Keystroke Dynamics Collector
 */

// --- Gestion du consentement utilisateur et UUID anonyme ---
function generateUUIDv4() {
  // Générateur simple d'UUIDv4
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function showConsentModal() {
  const modal = document.getElementById('consent-modal');
  if (modal) modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function hideConsentModal() {
  const modal = document.getElementById('consent-modal');
  if (modal) modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function ensureConsentAndUUID() {
  const consentKey = 'keystroke_consent_accepted';
  const uuidKey = 'keystroke_user_uuid';
  const accepted = localStorage.getItem(consentKey);
  if (!accepted) {
    showConsentModal();
    // Bloque l'UI tant que pas accepté
    document.querySelectorAll('.option-card, .back-button, .save-button, #view-data').forEach(el => {
      el.setAttribute('disabled', 'true');
    });
    document.getElementById('accept-consent').onclick = () => {
      localStorage.setItem(consentKey, 'yes');
      hideConsentModal();
      // Génère un UUID si pas déjà fait
      if (!localStorage.getItem(uuidKey)) {
        localStorage.setItem(uuidKey, generateUUIDv4());
      }
      // Débloque l'UI
      document.querySelectorAll('.option-card, .back-button, .save-button, #view-data').forEach(el => {
        el.removeAttribute('disabled');
      });
    };
  } else {
    // Génère un UUID si pas déjà fait
    if (!localStorage.getItem(uuidKey)) {
      localStorage.setItem(uuidKey, generateUUIDv4());
    }
  }
}

// Appel dès le chargement
ensureConsentAndUUID();

document.addEventListener('DOMContentLoaded', () => {
  // Initialize trackers with display elements
  const manualKeystrokeTracker = new KeystrokeTracker('typing-area', 'typing-speed', 'keystroke-count');
  const musicKeystrokeTracker = new KeystrokeTracker('music-typing-area', 'music-typing-speed', 'music-keystroke-count');
  const webcamKeystrokeTracker = new KeystrokeTracker('webcam-typing-area', 'webcam-typing-speed', 'webcam-keystroke-count');
  const musicHandler = new MusicHandler();
  const webcamTracker = new WebcamTracker();
  
  // Get DOM elements
  const optionCards = document.querySelectorAll('.option-card');
  const sections = document.querySelectorAll('.tracking-section');
  const backButtons = document.querySelectorAll('.back-button');
  const saveButtons = document.querySelectorAll('.save-button');
  const viewDataButton = document.getElementById('view-data');
  const privacyLink = document.getElementById('privacy-link');
  const sessionSelect = document.getElementById('session-select');
  const downloadDataButton = document.getElementById('download-data');
  
  // Option card click handlers
  optionCards.forEach(card => {
    card.addEventListener('click', () => {
      const optionId = card.id;
      let targetSection;
      
      // Hide main options
      document.querySelector('.options').classList.add('hidden');
      
      // Show appropriate section based on option selected
      if (optionId === 'manual-option') {
        targetSection = document.getElementById('manual-tracking');
      } else if (optionId === 'music-option') {
        targetSection = document.getElementById('music-tracking');
      } else if (optionId === 'webcam-option') {
        targetSection = document.getElementById('webcam-tracking');
        // Initialize webcam for webcam mode only
        webcamTracker.initialize();
      }
      
      if (targetSection) {
        targetSection.classList.remove('hidden');
      }
    });
  });
  
  // Back button handlers
  backButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Hide all sections
      sections.forEach(section => {
        section.classList.add('hidden');
      });
      
      // Show main options
      document.querySelector('.options').classList.remove('hidden');
      
      // Stop webcam if active
      webcamTracker.stop();
      
      // Stop music if playing
      musicHandler.stopMusic();
    });
  });
  
  // Privacy link handler
  if (privacyLink) {
    privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert(
        'Keystroke Dynamics Collector - Privacy Information\n\n' +
        'This application collects:\n' +
        '- Keystroke timing data (press and release times)\n' +
        '- Text you type in the input areas\n' +
        '- Context information (music played or webcam status)\n' +
        '- Emotion data (manually reported or detected via webcam)\n\n' +
        'All data is stored on the server in JSON format and is not shared with third parties.\n' +
        'The data is collected for research purposes to analyze typing patterns and emotional states.\n\n' +
        'Your data is identified only by a randomly generated ID, not by personal information.\n' +
        'The webcam feed is only used when you explicitly choose the camera mode.\n\n' +
        'Collected data is only accessible to administrators.'
      );
    });
  }
  
  // Ajout d'un modal pour saisir les émotions après la frappe
  const emotionModalHtml = `
    <div id="emotion-modal" class="modal hidden">
      <div class="modal-content">
        <h2>Comment vous sentez-vous après cette session ?</h2>
        <form id="emotion-form">
          <label>Heureux(se) : <input type="range" min="0" max="100" value="50" name="happy"> <span id="happy-val">50</span>%</label><br>
          <label>Triste : <input type="range" min="0" max="100" value="50" name="sad"> <span id="sad-val">50</span>%</label><br>
          <label>Colère : <input type="range" min="0" max="100" value="50" name="anger"> <span id="anger-val">50</span>%</label><br>
          <label>Peur : <input type="range" min="0" max="100" value="50" name="fear"> <span id="fear-val">50</span>%</label><br>
          <label>Surpris(e) : <input type="range" min="0" max="100" value="50" name="surprise"> <span id="surprise-val">50</span>%</label><br>
          <button type="submit">Valider mes émotions</button>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', emotionModalHtml);

  // Affichage dynamique des valeurs
  ['happy','sad','anger','fear','surprise'].forEach(emotion => {
    document.querySelector(`input[name='${emotion}']`).addEventListener('input', e => {
      document.getElementById(`${emotion}-val`).textContent = e.target.value;
    });
  });

  // Fonction pour afficher le modal émotions et retourner une promesse
  function askEmotions() {
    return new Promise(resolve => {
      const modal = document.getElementById('emotion-modal');
      modal.classList.remove('hidden');
      const form = document.getElementById('emotion-form');
      form.onsubmit = e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        // Convertir en nombre
        Object.keys(data).forEach(k => data[k] = Number(data[k]));
        modal.classList.add('hidden');
        resolve(data);
      };
    });
  }

  // Remplacer les handlers de sauvegarde pour demander les émotions et simplifier le format
  async function saveSimpleSession(type, tracker) {
    const keystrokeData = tracker.getData();
    if (keystrokeData.text.length < 10) {
      alert('Veuillez taper au moins 10 caractères avant de sauvegarder');
      return;
    }
    
    let emotions;
    
    if (type === 'webcam') {
      // Récupérer les émotions détectées automatiquement par la webcam
      const webcamData = webcamTracker.getData();
      
      // Create and show a summary of detected emotions before saving
      if (webcamData.emotionTimeline && webcamData.emotionTimeline.length > 0) {
        const confirmSave = await showEmotionSummary(webcamData.emotionTimeline);
        if (!confirmSave) return; // User cancelled the save
      } else {
        alert('Aucune émotion n\'a été détectée. Assurez-vous que votre visage est visible par la caméra.');
        return;
      }
      
      emotions = webcamData.emotionTimeline || [];
    } else {
      // Pour les modes manual et music, on demande toujours les émotions manuellement
      emotions = await askEmotions();
    }
    
    // Convert array of emotions to format expected by the server for webcam mode
    let processedEmotions;
    if (Array.isArray(emotions)) {
      // For webcam emotions (array format)
      processedEmotions = emotions;
    } else {
      // For manual emotions (object format from askEmotions)
      processedEmotions = emotions;
    }
    
    const timings = keystrokeData.keystrokeData.map(entry => entry.timeMs);
    const data = {
      userId: getUserUUID(),
      sessionId: generateUUIDv4(),
      deviceInfo: getDeviceInfo(),
      cameraActive: (type === 'webcam'), // Caméra active uniquement en mode webcam
      musicId: (type === 'music' ? (window.musicHandler?.getCurrentMusic?.() || 'None') : 'None'),
      text: keystrokeData.text,
      timings,
      emotions: processedEmotions,
      emotionTimeline: Array.isArray(processedEmotions) ? processedEmotions : [], // Ensure emotionTimeline is always available
      sessionDuration: keystrokeData.sessionDurationMs,
      keystrokeCount: keystrokeData.keystrokeCount,
      timestamp: new Date().toISOString(),
      context: type,
      detectionType: Array.isArray(processedEmotions) ? 'automatic' : 'manual'
    };
    
    try {
      const response = await fetch('/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      });
      const result = await response.json();
      if (result.success) {
        alert('Session sauvegardée avec succès !');
        tracker.reset();
        if (type === 'webcam') {
          webcamTracker.reset();
        }
      } else {
        alert('Erreur lors de la sauvegarde : ' + result.message);
      }
    } catch (e) {
      alert('Erreur lors de la sauvegarde : ' + e.message);
    }
  }

  // Remplacer les anciens handlers :
  document.getElementById('save-manual').onclick = () => saveSimpleSession('manual', manualKeystrokeTracker);
  document.getElementById('save-music').onclick = () => saveSimpleSession('music', musicKeystrokeTracker);
  document.getElementById('save-webcam').onclick = () => saveSimpleSession('webcam', webcamKeystrokeTracker);

  /* 
   * Data viewing functionality has been disabled for regular users.
   * Data can only be accessed through the admin interface.
   */

  // Fonction utilitaire pour infos device
  function getDeviceInfo() {
    return {
      browser: navigator.userAgent,
      os: navigator.platform,
      screen: `${window.screen.width}x${window.screen.height}`
    };
  }

  // Fonction utilitaire pour récupérer l'UUID utilisateur
  function getUserUUID() {
    return localStorage.getItem('keystroke_user_uuid') || '';
  }

  // Fonction pour afficher un résumé des émotions détectées avant sauvegarde
  function showEmotionSummary(emotionTimeline) {
    return new Promise(resolve => {
      // Count occurrences of each emotion
      const emotionCounts = {};
      let totalEmotions = 0;
      
      emotionTimeline.forEach(entry => {
        emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
        totalEmotions++;
      });
      
      // Calculate percentages and prepare data for display
      const emotionStats = Object.entries(emotionCounts)
        .map(([emotion, count]) => ({
          emotion,
          count,
          percentage: Math.round((count / totalEmotions) * 100)
        }))
        .sort((a, b) => b.percentage - a.percentage);
      
      // Create a modal to display the summary
      const modalHtml = `
        <div id="emotion-summary-modal" class="modal">
          <div class="modal-content" style="max-width: 500px;">
            <h2>Résumé des émotions détectées</h2>
            <p>Total des détections: ${totalEmotions}</p>
            <div id="emotion-summary" style="margin: 20px 0;">
              ${emotionStats.map(stat => `
                <div style="margin-bottom: 15px;">
                  <div style="display: flex; justify-content: space-between;">
                    <strong>${stat.emotion}</strong>
                    <span>${stat.percentage}% (${stat.count} détections)</span>
                  </div>
                  <div style="background: #eee; height: 20px; width: 100%; border-radius: 4px; margin-top: 5px;">
                    <div style="background: ${getEmotionColor(stat.emotion)}; height: 100%; width: ${stat.percentage}%; border-radius: 4px;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
            <p>Voulez-vous sauvegarder ces données?</p>
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
              <button id="cancel-save" style="padding: 8px 15px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Annuler</button>
              <button id="confirm-save" style="padding: 8px 15px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Sauvegarder</button>
            </div>
          </div>
        </div>
      `;
      
      // Add the modal to the page
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      const modal = document.getElementById('emotion-summary-modal');
      
      // Set up button handlers
      document.getElementById('cancel-save').addEventListener('click', () => {
        modal.remove();
        resolve(false);
      });
      
      document.getElementById('confirm-save').addEventListener('click', () => {
        modal.remove();
        resolve(true);
      });
    });
  }

  // Helper function to get color for each emotion
  function getEmotionColor(emotion) {
    const colors = {
      happy: '#4CAF50',      // Green
      sad: '#2196F3',        // Blue
      angry: '#F44336',      // Red
      fearful: '#9C27B0',    // Purple
      disgusted: '#795548',  // Brown
      surprised: '#FF9800',  // Orange
      neutral: '#9E9E9E'     // Gray
    };
    return colors[emotion] || '#FFFFFF';
  }
});