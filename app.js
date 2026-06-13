document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const uploadContent = document.getElementById('upload-content');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeBtn = document.getElementById('remove-btn');
    
    const loadingState = document.getElementById('loading-state');
    const loadingMessage = document.getElementById('loading-message');
    const errorBanner = document.getElementById('error-banner');
    
    const resultsPanel = document.getElementById('results-panel');
    const kpiCuota = document.getElementById('kpi-cuota');
    const kpiProbabilidad = document.getElementById('kpi-probabilidad');
    const kpiScore = document.getElementById('kpi-score');
    const scoreCard = document.getElementById('score-card');
    const riskLabel = document.getElementById('risk-label');
    const riskBarFill = document.getElementById('risk-bar-fill');
    
    const redFlagsList = document.getElementById('red-flags-list');
    const greenFlagsList = document.getElementById('green-flags-list');
    const resetBtn = document.getElementById('reset-btn');

    // Vault DOM elements
    const btnOpenSetup = document.getElementById('btnOpenSetup');
    const keyStatusDot = document.getElementById('keyStatusDot');
    const keyStatusLabel = document.getElementById('keyStatusLabel');
    const setupModal = document.getElementById('setupModal');
    const btnCloseSetup = document.getElementById('btnCloseSetup');
    const btnCancelSetup = document.getElementById('btnCancelSetup');
    const btnSaveKey = document.getElementById('btnSaveKey');
    const btnClearKey = document.getElementById('btnClearKey');
    const modalApiKeyInput = document.getElementById('modalApiKeyInput');
    const btnToggleApiKey = document.getElementById('btnToggleApiKey');
    const modalError = document.getElementById('modalError');
    const setupPinInputs = document.querySelectorAll('#setupPinInputs .pin-input');

    const loginModal = document.getElementById('loginModal');
    const btnCancelLogin = document.getElementById('btnCancelLogin');
    const btnUnlock = document.getElementById('btnUnlock');
    const loginPinInputs = document.querySelectorAll('#loginPinInputs .pin-input');
    const loginError = document.getElementById('loginError');

    // Interstitial Ad DOM Elements
    const interstitialAd = document.getElementById('interstitial-ad');
    const adCountdown = document.getElementById('ad-countdown');
    const btnSkipAd = document.getElementById('btn-skip-ad');

    let loadingInterval = null;
    let selectedFile = null;

    const loadingTexts = [
        "Reading odds and events...",
        "Calculating probability of ruin...",
        "Generating risk audit...",
        "Checking psychological biases...",
        "Analyzing viability in liquid markets...",
        "Evaluating accumulator coverage..."
    ];

    // ==========================================
    // 1. VAULT KEY STATUS & PIN HANDLERS
    // ==========================================
    function updateVaultStatusUI() {
        if (Vault.isUnlocked()) {
            keyStatusDot.className = 'status-dot active';
            keyStatusLabel.textContent = 'API Key Active';
        } else if (Vault.hasStoredKey()) {
            keyStatusDot.className = 'status-dot error';
            keyStatusLabel.textContent = 'Locked (PIN Required)';
        } else {
            keyStatusDot.className = 'status-dot';
            keyStatusLabel.textContent = 'No API Key';
        }
    }

    // Initialize Vault state on load
    updateVaultStatusUI();
    if (Vault.hasStoredKey() && !Vault.isUnlocked()) {
        openLoginModal();
    }

    // Auto-focus move for PIN input fields
    function setupPinAutofocus(inputs) {
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                // Keep only digits
                input.value = input.value.replace(/\D/g, '');
                if (input.value && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });
        });
    }
    setupPinAutofocus(setupPinInputs);
    setupPinAutofocus(loginPinInputs);

    function getPinFromInputs(inputs) {
        let pin = '';
        inputs.forEach(input => pin += input.value);
        return pin.length === 4 ? pin : null;
    }

    function clearPinInputs(inputs) {
        inputs.forEach(input => input.value = '');
    }

    // Toggle API Key visibility
    btnToggleApiKey.addEventListener('click', () => {
        const type = modalApiKeyInput.type === 'password' ? 'text' : 'password';
        modalApiKeyInput.type = type;
    });

    // Open/Close Setup Modal
    btnOpenSetup.addEventListener('click', () => {
        modalApiKeyInput.value = Vault.isUnlocked() ? Vault.getUnlockedKey() : '';
        modalError.textContent = '';
        clearPinInputs(setupPinInputs);
        if (Vault.hasStoredKey()) {
            btnClearKey.style.display = 'block';
        } else {
            btnClearKey.style.display = 'none';
        }
        setupModal.classList.remove('hidden');
    });

    function closeSetupModal() {
        setupModal.classList.add('hidden');
    }
    btnCloseSetup.addEventListener('click', closeSetupModal);
    btnCancelSetup.addEventListener('click', closeSetupModal);

    // Save Key from Setup Modal
    btnSaveKey.addEventListener('click', () => {
        const apiKey = modalApiKeyInput.value.trim();
        const pin = getPinFromInputs(setupPinInputs);

        if (!apiKey.startsWith('AIza')) {
            modalError.textContent = 'Please enter a valid Gemini API Key (starts with AIza).';
            return;
        }
        if (!pin) {
            modalError.textContent = 'Please enter a 4-digit PIN.';
            return;
        }

        const success = Vault.saveKey(apiKey, pin);
        if (success) {
            updateVaultStatusUI();
            closeSetupModal();
        } else {
            modalError.textContent = 'Failed to save key. Please try again.';
        }
    });

    // Delete Key
    btnClearKey.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete the stored API key?')) {
            Vault.clearKey();
            updateVaultStatusUI();
            closeSetupModal();
        }
    });

    // Login Modals
    function openLoginModal() {
        loginError.textContent = '';
        clearPinInputs(loginPinInputs);
        loginModal.classList.remove('hidden');
        setTimeout(() => loginPinInputs[0].focus(), 100);
    }

    function closeLoginModal() {
        loginModal.classList.add('hidden');
    }
    btnCancelLogin.addEventListener('click', closeLoginModal);

    btnUnlock.addEventListener('click', () => {
        const pin = getPinFromInputs(loginPinInputs);
        if (!pin) {
            loginError.textContent = 'Please enter your 4-digit PIN.';
            return;
        }

        const decrypted = Vault.loadKey(pin);
        if (decrypted) {
            updateVaultStatusUI();
            closeLoginModal();
            // If there's an active upload pending, run it
            if (selectedFile) {
                uploadAndAnalyze(selectedFile);
            }
        } else {
            loginError.textContent = 'Invalid PIN. Try again.';
            clearPinInputs(loginPinInputs);
            loginPinInputs[0].focus();
        }
    });

    // Interstitial Ad Flow removed to comply with zero-gating AdSense rules

    // ==========================================
    // 3. FILE SELECTION & UPLOAD HANDLERS
    // ==========================================
    dropzone.addEventListener('click', (e) => {
        if (e.target !== removeBtn && e.target !== fileInput) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFile(files[0]);
        }
    });

    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearFile();
    });

    resetBtn.addEventListener('click', () => {
        clearFile();
        resultsPanel.classList.add('hidden');
        resultsPanel.classList.remove('fade-in');
    });

    function handleFile(file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showError("Unsupported file format. Please upload JPEG, PNG, or WEBP.");
            clearFile();
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showError("File size exceeds the 5 MB limit.");
            clearFile();
            return;
        }

        hideError();
        resultsPanel.classList.add('hidden');
        selectedFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            uploadContent.classList.add('hidden');
            previewContainer.classList.remove('hidden');

            // Enforce vault unlock before running the analysis
            if (!Vault.isUnlocked()) {
                if (Vault.hasStoredKey()) {
                    openLoginModal();
                } else {
                    // Force setup key modal
                    btnOpenSetup.click();
                    showError("API Key required. Enter your key in the vault modal first.");
                }
            } else {
                uploadAndAnalyze(file);
            }
        };
        reader.readAsDataURL(file);
    }

    function clearFile() {
        fileInput.value = '';
        imagePreview.src = '';
        previewContainer.classList.add('hidden');
        uploadContent.classList.remove('hidden');
        selectedFile = null;
    }

    function startLoadingAnimation() {
        loadingState.classList.remove('hidden');
        let index = 0;
        loadingMessage.textContent = loadingTexts[0];
        
        loadingInterval = setInterval(() => {
            index = (index + 1) % loadingTexts.length;
            loadingMessage.textContent = loadingTexts[index];
        }, 1200);
    }

    function stopLoadingAnimation() {
        clearInterval(loadingInterval);
        loadingState.classList.add('hidden');
    }

    function showError(message) {
        errorBanner.textContent = message;
        errorBanner.classList.remove('hidden');
    }

    function hideError() {
        errorBanner.classList.add('hidden');
    }

    async function uploadAndAnalyze(file) {
        startLoadingAnimation();
        
        const formData = new FormData();
        formData.append('file', file);

        // Fetch decrypted key from vault
        const apiKey = Vault.getUnlockedKey() || '';

        // Dynamically determine API URL based on protocol/port or GitHub Pages hosting
        const isGitHubPages = window.location.hostname.endsWith('github.io');
        const isLocalFile = window.location.protocol === 'file:';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        const apiBase = (isGitHubPages || isLocalFile || (isLocalhost && window.location.port !== '8000'))
            ? 'http://127.0.0.1:8000'
            : '';

        try {
            const response = await fetch(`${apiBase}/api/analyze-bet`, {
                method: 'POST',
                headers: {
                    'X-Gemini-API-Key': apiKey
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 422) {
                    throw new Error(errorData.detail || "No valid soccer bet slip detected in the image. Please upload a clearer capture.");
                }
                throw new Error(errorData.detail || "Server error while processing your bet slip.");
            }

            const data = await response.json();
            renderResults(data);

        } catch (error) {
            showError(error.message);
        } finally {
            stopLoadingAnimation();
        }
    }

    function renderResults(data) {
        kpiCuota.textContent = data.cuota_total.toFixed(2);
        kpiProbabilidad.textContent = `${data.probabilidad_implicta.toFixed(1)}%`;
        kpiScore.textContent = data.toxicity_score;

        let scoreColor = '#ef4444'; // Red
        let riskText = 'Critical Risk';
        
        if (data.toxicity_score >= 80) {
            scoreColor = '#10b981'; // Green
            riskText = 'Low Risk (Professional)';
        } else if (data.toxicity_score >= 50) {
            scoreColor = '#f59e0b'; // Amber
            riskText = 'Moderate Risk';
        } else if (data.toxicity_score >= 30) {
            scoreColor = '#f97316'; // Orange
            riskText = 'High Risk';
        }

        scoreCard.style.borderColor = scoreColor;
        const scoreValueEl = scoreCard.querySelector('.kpi-value');
        scoreValueEl.style.color = scoreColor;
        
        riskLabel.textContent = riskText;
        riskLabel.style.color = scoreColor;
        riskBarFill.style.width = `${data.toxicity_score}%`;

        // Render Red Flags
        redFlagsList.innerHTML = '';
        if (data.red_flags.length === 0) {
            redFlagsList.innerHTML = '<div class="no-flags">No red flags detected. Excellent selection parameters.</div>';
        } else {
            data.red_flags.forEach(flag => {
                const card = document.createElement('div');
                card.className = 'flag-card red-flag-item';
                card.innerHTML = `
                    <h4>${flag.titulo}</h4>
                    <p>${flag.mensaje}</p>
                `;
                redFlagsList.appendChild(card);
            });
        }

        // Render Green Flags
        greenFlagsList.innerHTML = '';
        if (data.green_flags.length === 0) {
            greenFlagsList.innerHTML = '<div class="no-flags">No value highlights detected.</div>';
        } else {
            data.green_flags.forEach(flag => {
                const card = document.createElement('div');
                card.className = 'flag-card green-flag-item';
                card.innerHTML = `
                    <h4>${flag.titulo}</h4>
                    <p>${flag.mensaje}</p>
                `;
                greenFlagsList.appendChild(card);
            });
        }

        resultsPanel.classList.remove('hidden');
        resultsPanel.classList.add('fade-in');
    }
});
