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
      // Ré-attache les handlers de debug après consentement
      document.querySelectorAll('.save-button').forEach(btn => {
        btn.addEventListener('click', () => {});
      });
      document.querySelectorAll('.back-button').forEach(btn => {
        btn.addEventListener('click', () => {});
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
  // S'assurer que les boutons sont activés
  document.querySelectorAll('.back-button, .save-button').forEach(btn => btn.removeAttribute('disabled'));

  // Nettoyage : remplacement des boutons pour supprimer tout ancien gestionnaire
  document.querySelectorAll('.back-button').forEach(btn => {
    const cleanBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(cleanBtn, btn);
  });
  document.querySelectorAll('.save-button').forEach(btn => {
    const cleanBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(cleanBtn, btn);
  });

  // Gestionnaire unique pour chaque bouton Back (sans alerte)
  document.querySelectorAll('.back-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.tracking-section').forEach(section => section.classList.add('hidden'));
      const options = document.querySelector('.options');
      if (options) options.classList.remove('hidden');
    });
  });

  // Gestionnaire unique pour chaque bouton SaveData (sans alerte)
  document.querySelectorAll('.save-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // Ici, on peut appeler la logique de sauvegarde si besoin
    });
  });

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
      
      // Create a custom privacy modal
      const privacyModalHtml = `
        <div id="privacy-modal" class="modal active">
          <div class="modal-content" style="max-width: 800px; padding: 30px; box-shadow: 0 0 20px rgba(0,0,0,0.3); background-color: #fff; border-radius: 10px;">
            <h2 style="font-size: 26px; margin-bottom: 20px; color: #4361ee;">Politique de Confidentialité</h2>
            <div class="privacy-content" style="font-size: 16px; line-height: 1.6;">
              <p style="margin-bottom: 15px; font-weight: bold;">Cette application collecte :</p>
              <ul style="margin-bottom: 20px; padding-left: 25px;">
                <li style="margin-bottom: 10px;">Les temps de frappe au clavier (moments d'appui et de relâchement)</li>
                <li style="margin-bottom: 10px;">Le texte que vous saisissez dans les zones de saisie</li>
                <li style="margin-bottom: 10px;">Les informations de contexte (musique jouée ou statut de la webcam)</li>
                <li style="margin-bottom: 10px;">Les données émotionnelles (rapportées manuellement ou détectées via webcam)</li>
              </ul>
              
              <p style="margin-bottom: 15px;">Toutes les données sont stockées sur le serveur au format JSON et ne sont pas partagées avec des tiers.</p>
              <p style="margin-bottom: 15px;">Les données sont collectées à des fins de recherche pour analyser les schémas de frappe et les états émotionnels.</p>
              
              <p style="margin-bottom: 15px;">Vos données sont identifiées uniquement par un ID généré aléatoirement, et non par des informations personnelles.</p>
              <p style="margin-bottom: 15px;">Le flux de la webcam est utilisé uniquement lorsque vous choisissez explicitement le mode caméra.</p>
              
              <p style="margin-bottom: 15px;">Les données collectées ne sont accessibles qu'aux administrateurs.</p>
            </div>
            <button id="close-privacy-modal" class="btn-primary" style="padding: 12px 25px; font-size: 16px; margin-top: 15px; background: linear-gradient(to right, #4361ee, #3a0ca3); color: white; border: none; border-radius: 5px; cursor: pointer;">Fermer</button>
          </div>
        </div>
      `;
      
      // Add modal to DOM
      document.body.insertAdjacentHTML('beforeend', privacyModalHtml);
      
      // Add close handler
      document.getElementById('close-privacy-modal').addEventListener('click', () => {
        document.getElementById('privacy-modal').remove();
      });
    });
  }
  
  // Fonction pour afficher le modal émotions et retourner une promesse
  function askEmotions() {
    return new Promise(resolve => {
      const modal = document.getElementById('emotion-modal');
      modal.classList.remove('hidden');
      modal.classList.add('active');
      const form = document.getElementById('emotion-form');
      // Nettoyage : supprimer tout bouton Cancel déjà présent
      const oldCancel = form.querySelector('button.cancel-emotion');
      if (oldCancel) oldCancel.remove();
      form.onsubmit = e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        Object.keys(data).forEach(k => data[k] = Number(data[k]));
        modal.classList.add('hidden');
        modal.classList.remove('active');
        resolve(data);
      };
      // Ajout du bouton Cancel (une seule fois)
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.type = 'button';
      cancelButton.className = 'cancel-emotion';
      cancelButton.style.marginRight = '10px';
      cancelButton.onclick = () => {
        modal.classList.add('hidden');
        modal.classList.remove('active');
        // Reset textarea si présent
        const textarea = form.closest('.tracking-section')?.querySelector('textarea');
        if (textarea) textarea.value = '';
        resolve(false); // On retourne false pour signaler l'annulation
      };
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton && !form.querySelector('button.cancel-emotion')) {
        submitButton.parentNode.insertBefore(cancelButton, submitButton);
      }
    });
  }

  // Create emotion modal in English with improved styling
  const emotionModalHtml = `
    <div id="emotion-modal" class="modal hidden">
      <div class="modal-content">
        <h2>How do you feel after this session?</h2>
        <form id="emotion-form">
          <div class="emotion-slider">
            <label for="happy">Happy:</label>
            <input type="range" min="0" max="100" value="50" name="happy" id="happy">
            <span id="happy-val">50</span>%
          </div>
          <div class="emotion-slider">
            <label for="sad">Sad:</label>
            <input type="range" min="0" max="100" value="50" name="sad" id="sad">
            <span id="sad-val">50</span>%
          </div>
          <div class="emotion-slider">
            <label for="anger">Angry:</label>
            <input type="range" min="0" max="100" value="50" name="anger" id="anger">
            <span id="anger-val">50</span>%
          </div>
          <div class="emotion-slider">
            <label for="fear">Fearful:</label>
            <input type="range" min="0" max="100" value="50" name="fear" id="fear">
            <span id="fear-val">50</span>%
          </div>
          <div class="emotion-slider">
            <label for="surprise">Surprised:</label>
            <input type="range" min="0" max="100" value="50" name="surprise" id="surprise">
            <span id="surprise-val">50</span>%
          </div>
          <div class="button-container">
            <button type="submit" class="btn-primary">Submit</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Insert the improved modal HTML
  document.body.insertAdjacentHTML('beforeend', emotionModalHtml);

  // Add a style tag for the emotion sliders
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    .emotion-slider {
      margin-bottom: 15px;
    }
    .emotion-slider label {
      display: inline-block;
      width: 80px;
      font-weight: 500;
    }
    .emotion-slider input[type="range"] {
      width: 200px;
      margin: 0 10px;
      vertical-align: middle;
    }
    .button-container {
      margin-top: 20px;
      text-align: center;
    }
    .modal.active {
      opacity: 1 !important;
      visibility: visible !important;
      display: flex !important;
    }
  `;
  document.head.appendChild(styleTag);

  // Affichage dynamique des valeurs
  ['happy','sad','anger','fear','surprise'].forEach(emotion => {
    document.querySelector(`input[name='${emotion}']`).addEventListener('input', e => {
      document.getElementById(`${emotion}-val`).textContent = e.target.value;
    });
  });

  // Add a utility function to check if the server is running
  async function isServerRunning() {
    try {
      // Try to fetch a very small resource to see if the server responds
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        const serverPort = location.port || '3000';
        const response = await fetch(`http://${location.hostname}:${serverPort}/`, {
          method: 'HEAD',
          // Set a short timeout to quickly fail if server is not responding
          signal: AbortSignal.timeout(2000)
        });
        return response.ok;
      }
      return true; // Assume server is running in production
    } catch (error) {
      return false;
    }
  }

  // Update the saveSimpleSession function to check server status first
  async function saveSimpleSession(type, tracker) {
    
    // First check if server is running to give early feedback
    const serverAvailable = await isServerRunning();
    if (!serverAvailable) {
      alert('Warning: Server appears to be offline. Data will be saved locally only.');
      
      // Save data locally as fallback
      try {
        const keystrokeData = tracker.getData();
        const data = {
          userId: getUserUUID(),
          sessionId: generateUUIDv4(),
          text: keystrokeData.text,
          keystrokeData: keystrokeData.keystrokeData,
          timestamp: new Date().toISOString(),
          context: type
        };
        
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const localStorageKey = `keystroke_data_${type}_${timestamp}`;
        localStorage.setItem(localStorageKey, JSON.stringify(data));
        alert('Data has been saved locally. Please try again when the server is available.');
        return;
      } catch (storageError) {
        alert('Failed to save data: ' + storageError.message);
        return;
      }
    }
    
    const keystrokeData = tracker.getData();
    
    if (keystrokeData.text.length < 10) {
      alert('Please type at least 10 characters before saving');
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
        
        // Proposition à l'utilisateur de choisir son émotion manuellement
        const manualEmotions = ["neutral", "happy", "sad", "angry", "fearful", "surprised"];
        const selectedEmotion = prompt(
          "Aucune émotion n'a été détectée par la caméra. " +
          "Veuillez choisir une émotion manuellement parmi : " + 
          manualEmotions.join(", ") +
          "\nOu cliquez sur Annuler pour ne pas sauvegarder."
        );
        
        if (!selectedEmotion) return; // L'utilisateur a annulé
        
        // Vérification que l'émotion est valide
        const emotion = manualEmotions.includes(selectedEmotion.toLowerCase()) 
          ? selectedEmotion.toLowerCase() 
          : "neutral";
        
        // Force l'émotion choisie
        const entry = webcamTracker.forceEmotion(emotion, 100);
        
        // Créer une timeline avec cette émotion
        webcamData.emotionTimeline = [entry];
      }
      
      emotions = webcamData.emotionTimeline || [];
    } else {
      // Pour les modes manual et music, on demande toujours les émotions manuellement
      const emotionsResult = await askEmotions();
      if (emotionsResult === false) {
        // Annulation : on ne sauvegarde rien
        return;
      }
      emotions = emotionsResult;
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
      
      // Check if the server is running
      let saveUrl;
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        // For local development, we need to include port in the URL
        const serverPort = location.port || '3000'; // Default to 3000 if no port specified
        saveUrl = `http://${location.hostname}:${serverPort}/save-data`;
      } else {
        // For production
        saveUrl = '/save-data';
      }
      
      const response = await fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert('Session saved successfully!');
        tracker.reset();
        if (type === 'webcam') {
          webcamTracker.reset();
        }
      } else {
        alert('Error saving session: ' + result.message);
      }
    } catch (e) {
      
      // Check if it's a network error
      if (e.name === 'TypeError' && e.message.includes('fetch')) {
        alert('Connection error: Server might not be running. Please ensure the server is started.');
      } else {
        alert('Error saving session: ' + e.message);
      }
      
      // Store data locally as fallback
      try {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const localStorageKey = `keystroke_data_${type}_${timestamp}`;
        localStorage.setItem(localStorageKey, JSON.stringify(data));
        alert('Data has been saved locally as a backup. Please try again when the server is available.');
      } catch (storageError) {
      }
    }
  }

  // Remplacer les anciens handlers avec des fonctions spécifiques pour chaque mode
  document.getElementById('save-manual').onclick = () => {
    if (confirm("Voulez-vous sauvegarder les données de cette session?")) {
      saveSimpleSession('manual', manualKeystrokeTracker);
    }
  };

  document.getElementById('save-music').onclick = () => {
    if (confirm("Voulez-vous sauvegarder les données de cette session?")) {
      saveSimpleSession('music', musicKeystrokeTracker);
    }
  };

  document.getElementById('save-webcam').onclick = () => {
    if (confirm("Voulez-vous sauvegarder les données de cette session?")) {
      saveWebcamSession(webcamKeystrokeTracker);
    }
  };

  // Fonction simplifiée spécifiquement pour le mode webcam
  async function saveWebcamSession(tracker) {
    
    try {
      // 1. Vérifier si assez de texte
      const keystrokeData = tracker.getData();
      
      if (keystrokeData.text.length < 10) {
        alert('Please type at least 10 characters before saving');
        return false;
      }
      
      // 2. Obtenir les données d'émotions de la webcam
      const webcamData = webcamTracker.getData();
      
      // 3. Si pas d'émotions détectées, demander à l'utilisateur
      let emotionTimeline = webcamData.emotionTimeline || [];
      
      if (emotionTimeline.length === 0) {
        const manualEmotions = ["neutral", "happy", "sad", "angry", "fearful", "surprised"];
        const selectedEmotion = prompt(
          "Aucune émotion n'a été détectée par la caméra. " +
          "Veuillez choisir une émotion manuellement parmi : " + 
          manualEmotions.join(", ") +
          "\nOu cliquez sur Annuler pour ne pas sauvegarder."
        );
        
        if (!selectedEmotion) {
          return false; // L'utilisateur a annulé
        }
        
        // Vérification que l'émotion est valide
        const emotion = manualEmotions.includes(selectedEmotion.toLowerCase()) 
          ? selectedEmotion.toLowerCase() 
          : "neutral";
        
        // Créer une entrée d'émotion
        emotionTimeline = [{
          timestamp: 0,
          emotion: emotion,
          score: 100,
          allEmotions: {
            "neutral": emotion === "neutral" ? 100 : 0,
            "happy": emotion === "happy" ? 100 : 0, 
            "sad": emotion === "sad" ? 100 : 0,
            "angry": emotion === "angry" ? 100 : 0,
            "fearful": emotion === "fearful" ? 100 : 0,
            "surprised": emotion === "surprised" ? 100 : 0,
            "disgusted": 0
          }
        }];
      }
      
      // 4. Préparer les données
      const sessionId = generateUUIDv4();
      const data = {
        type: 'webcam',
        userId: getUserUUID(),
        sessionId: sessionId,
        deviceInfo: getDeviceInfo(),
        text: keystrokeData.text,
        timings: keystrokeData.keystrokeData.map(entry => entry.timeMs),
        sessionDuration: keystrokeData.sessionDurationMs,
        keystrokeCount: keystrokeData.keystrokeCount,
        timestamp: new Date().toISOString(),
        context: 'webcam',
        cameraActive: true,
        emotionTimeline: emotionTimeline
      };
      
      // 5. Sauvegarder en local d'abord (backup)
      const localKey = `keystroke_data_webcam_${sessionId}`;
      localStorage.setItem(localKey, JSON.stringify(data));
      
      // 6. Envoyer au serveur
      
      // Check if the server is running
      let saveUrl;
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        // For local development, we need to include port in the URL
        const serverPort = location.port || '3000'; // Default to 3000 if no port specified
        saveUrl = `http://${location.hostname}:${serverPort}/save-data`;
      } else {
        // For production
        saveUrl = '/save-data';
      }
      
      const response = await fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert('Session saved successfully!');
        tracker.reset();
        webcamTracker.reset();
        return true;
      } else {
        throw new Error(result.message || "Unknown server error");
      }
    } catch (error) {
      alert("La sauvegarde a échoué, mais vos données sont enregistrées localement. Erreur: " + error.message);
      return false;
    }
  }

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
            <h2>Detected Emotions Summary</h2>
            <p>Total detections: ${totalEmotions}</p>
            <div id="emotion-summary" style="margin: 20px 0;">
              ${emotionStats.map(stat => `
                <div style="margin-bottom: 15px;">
                  <div style="display: flex; justify-content: space-between;">
                    <strong>${stat.emotion}</strong>
                    <span>${stat.percentage}% (${stat.count} detections)</span>
                  </div>
                  <div style="background: #eee; height: 20px; width: 100%; border-radius: 4px; margin-top: 5px;">
                    <div style="background: ${getEmotionColor(stat.emotion)}; height: 100%; width: ${stat.percentage}%; border-radius: 4px;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
            <p>Do you want to save this data?</p>
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
              <button id="cancel-save" style="padding: 8px 15px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
              <button id="confirm-save" style="padding: 8px 15px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Save</button>
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

  // Add event handlers for manual emotion buttons
  const emotionButtons = document.querySelectorAll('.emotion-btn');
  emotionButtons.forEach(button => {
    button.addEventListener('click', () => {
      const emotion = button.getAttribute('data-emotion');
      
      // Remove active class from all buttons
      emotionButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      button.classList.add('active');
      
      // Force this emotion in the webcam tracker
      webcamTracker.forceEmotion(emotion, 100);
    });
  });
});