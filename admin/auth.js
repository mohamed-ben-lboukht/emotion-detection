/**
 * Module d'authentification pour l'administration
 * Gère la connexion, déconnexion et protection des routes
 */

// Clé pour le stockage des informations d'authentification
const AUTH_KEY = 'emotion_detection_admin_auth';
const API_BASE_URL = '/api/admin'; // À ajuster selon la configuration du backend

/**
 * Vérifie si l'utilisateur est connecté
 * @returns {boolean} - true si l'utilisateur est connecté, false sinon
 */
export function isAuthenticated() {
    const authData = localStorage.getItem(AUTH_KEY);
    if (!authData) return false;
    
    try {
        const auth = JSON.parse(authData);
        // Vérifier la validité du token (expiré ou non)
        return auth && auth.token && auth.expiresAt && new Date(auth.expiresAt) > new Date();
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        return false;
    }
}

/**
 * Obtient l'utilisateur actuellement connecté
 * @returns {Object|null} - Informations sur l'utilisateur connecté ou null
 */
export function getCurrentUser() {
    if (!isAuthenticated()) return null;
    
    try {
        const authData = JSON.parse(localStorage.getItem(AUTH_KEY));
        return authData ? authData.user : null;
    } catch (error) {
        console.error('Erreur lors de la récupération des données utilisateur:', error);
        return null;
    }
}

/**
 * Récupère le token d'authentification
 * @returns {string|null} - Token d'authentification ou null
 */
export function getAuthToken() {
    if (!isAuthenticated()) return null;
    
    try {
        const authData = JSON.parse(localStorage.getItem(AUTH_KEY));
        return authData ? authData.token : null;
    } catch (error) {
        console.error('Erreur lors de la récupération du token:', error);
        return null;
    }
}

/**
 * Tentative de connexion
 * @param {string} username - Nom d'utilisateur
 * @param {string} password - Mot de passe
 * @returns {Promise<Object>} - Résultat de la tentative de connexion
 */
export async function login(username, password) {
    try {
        // Pour des tests locaux, vous pouvez utiliser cette validation
        // À remplacer par un appel API dans un environnement de production
        if (process.env.NODE_ENV === 'development' && username === 'admin' && password === 'admin123') {
            const mockResponse = {
                success: true,
                user: {
                    id: 1,
                    name: 'Administrateur',
                    email: 'admin@example.com',
                    role: 'admin'
                },
                token: 'mock-jwt-token-for-development',
                expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 heures
            };
            
            // Sauvegarder en localStorage
            localStorage.setItem(AUTH_KEY, JSON.stringify(mockResponse));
            return { success: true, user: mockResponse.user };
        }

        // Implémentation réelle pour la production
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erreur de connexion');
        }
        
        if (data.success && data.token) {
            // Sauvegarder les informations d'authentification
            localStorage.setItem(AUTH_KEY, JSON.stringify({
                user: data.user,
                token: data.token,
                expiresAt: data.expiresAt || new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
            }));
            
            return { success: true, user: data.user };
        } else {
            throw new Error(data.message || 'Identifiants invalides');
        }
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        throw error;
    }
}

/**
 * Déconnexion de l'utilisateur
 */
export function logout() {
    localStorage.removeItem(AUTH_KEY);
    
    // Redirection vers la page de connexion
    window.location.href = '/admin/login.html';
    
    // Pour une déconnexion complète, vous pouvez également appeler une API de déconnexion
    // fetch(`${API_BASE_URL}/logout`, { method: 'POST', credentials: 'include' });
}

/**
 * Vérifie l'authentification et redirige si non connecté
 * Utilisé pour protéger les pages d'administration
 */
export function requireAuth() {
    if (!isAuthenticated()) {
        // Sauvegarder l'URL actuelle pour y revenir après connexion
        const currentPage = window.location.pathname;
        if (currentPage !== '/admin/login.html') {
            sessionStorage.setItem('redirect_after_login', currentPage);
        }
        
        // Redirection vers la page de connexion
        window.location.href = '/admin/login.html';
        return false;
    }
    return true;
}

/**
 * Ajoute le token d'authentification aux en-têtes de requête
 * @param {Object} headers - En-têtes de requête
 * @returns {Object} - En-têtes avec le token d'authentification
 */
export function addAuthHeader(headers = {}) {
    const token = getAuthToken();
    if (token) {
        return {
            ...headers,
            'Authorization': `Bearer ${token}`
        };
    }
    return headers;
}

/**
 * Effectue une requête API authentifiée
 * @param {string} endpoint - Point d'API à appeler
 * @param {Object} options - Options de la requête fetch
 * @returns {Promise<Object>} - Réponse de l'API
 */
export async function fetchWithAuth(endpoint, options = {}) {
    const token = getAuthToken();
    if (!token) {
        throw new Error('Utilisateur non authentifié');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include'
        });
        
        if (response.status === 401) {
            // Token expiré ou invalide, déconnexion
            logout();
            throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de la requête API');
        }
        
        return data;
    } catch (error) {
        console.error(`Erreur lors de l'appel à ${endpoint}:`, error);
        throw error;
    }
} 