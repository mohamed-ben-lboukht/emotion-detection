/**
 * Script pour extraire les données de MongoDB vers des fichiers JSON
 */

document.addEventListener('DOMContentLoaded', function() {
  // Ajouter un bouton d'extraction dans le tableau de bord admin
  const extractButton = document.createElement('button');
  extractButton.id = 'extract-mongo-btn';
  extractButton.className = 'btn btn-primary mb-3';
  extractButton.innerHTML = '<i class="fas fa-download mr-2"></i> Extraire données MongoDB vers JSON';
  
  // Ajouter un conteneur pour afficher les résultats
  const resultContainer = document.createElement('div');
  resultContainer.id = 'extract-result';
  resultContainer.className = 'mt-3 p-3 border rounded';
  resultContainer.style.display = 'none';
  
  // Trouver l'endroit où insérer ces éléments dans le tableau de bord
  const targetSection = document.querySelector('#data-section') || 
                       document.querySelector('.container') || 
                       document.querySelector('main');
  
  if (targetSection) {
    // Créer une section pour la fonctionnalité d'extraction
    const extractSection = document.createElement('div');
    extractSection.className = 'card mb-4';
    extractSection.innerHTML = `
      <div class="card-header">
        <h5 class="mb-0"><i class="fas fa-database"></i> Extraction MongoDB vers JSON</h5>
      </div>
      <div class="card-body">
        <p>Cette fonctionnalité permet d'extraire toutes les données stockées dans MongoDB et de les convertir en fichiers JSON.</p>
        <div id="extract-button-container"></div>
        <div id="extract-result-container"></div>
      </div>
    `;
    
    targetSection.appendChild(extractSection);
    
    // Ajouter le bouton et le conteneur de résultats
    document.getElementById('extract-button-container').appendChild(extractButton);
    document.getElementById('extract-result-container').appendChild(resultContainer);
    
    // Ajouter l'écouteur d'événement pour le bouton
    extractButton.addEventListener('click', extractMongoData);
  } else {
    console.error("Impossible de trouver une section pour ajouter la fonctionnalité d'extraction");
  }
  
  // Fonction pour extraire les données
  function extractMongoData() {
    extractButton.disabled = true;
    extractButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Extraction en cours...';
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin fa-2x mb-3"></i><p>Extraction des données en cours...</p></div>';
    
    // Appeler l'API d'extraction
    fetch('/admin/extract-data?password=admin123', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      extractButton.disabled = false;
      extractButton.innerHTML = '<i class="fas fa-download mr-2"></i> Extraire données MongoDB vers JSON';
      
      if (data.success) {
        resultContainer.innerHTML = `
          <div class="alert alert-success">
            <h5><i class="fas fa-check-circle mr-2"></i> Extraction réussie!</h5>
            <p>${data.count} fichiers ont été extraits avec succès.</p>
          </div>
          <div class="mt-3">
            <a href="/json-files" class="btn btn-outline-primary" target="_blank">
              <i class="fas fa-list mr-2"></i> Voir les fichiers JSON
            </a>
          </div>
        `;
      } else {
        resultContainer.innerHTML = `
          <div class="alert alert-warning">
            <h5><i class="fas fa-exclamation-triangle mr-2"></i> Information</h5>
            <p>${data.message || 'Aucune donnée extraite.'}</p>
          </div>
        `;
      }
    })
    .catch(error => {
      extractButton.disabled = false;
      extractButton.innerHTML = '<i class="fas fa-download mr-2"></i> Extraire données MongoDB vers JSON';
      resultContainer.innerHTML = `
        <div class="alert alert-danger">
          <h5><i class="fas fa-times-circle mr-2"></i> Erreur</h5>
          <p>${error.message}</p>
          <p>Vérifiez la connexion à MongoDB ou les logs serveur pour plus de détails.</p>
        </div>
      `;
    });
  }
}); 