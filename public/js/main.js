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

// === PHRASES FIXES POUR LE MODE FIXED TEXT ===
const FIXED_PHRASES = [
  // Phrases sur les émotions en anglais
  "i feel happy when i listen to my favorite music in the morning",
  "sometimes i am sad when the sky is grey and it rains all day",
  "my heart beats fast when i am surprised by good news",
  "i am calm when i walk alone in the quiet park",
  "i feel fear when i hear strange noises at night",
  "i am angry when things do not go as planned",
  "i am excited when i see my friends after a long time",
  "i feel peaceful when i read a book in silence",
  "i am proud when i finish a difficult task by myself",
  "i feel nervous before speaking in front of many people",
  // Phrases sur les émotions en francais sans accents
  "je ressens de la joie quand je vois mes amis sourire",
  "parfois je me sens triste quand il fait sombre dehors",
  "mon coeur bat vite quand je recois une bonne nouvelle",
  "je suis calme quand j entends le chant des oiseaux le matin",
  "j ai peur quand j entends un bruit etrange la nuit",
  "je suis en colere quand rien ne se passe comme prevu",
  "je suis surpris quand quelqu un me fait un cadeau",
  "je me sens apaise quand je marche dans la foret tranquille",
  "je suis fier quand je termine un travail difficile tout seul",
  "je suis nerveux avant de parler devant beaucoup de gens"
];
let currentFixedPhrase = '';
let currentTypingMode = 'free';

// Variables pour le mode text fixe - musique
let currentMusicFixedPhrase = '';
let currentMusicTypingMode = 'free';

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
  
  // Create emotion modal in English with improved styling
  const emotionModalHtml = `
    <div id="emotion-modal" class="modal hidden">
      <div class="modal-content">
        <h2>How do you feel after this session?</h2>
        <p>Adjust percentage for each emotion:</p>
        <form id="emotion-form">
          <div class="emotion-sliders" style="margin: 20px 0;">
            <div class="emotion-slider-item" style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="width: 90px; font-size: 18px; margin-right: 10px;">😊 Happy</div>
              <input type="range" min="0" max="100" value="0" name="happy" id="happy" style="flex-grow: 1; margin: 0 10px;">
              <span id="happy-val" style="width: 40px; text-align: right;">0</span>%
            </div>
            <div class="emotion-slider-item" style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="width: 90px; font-size: 18px; margin-right: 10px;">😢 Sad</div>
              <input type="range" min="0" max="100" value="0" name="sad" id="sad" style="flex-grow: 1; margin: 0 10px;">
              <span id="sad-val" style="width: 40px; text-align: right;">0</span>%
            </div>
            <div class="emotion-slider-item" style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="width: 90px; font-size: 18px; margin-right: 10px;">😠 Angry</div>
              <input type="range" min="0" max="100" value="0" name="anger" id="anger" style="flex-grow: 1; margin: 0 10px;">
              <span id="anger-val" style="width: 40px; text-align: right;">0</span>%
            </div>
            <div class="emotion-slider-item" style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="width: 90px; font-size: 18px; margin-right: 10px;">😨 Fearful</div>
              <input type="range" min="0" max="100" value="0" name="fear" id="fear" style="flex-grow: 1; margin: 0 10px;">
              <span id="fear-val" style="width: 40px; text-align: right;">0</span>%
            </div>
            <div class="emotion-slider-item" style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="width: 90px; font-size: 18px; margin-right: 10px;">😲 Surprised</div>
              <input type="range" min="0" max="100" value="0" name="surprise" id="surprise" style="flex-grow: 1; margin: 0 10px;">
              <span id="surprise-val" style="width: 40px; text-align: right;">0</span>%
            </div>
            <div class="emotion-slider-item" style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="width: 90px; font-size: 18px; margin-right: 10px;">😐 Neutral</div>
              <input type="range" min="0" max="100" value="0" name="neutral" id="neutral" style="flex-grow: 1; margin: 0 10px;">
              <span id="neutral-val" style="width: 40px; text-align: right;">0</span>%
            </div>
          </div>
          <div class="button-container" style="display: flex; justify-content: center; margin-top: 20px;">
            <button type="submit" class="btn-primary" style="margin: 0 10px;">Submit</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Insert the improved modal HTML
  document.body.insertAdjacentHTML('beforeend', emotionModalHtml);

  // Add a style tag for the emotion modal
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    .emotion-slider-item input[type="range"] {
      height: 8px;
      border-radius: 4px;
      appearance: none;
      background: #e0e0e0;
      outline: none;
    }
    .emotion-slider-item input[type="range"]::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #4361ee;
      cursor: pointer;
    }
    .modal.active {
      opacity: 1 !important;
      visibility: visible !important;
      display: flex !important;
    }
  `;
  document.head.appendChild(styleTag);

  // Affichage dynamique des valeurs des sliders
  ['happy', 'sad', 'anger', 'fear', 'surprise', 'neutral'].forEach(emotion => {
    const input = document.querySelector(`input[name='${emotion}']`);
    const valueDisplay = document.getElementById(`${emotion}-val`);
    if (input && valueDisplay) {
      input.addEventListener('input', e => {
        valueDisplay.textContent = e.target.value;
      });
    }
  });

  // Modifier la fonction askEmotions pour retourner la nouvelle structure
  function askEmotions() {
    return new Promise(resolve => {
      const modal = document.getElementById('emotion-modal');
      modal.classList.remove('hidden');
      modal.classList.add('active');
      const form = document.getElementById('emotion-form');
      
      // Reset previous selections
      ['happy', 'sad', 'anger', 'fear', 'surprise', 'neutral'].forEach(emotion => {
        const input = document.querySelector(`input[name='${emotion}']`);
        if (input) input.value = 0;
        const valueDisplay = document.getElementById(`${emotion}-val`);
        if (valueDisplay) valueDisplay.textContent = '0';
      });
      
      // Nettoyage : supprimer tout bouton Cancel déjà présent
      const oldCancel = form.querySelector('button.cancel-emotion');
      if (oldCancel) oldCancel.remove();
      
      form.onsubmit = e => {
        e.preventDefault();
        
        const emotions = {
          happy: parseInt(document.querySelector('input[name="happy"]').value) || 0,
          sad: parseInt(document.querySelector('input[name="sad"]').value) || 0,
          anger: parseInt(document.querySelector('input[name="anger"]').value) || 0,
          fear: parseInt(document.querySelector('input[name="fear"]').value) || 0,
          surprise: parseInt(document.querySelector('input[name="surprise"]').value) || 0,
          neutral: parseInt(document.querySelector('input[name="neutral"]').value) || 0
        };
        
        modal.classList.add('hidden');
        modal.classList.remove('active');
        resolve(emotions);
      };
      
      // Add Cancel button
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.type = 'button';
      cancelButton.className = 'cancel-emotion';
      cancelButton.style = 'margin: 0 10px; padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;';
      
      cancelButton.onclick = () => {
        modal.classList.add('hidden');
        modal.classList.remove('active');
        // Reset textarea if present
        const textarea = form.closest('.tracking-section')?.querySelector('textarea');
        if (textarea) textarea.value = '';
        resolve(false); // Return false to indicate cancellation
      };
      
      const submitButton = form.querySelector('button[type="submit"]');
      const buttonContainer = submitButton.parentNode;
      
      if (buttonContainer && !form.querySelector('button.cancel-emotion')) {
        buttonContainer.insertBefore(cancelButton, submitButton);
      }
    });
  }

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
  async function saveSimpleSession(type, tracker, options = {}) {
    
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
          context: type,
          ...options // Ajoute fixedText et typingMode si présents
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
      
      // Correction: Adapter les clés du nouvel objet emotions 
      // pour qu'elles correspondent à ce qui est attendu par le serveur
      if (processedEmotions.anger === undefined && processedEmotions.angry !== undefined) {
        processedEmotions.anger = processedEmotions.angry;
        delete processedEmotions.angry;
      }
      
      if (processedEmotions.fear === undefined && processedEmotions.fearful !== undefined) {
        processedEmotions.fear = processedEmotions.fearful;
        delete processedEmotions.fearful;
      }
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
      detectionType: Array.isArray(processedEmotions) ? 'automatic' : 'manual',
      ...options // Ajoute fixedText et typingMode si présents
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
  const saveManualBtn = document.getElementById('save-manual');
  saveManualBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    // Vérification pour le mode fixed : d'abord, et on arrête tout si ce n'est pas bon
    if (currentTypingMode === 'fixed') {
      const userText = typingArea.value.trim();
      // Fonction utilitaire pour normaliser (enlever majuscules, espaces, accents, caractères non-lettres)
      function normalize(str) {
        return str
          .toLowerCase()
          .normalize('NFD').replace(/[ -]/g, '') // retire accents
          .replace(/[^a-z]/g, ''); // ne garde que les lettres
      }
      if (normalize(userText) !== normalize(currentFixedPhrase)) {
        alert('Veuillez recopier exactement la phrase affichée (lettres uniquement, sans tenir compte des majuscules ou accents).');
        return;
      }
    }
    // Ensuite seulement, on vérifie la longueur et on demande les émotions
    await saveSimpleSession(currentTypingMode === 'fixed' ? 'manual-fixed' : 'manual', manualKeystrokeTracker, {
      fixedText: currentTypingMode === 'fixed' ? currentFixedPhrase : undefined,
      typingMode: currentTypingMode
    });
  });

  // Ajout gestion du mode texte libre/fixe pour le mode musique
  const typingModeMusicRadios = document.querySelectorAll('input[name="typing-mode-music"]');
  const fixedTextMusicContainer = document.getElementById('fixed-text-music-container');
  const musicTypingArea = document.getElementById('music-typing-area');

  function setMusicTypingMode(mode) {
    currentMusicTypingMode = mode;
    if (mode === 'fixed') {
      // Choisir une phrase aléatoire
      currentMusicFixedPhrase = FIXED_PHRASES[Math.floor(Math.random() * FIXED_PHRASES.length)];
      fixedTextMusicContainer.textContent = currentMusicFixedPhrase;
      fixedTextMusicContainer.style.display = '';
      musicTypingArea.value = '';
      musicTypingArea.placeholder = 'Recopiez la phrase ci-dessus ici...';
    } else {
      currentMusicFixedPhrase = '';
      fixedTextMusicContainer.textContent = '';
      fixedTextMusicContainer.style.display = 'none';
      musicTypingArea.value = '';
      musicTypingArea.placeholder = 'Type here while listening to music...';
    }
  }

  typingModeMusicRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      setMusicTypingMode(e.target.value);
    });
  });

  // Initialiser le mode par défaut pour la musique
  setMusicTypingMode('free');

  // Modifier le click handler pour le mode musique
  document.getElementById('save-music').onclick = () => {
    // Vérification pour le mode fixed d'abord
    if (currentMusicTypingMode === 'fixed') {
      const userText = musicTypingArea.value.trim();
      // Fonction utilitaire pour normaliser (enlever majuscules, espaces, accents, caractères non-lettres)
      function normalizeMusic(str) {
        return str
          .toLowerCase()
          .normalize('NFD').replace(/[ -]/g, '') // retire accents
          .replace(/[^a-z]/g, ''); // ne garde que les lettres
      }
      if (normalizeMusic(userText) !== normalizeMusic(currentMusicFixedPhrase)) {
        alert('Veuillez recopier exactement la phrase affichée (lettres uniquement, sans tenir compte des majuscules ou accents).');
        return;
      }
    }
    
    // Si on arrive ici, soit c'est un texte libre, soit le texte fixe a été correctement recopié
    if (confirm("Voulez-vous sauvegarder les données de cette session?")) {
      saveSimpleSession(currentMusicTypingMode === 'fixed' ? 'music-fixed' : 'music', musicKeystrokeTracker, {
        fixedText: currentMusicTypingMode === 'fixed' ? currentMusicFixedPhrase : undefined,
        typingMode: currentMusicTypingMode
      });
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

  // Ajout gestion du mode texte libre/fixe
  const typingModeRadios = document.querySelectorAll('input[name="typing-mode"]');
  const fixedTextContainer = document.getElementById('fixed-text-container');
  const typingArea = document.getElementById('typing-area');

  function setTypingMode(mode) {
    currentTypingMode = mode;
    if (mode === 'fixed') {
      // Choisir une phrase aléatoire
      currentFixedPhrase = FIXED_PHRASES[Math.floor(Math.random() * FIXED_PHRASES.length)];
      fixedTextContainer.textContent = currentFixedPhrase;
      fixedTextContainer.style.display = '';
      typingArea.value = '';
      typingArea.placeholder = 'Recopiez la phrase ci-dessus ici...';
    } else {
      currentFixedPhrase = '';
      fixedTextContainer.textContent = '';
      fixedTextContainer.style.display = 'none';
      typingArea.value = '';
      typingArea.placeholder = 'Start typing here to record your keystroke dynamics...';
    }
  }

  typingModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      setTypingMode(e.target.value);
    });
  });

  // Initialiser le mode par défaut
  setTypingMode('free');
});