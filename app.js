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

    // Dashboard DOM selectors
    const dashboardPanel = document.getElementById('dashboard-panel');
    const dbAvgScore = document.getElementById('db-avg-score');
    const dbTotalBets = document.getElementById('db-total-bets');
    const dbTopBias = document.getElementById('db-top-bias');
    const chartContainer = document.getElementById('chart-container');
    const historyInsightMsg = document.getElementById('history-insight-msg');
    const historyList = document.getElementById('history-list');
    const btnDeleteHistory = document.getElementById('btnDeleteHistory');

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

    let loadingInterval = null;
    let selectedFile = null;

    const loadingTextsEN = [
        "Reading odds and events...",
        "Calculating probability of ruin...",
        "Generating risk audit...",
        "Checking psychological biases...",
        "Analyzing viability in liquid markets...",
        "Evaluating accumulator coverage..."
    ];
    const loadingTextsES = [
        "Leyendo cuotas y eventos...",
        "Calculando probabilidad de ruina...",
        "Generando auditoría de riesgo...",
        "Comprobando sesgos psicológicos...",
        "Analizando viabilidad en mercados líquidos...",
        "Evaluando cobertura de combinada..."
    ];

    // ==========================================
    // 1. VAULT KEY STATUS & PIN HANDLERS
    // ==========================================
    function updateVaultStatusUI() {
        const lang = Lang.get();
        if (Vault.isUnlocked()) {
            keyStatusDot.className = 'status-dot active';
            keyStatusLabel.textContent = lang === 'es' ? 'Clave API Activa' : 'API Key Active';
        } else if (Vault.hasStoredKey()) {
            keyStatusDot.className = 'status-dot error';
            keyStatusLabel.textContent = lang === 'es' ? 'Bloqueado (PIN Requerido)' : 'Locked (PIN Required)';
        } else {
            keyStatusDot.className = 'status-dot';
            keyStatusLabel.textContent = lang === 'es' ? 'Sin clave API' : 'No API Key';
        }
    }

    // Initialize Vault state on load
    updateVaultStatusUI();
    if (Vault.hasStoredKey() && !Vault.isUnlocked()) {
        openLoginModal();
    }

    // Language switcher setup
    const langSelect = document.querySelector('.lang-select');
    if (langSelect) {
        langSelect.value = Lang.get();
        langSelect.addEventListener('change', (e) => {
            Lang.set(e.target.value);
        });
    }
    window.addEventListener('langchange', () => {
        updateVaultStatusUI();
        updateDashboard();
    });

    // Initialize Dashboard
    updateDashboard();

    // Delete history handler
    if (btnDeleteHistory) {
        btnDeleteHistory.addEventListener('click', () => {
            const lang = Lang.get();
            if (confirm(lang === 'es' ? '¿Estás seguro de que quieres borrar todo el historial? Esto restablecerá los KPIs y gráficas.' : 'Are you sure you want to clear your entire audit history? This resets KPIs and charts.')) {
                localStorage.removeItem('betting_audit_history');
                updateDashboard();
            }
        });
    }

    // Auto-focus move for PIN input fields
    function setupPinAutofocus(inputs) {
        inputs.forEach((input, index) => {
            input.addEventListener('input', () => {
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
            if (selectedFile) {
                uploadAndAnalyze(selectedFile);
            }
        } else {
            loginError.textContent = 'Invalid PIN. Try again.';
            clearPinInputs(loginPinInputs);
            loginPinInputs[0].focus();
        }
    });

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

            if (!Vault.isUnlocked()) {
                if (Vault.hasStoredKey()) {
                    openLoginModal();
                } else {
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
        const lang = Lang.get();
        const loadingTexts = lang === 'es' ? loadingTextsES : loadingTextsEN;
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

    // ==========================================
    // 4. API CALL & CLIENT FALLBACK ENGINE
    // ==========================================
    async function uploadAndAnalyze(file) {
        startLoadingAnimation();
        
        const formData = new FormData();
        formData.append('file', file);
        const apiKey = Vault.getUnlockedKey() || '';

        const isGitHubPages = window.location.hostname.endsWith('github.io');
        const isLocalFile = window.location.protocol === 'file:';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        const apiBase = (isGitHubPages || isLocalFile || (isLocalhost && window.location.port !== '8000'))
            ? 'http://localhost:8000'
            : '';

        try {
            // Try hitting local FastAPI backend
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
                    throw new Error(errorData.detail || "Validation failed on the backend.");
                }
                throw new Error(errorData.detail || "Server error.");
            }

            const data = await response.json();
            saveToHistory(data);
            renderResults(data);

        } catch (backendError) {
            console.warn("[Backend Offline/Blocked] Falling back to direct browser Gemini call...", backendError);
            try {
                // If local server fails, execute the analysis 100% serverless in the browser
                const slipData = await callGeminiDirectly(file, apiKey);
                const auditResult = auditBetClientSide(slipData);
                saveToHistory(auditResult);
                renderResults(auditResult);
            } catch (fallbackError) {
                console.error("[Fallback Failed]", fallbackError);
                
                // Show a detailed error message in the UI pointing out both failures
                const backendMsg = backendError.message || backendError;
                const fallbackMsg = fallbackError.message || fallbackError;
                showError(`Audit failed. Backend: (${backendMsg}) | Direct API Fallback: (${fallbackMsg})`);
            }
        } finally {
            stopLoadingAnimation();
        }
    }

    // 100% Serverless Gemini API Vision Call
    async function callGeminiDirectly(file, apiKey) {
        const base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
        });

        const prompt = `You are a sports betting risk manager. Analyze this soccer bet slip image and extract the breakdown into the following strict JSON format. RESPOND ENTIRELY IN ENGLISH, translating any team names, competitions, and markets to English if necessary.
JSON structure: {"cuota_total": float, "stake_euros": float or null, "num_eventos": int, "selecciones": [{"evento": str, "mercado": str, "cuota": float, "competicion": str}]}.
Only return valid JSON matching the schema.`;

        const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash', 'gemini-3-flash', 'gemini-3.1-flash-lite'];
        let lastError = null;

        for (const modelName of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                {
                                    inlineData: {
                                        mimeType: file.type,
                                        data: base64Data
                                    }
                                }
                            ]
                        }],
                        generationConfig: {
                            responseMimeType: "application/json"
                        }
                    })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const errMsg = errData.error?.message || `HTTP ${response.status}`;
                    lastError = new Error(`[${modelName}] ${errMsg}`);
                    if (response.status === 429) {
                        console.warn(`[Quota Exhausted] ${modelName} returned 429. Falling back...`);
                        continue;
                    }
                    throw lastError;
                }

                const resData = await response.json();
                const text = resData.candidates[0].content.parts[0].text;
                return JSON.parse(text.trim());
            } catch (err) {
                lastError = err;
                if (err.status === 429 || (err.message && err.message.includes('429')) || (err.message && err.message.toLowerCase().includes('quota'))) {
                    console.warn(`[Quota/Rate Limit Error] ${modelName}:`, err);
                    continue; // try next model
                }
                throw err;
            }
        }
        throw lastError || new Error("All fallback models exhausted due to rate limit/quota.");
    }

    function auditBetClientSide(bet) {
        const red_flags = [];
        const green_flags = [];
        const lang = Lang.get();

        const cuota_total = parseFloat(bet.cuota_total);
        if (isNaN(cuota_total) || cuota_total <= 1.0) {
            throw new Error("Invalid bet slip data: Total odds must be greater than 1.0.");
        }

        const stake_euros = bet.stake_euros !== null ? parseFloat(bet.stake_euros) : null;
        const num_eventos = parseInt(bet.num_eventos) || 0;
        const selecciones = bet.selecciones || [];
        const probabilidad_implicta = (1 / cuota_total) * 100;

        const competiciones = selecciones.map(s => s.competicion.toLowerCase());
        const unique_competitions = new Set(competiciones);
        const eventos = selecciones.map(s => s.evento.toLowerCase());
        const unique_events = new Set(eventos);

        // --- RED FLAGS ---
        // 1. Frankenstein Accumulator
        if (num_eventos >= 4 && unique_competitions.size > 1) {
            red_flags.push({
                titulo: lang === 'es' ? "Combinada Frankenstein" : "Frankenstein Accumulator",
                mensaje: lang === 'es' ? `Tienes ${num_eventos} eventos de ${unique_competitions.size} competiciones distintas. Es una mezcla caótica que dispara la varianza.` : `You have ${num_eventos} events across ${unique_competitions.size} different competitions. This chaotic mix heavily increases variance.`
            });
        }

        // 2. Correct Score Roulette
        const has_marcador_exacto = selecciones.some(s => s.mercado.toLowerCase().includes("marcador exacto") || s.mercado.toLowerCase().includes("correct score"));
        if (has_marcador_exacto) {
            red_flags.push({
                titulo: lang === 'es' ? "Ruleta del Marcador Exacto" : "Correct Score Roulette",
                mensaje: lang === 'es' ? "Los mercados de marcador exacto tienen un margen de la casa altísimo. Es casi imposible acertar a largo plazo." : "Correct score markets carry an extremely high house edge. It is mathematically unprofitable in the long run."
            });
        }

        // 3. Away Team Trap
        let has_visitante_trap = false;
        for (let s of selecciones) {
            const merc = s.mercado.toLowerCase();
            if (["visitante", "away", "2", "gana 2"].some(term => merc.includes(term)) && !["handicap", "hándicap", "asiático", "asian", "12", "doble oportunidad"].some(term => merc.includes(term))) {
                if (s.cuota >= 1.30 && s.cuota <= 1.50) {
                    has_visitante_trap = true;
                    break;
                }
            }
        }
        if (has_visitante_trap) {
            red_flags.push({
                titulo: lang === 'es' ? "Trampa del Visitante" : "Away Team Trap",
                mensaje: lang === 'es' ? "Cuota de visitante engañosa (1.30 - 1.50). Jugar fuera de casa con cuotas bajas ofrece muy poco valor para el riesgo que conlleva." : "Misleading away odds (1.30 - 1.50). Playing away from home with low odds offers very poor value relative to the risk."
            });
        }

        // 4. Micro-Events
        const micro_events_terms = ["tarjeta", "saque", "tiro", "córner", "corner", "amartilla", "falta", "offsides", "fuera de juego", "amarilla", "roja", "banda", "asistencia", "remates", "shots", "booking", "throw"];
        const has_micro_events = selecciones.some(s => micro_events_terms.some(term => s.mercado.toLowerCase().includes(term)));
        if (has_micro_events) {
            red_flags.push({
                titulo: lang === 'es' ? "Micro-Eventos" : "Micro-Events Volatility",
                mensaje: lang === 'es' ? "Los mercados de tarjetas, saques de banda o tiros son altamente volátiles y están influenciados por factores imposibles de predecir." : "Cards, throw-ins, and shot markets are highly volatile and heavily influenced by unpredictable variables."
            });
        }

        // 5. Moonshot Effect
        if (cuota_total > 100.0) {
            red_flags.push({
                titulo: lang === 'es' ? "Efecto Moonshot" : "Moonshot Effect",
                mensaje: lang === 'es' ? `Una cuota total de ${cuota_total.toFixed(2)} es una lotería. Estás buscando un milagro en lugar de una inversión con valor.` : `A total odd of ${cuota_total.toFixed(2)} is a lottery ticket. You are betting on a miracle rather than finding mathematical value.`
            });
        }

        // 6. Bankroll Suicide
        if (stake_euros !== null && stake_euros > 50.0 && cuota_total > 20.0) {
            red_flags.push({
                titulo: lang === 'es' ? "Suicidio de Bankroll" : "Bankroll Suicide",
                mensaje: lang === 'es' ? `Arriesgar ${stake_euros}€ a una cuota de ${cuota_total.toFixed(2)} es insostenible para cualquier gestión de banca saludable.` : `Risking ${stake_euros}€ on a ${cuota_total.toFixed(2)} odd is unsustainable for healthy bankroll management.`
            });
        }

        // 7. Correlated Selections
        if (unique_events.size < selecciones.length) {
            red_flags.push({
                titulo: lang === 'es' ? "Falsa Correlación" : "Correlated Selections",
                mensaje: lang === 'es' ? "Has combinado varias selecciones en el mismo partido. Las casas de apuestas reducen las cuotas correlacionadas para protegerse." : "You combined multiple selections on the same match. Bookmakers scale down correlated odds to protect their edge."
            });
        }

        // 8. Chasing Losses
        const current_day = new Date().getDay(); // Sunday is 0, Monday is 1, Friday is 5
        if (num_eventos === 1 && (current_day === 1 || current_day === 5)) {
            const day_name = current_day === 1 ? (lang === 'es' ? 'Lunes' : 'Monday') : (lang === 'es' ? 'Viernes' : 'Friday');
            red_flags.push({
                titulo: lang === 'es' ? "Apuesta a Remolque" : "Chasing Losses",
                mensaje: lang === 'es' ? `Apuestas simples en ${day_name} suelen ser impulsivas por falta de partidos principales o para recuperar pérdidas del fin de semana.` : `Single bets placed on ${day_name}s are often impulsive due to lack of major fixtures or trying to recover weekend losses.`
            });
        }

        // 9. Anytime Goalscorer Fallacy
        let has_goleador_trap = false;
        for (let s of selecciones) {
            const merc = s.mercado.toLowerCase();
            if (["goleador", "anota", "anytime", "marca"].some(term => merc.includes(term)) && !["marcador", "ambos", "mitad"].some(term => merc.includes(term))) {
                if (s.cuota < 1.60) {
                    has_goleador_trap = true;
                    break;
                }
            }
        }
        if (has_goleador_trap) {
            red_flags.push({
                titulo: lang === 'es' ? "Falacia de Cualquier Momento" : "Anytime Goalscorer Fallacy",
                mensaje: lang === 'es' ? "Cuotas de goleador por debajo de 1.60 carecen de valor real. Las probabilidades de lesión, sustitución o sequía son demasiado altas." : "Anytime scorer odds below 1.60 offer no value. The probability of injury, early substitution, or cold streaks is too high."
            });
        }

        // 10. Extreme Match Half Condition
        const has_condiciones_extremas = selecciones.some(s => ["ambas mitades", "ganar ambas", "both halves"].some(term => s.mercado.toLowerCase().includes(term)));
        if (has_condiciones_extremas) {
            red_flags.push({
                titulo: lang === 'es' ? "Condiciones Extremas" : "Extreme Match Half Condition",
                mensaje: lang === 'es' ? "Apostar a que un equipo gana ambas mitades requiere un dominio absoluto y constante. El riesgo supera por mucho la recompensa." : "Betting on a team to win both halves requires absolute dominance. The risk far outweighs the reward."
            });
        }

        // --- GREEN FLAGS ---
        // 1. Single Bet Purity
        if (num_eventos === 1) {
            green_flags.push({
                titulo: lang === 'es' ? "Pureza Simple" : "Single Bet Purity",
                mensaje: lang === 'es' ? "Las apuestas individuales reducen la ventaja matemática de la casa de apuestas y permiten una gestión de riesgo profesional." : "Single bets minimize the bookmaker's mathematical edge and support a professional risk management approach."
            });
        }

        // 2. Asian Handicap Safe Haven
        const has_asiatico = selecciones.some(s => ["asiático", "asiatico", "asian"].some(term => s.mercado.toLowerCase().includes(term)));
        if (has_asiatico) {
            green_flags.push({
                titulo: lang === 'es' ? "Refugio Asiático" : "Asian Handicap Safe Haven",
                mensaje: lang === 'es' ? "Los hándicaps y totales asiáticos devuelven parte o todo el dinero si empatas. Excelente control del riesgo." : "Asian handicaps and totals return part or all of your stake in case of specific draws. Outstanding risk control."
            });
        }

        // 3. Optimal Value Zone
        const has_zona_valor = selecciones.some(s => s.cuota >= 1.80 && s.cuota <= 2.20);
        if (has_zona_valor) {
            green_flags.push({
                titulo: lang === 'es' ? "Zona de Valor" : "Optimal Value Zone",
                mensaje: lang === 'es' ? "Tienes selecciones con cuotas en el rango óptimo (1.80 - 2.20), donde suele encontrarse el verdadero valor matemático." : "Your bet slip includes selections in the optimal range (1.80 - 2.20), where mathematical value is most commonly found."
            });
        }

        // 4. Competition Specialist
        if (num_eventos > 1 && unique_competitions.size === 1) {
            green_flags.push({
                titulo: lang === 'es' ? "Especialista" : "Competition Specialist",
                mensaje: lang === 'es' ? `Combinar eventos de la misma competición (${Array.from(unique_competitions)[0].toUpperCase()}) demuestra foco y conocimiento especializado.` : `Combining events from the same competition (${Array.from(unique_competitions)[0].toUpperCase()}) shows focus and specialized league knowledge.`
            });
        }

        // 5. Variance Mitigation
        const has_reduccion_varianza = selecciones.some(s => ["dnb", "doble oportunidad", "empate no valida", "empate no válido", "draw no bet", "double chance"].some(term => s.mercado.toLowerCase().includes(term)));
        if (has_reduccion_varianza) {
            green_flags.push({
                titulo: lang === 'es' ? "Reducción de Varianza" : "Variance Mitigation",
                mensaje: lang === 'es' ? "Uso de Doble Oportunidad o Empate No Válido (DNB). Coberturas inteligentes para amortiguar sorpresas de última hora." : "Utilizing Double Chance or Draw No Bet (DNB) are smart hedging strategies to buffer late upsets."
            });
        }

        // 6. Surgical Double
        if (num_eventos === 2 && cuota_total >= 2.0 && cuota_total <= 3.5 && selecciones.every(s => s.cuota >= 1.30)) {
            green_flags.push({
                titulo: lang === 'es' ? "Combinada Quirúrgica" : "Surgical Double",
                mensaje: lang === 'es' ? "Una combinada doble quirúrgica con buena cuota acumulada y sin selecciones basura de relleno." : "A surgical double accumulator with a strong combined price and no low-value fillers."
            });
        }

        // 7. Fading the Crowd
        let has_desafio_rebano = false;
        for (let s of selecciones) {
            const merc = s.mercado.toLowerCase();
            if (["local", "home", "1", "gana 1"].some(term => merc.includes(term)) && !["visitante", "away", "x", "empate", "dnb", "doble oportunidad"].some(term => merc.includes(term))) {
                if (s.cuota > 3.0) {
                    has_desafio_rebano = true;
                    break;
                }
            }
        }
        if (has_desafio_rebano) {
            green_flags.push({
                titulo: lang === 'es' ? "Desafío al Rebaño" : "Fading the Crowd",
                mensaje: lang === 'es' ? "Apostar al equipo local con cuota > 3.0 suele representar valor cuando el público sobreestima al equipo rival." : "Backing a home underdog at odds > 3.0 often represents value when the crowd overestimates the visiting side."
            });
        }

        // 8. Professional Stake Management
        if (stake_euros !== null && stake_euros < 5.0 && cuota_total > 15.0) {
            green_flags.push({
                titulo: lang === 'es' ? "Stake Profesional" : "Professional Stake Management",
                mensaje: lang === 'es' ? `Gestión correcta: Stake muy bajo (${stake_euros}€) para una cuota arriesgada (${cuota_total.toFixed(2)}).` : `Excellent discipline: keeping a very low stake (${stake_euros}€) for a high-risk price ({cuota_total.toFixed(2)}).`
            });
        }

        // 9. Liquid Major Markets
        const major_leagues = ["la liga", "laliga", "premier", "serie a", "bundesliga", "ligue 1", "champions", "europa league", "world cup", "eurocopa", "primera division"];
        let has_mercados_liquidos = false;
        for (let s of selecciones) {
            const merc = s.mercado.toLowerCase();
            const comp = s.competicion.toLowerCase();
            const is_liquid_market = ["1x2", "resultado final", "ganador", "goles", "total de goles", "más de", "menos de", "over", "under", "ambos marcan"].some(term => merc.includes(term));
            const is_major_league = major_leagues.some(league => comp.includes(league));
            if (is_liquid_market && is_major_league) {
                has_mercados_liquidos = true;
                break;
            }
        }
        if (has_mercados_liquidos) {
            green_flags.push({
                titulo: lang === 'es' ? "Mercados Líquidos" : "Liquid Major Markets",
                mensaje: lang === 'es' ? "Apuestas en mercados principales de ligas mayores. Límites altos de dinero y menor margen de comisión para la casa." : "Betting on primary markets of major leagues. High liquidity limits and lower bookmaker margin."
            });
        }

        // 10. Loser's Shield
        const has_escudo_perdedor = selecciones.some(s => ["+1.5", "+2.5", "+1.75", "+2.25", "+3.5", "+2.0", "+3.0"].some(term => s.mercado.toLowerCase().includes(term)));
        if (has_escudo_perdedor) {
            green_flags.push({
                titulo: lang === 'es' ? "Escudo del Perdedor" : "Loser's Shield",
                mensaje: lang === 'es' ? "Uso de hándicap positivo amplio. Protege tu apuesta incluso si tu equipo pierde el encuentro por un margen corto." : "Using wide positive handicaps protects your bet even if your team loses the match by a tight margin."
            });
        }

        // --- NEW RULES (HISTORICAL & EXTENDED BIASES) ---
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('betting_audit_history')) || [];
        } catch (e) {}

        // 11. Hot Hand Fallacy
        if (history.length > 0) {
            const lastBet = history[history.length - 1];
            if (lastBet && lastBet.toxicity_score >= 80 && stake_euros !== null && lastBet.stake_euros !== null && stake_euros > lastBet.stake_euros * 1.5) {
                red_flags.push({
                    titulo: lang === 'es' ? "Falacia de la Mano Caliente" : "Hot Hand Fallacy",
                    mensaje: lang === 'es' ? `Has incrementado tu stake de ${lastBet.stake_euros}€ a ${stake_euros}€ tras una apuesta con excelente nota. El éxito anterior no altera las matemáticas de esta selección.` : `You increased your stake from ${lastBet.stake_euros}€ to ${stake_euros}€ following a highly-rated audit. Past success does not alter the mathematical probabilities of this current slip.`
                });
            }
        }

        // 12. Chasing Losses / Revenge Betting
        if (history.length > 0) {
            const lastBet = history[history.length - 1];
            if (lastBet && lastBet.toxicity_score < 50) {
                const timeDiffHours = (Date.now() - new Date(lastBet.date).getTime()) / (1000 * 60 * 60);
                if (timeDiffHours < 2) {
                    red_flags.push({
                        titulo: lang === 'es' ? "Apuesta de Venganza / Caza de Pérdidas" : "Chasing Losses / Revenge Betting",
                        mensaje: lang === 'es' ? "Has enviado esta apuesta menos de 2 horas después de recibir una de alto riesgo. Indica conducta impulsiva para recuperar pérdidas." : "You submitted this bet less than 2 hours after a high-risk audit. This strongly signals impulsive behavior to recover losses."
                    });
                }
            }
        }

        // 13. Odds Anchoring
        const lowOddsCount = selecciones.filter(s => s.cuota < 1.25).length;
        if (num_eventos > 2 && lowOddsCount >= 2) {
            red_flags.push({
                titulo: lang === 'es' ? "Anclaje de Cuotas" : "Odds Anchoring Trap",
                mensaje: lang === 'es' ? `Tienes ${lowOddsCount} selecciones con cuotas muy bajas (< 1.25). Agregar cuotas bajas a combinadas acumula el margen de comisión de la casa sin añadir valor proporcional.` : `You have ${lowOddsCount} selections with very low odds (< 1.25). Adding low odds to accumulators compounds the bookmaker's margin without adding proportional value.`
            });
        }

        // 14. Low Odds Overestimation
        if (num_eventos === 1 && cuota_total < 1.20 && stake_euros !== null && stake_euros > 20) {
            red_flags.push({
                titulo: lang === 'es' ? "Sobreestimación de Favoritos" : "Low Odds Overestimation",
                mensaje: lang === 'es' ? `Arriesgar ${stake_euros}€ a cuota ${cuota_total.toFixed(2)} es insensato. Un fallo imprevisto requiere múltiples aciertos a esta cuota para recuperar la banca.` : `Risking ${stake_euros}€ on a ${cuota_total.toFixed(2)} odd is mathematical nonsense. A single upset requires multiple consecutive wins at these odds just to break even.`
            });
        }

        // 11 (Green). EV Search
        if (num_eventos === 1 && cuota_total >= 1.90 && cuota_total <= 2.50) {
            green_flags.push({
                titulo: lang === 'es' ? "Foco en Valor Esperado (+EV)" : "EV Search Focus",
                mensaje: lang === 'es' ? "Apuesta simple en rango ideal. Las cuotas entre 1.90 y 2.50 son ideales para buscar desajustes matemáticos en la casa." : "Single bet in the ideal odds range. Odds between 1.90 and 2.50 are perfect for finding bookmaker pricing errors."
            });
        }

        // 12 (Green). Risk Diversification
        if (num_eventos > 1 && num_eventos <= 3 && unique_competitions.size === num_eventos) {
            green_flags.push({
                titulo: lang === 'es' ? "Riesgo Diversificado" : "Risk Diversification",
                mensaje: lang === 'es' ? "Tienes pocas selecciones y todas de competiciones diferentes. Reduce la correlación negativa entre tus apuestas." : "You have a low number of selections across entirely different competitions. This mitigates negative cross-competition correlation."
            });
        }

        // 13 (Green). Strict Bankroll Management
        if (stake_euros !== null && stake_euros > 0 && stake_euros <= 15) {
            green_flags.push({
                titulo: lang === 'es' ? "Gestión de Banca Prudente" : "Strict Bankroll Control",
                mensaje: lang === 'es' ? `Tu stake de ${stake_euros}€ representa un porcentaje bajo y seguro para evitar el riesgo de ruina súbita.` : `Your stake of ${stake_euros}€ represents a safe, conservative fraction of typical bankrolls, avoiding sudden ruin.`
            });
        }

        // Score computation
        let score = 50 + (green_flags.length * 10) - (red_flags.length * 15);
        score = Math.max(0, Math.min(100, score));

        return {
            cuota_total: cuota_total,
            stake_euros: stake_euros,
            num_eventos: num_eventos,
            probabilidad_implicta: probabilidad_implicta,
            toxicity_score: score,
            red_flags: red_flags,
            green_flags: green_flags
        };
    }

    // ==========================================
    // 5. RESULTS RENDERING
    // ==========================================
    function renderResults(data) {
        kpiCuota.textContent = data.cuota_total.toFixed(2);
        kpiProbabilidad.textContent = `${data.probabilidad_implicta.toFixed(1)}%`;
        kpiScore.textContent = data.toxicity_score;

        const lang = Lang.get();
        let scoreColor = '#ef4444'; // Red
        let riskText = lang === 'es' ? 'Riesgo Crítico' : 'Critical Risk';
        
        if (data.toxicity_score >= 80) {
            scoreColor = '#10b981'; // Green
            riskText = lang === 'es' ? 'Riesgo Bajo (Profesional)' : 'Low Risk (Professional)';
        } else if (data.toxicity_score >= 50) {
            scoreColor = '#f59e0b'; // Amber
            riskText = lang === 'es' ? 'Riesgo Moderado' : 'Moderate Risk';
        } else if (data.toxicity_score >= 30) {
            scoreColor = '#f97316'; // Orange
            riskText = lang === 'es' ? 'Riesgo Alto' : 'High Risk';
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
            redFlagsList.innerHTML = `<div class="no-flags">${lang === 'es' ? 'No se detectaron alertas de riesgo. Excelentes parámetros.' : 'No red flags detected. Excellent selection parameters.'}</div>`;
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
            greenFlagsList.innerHTML = `<div class="no-flags">${lang === 'es' ? 'No se detectaron aspectos de valor.' : 'No value highlights detected.'}</div>`;
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

    // ==========================================
    // 6. HISTORY & DASHBOARD LOGIC
    // ==========================================
    function saveToHistory(data) {
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('betting_audit_history')) || [];
        } catch (e) {
            history = [];
        }
        
        const record = {
            ...data,
            id: Date.now(),
            date: new Date().toISOString()
        };
        history.push(record);
        localStorage.setItem('betting_audit_history', JSON.stringify(history));
        updateDashboard();
    }

    function updateDashboard() {
        const lang = Lang.get();
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('betting_audit_history')) || [];
        } catch (e) {
            history = [];
        }

        if (!dashboardPanel) return;

        if (history.length === 0) {
            dbAvgScore.textContent = '0';
            dbTotalBets.textContent = '0';
            dbTopBias.textContent = lang === 'es' ? 'Ninguno' : 'None';
            chartContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">${lang === 'es' ? 'Aún no hay datos disponibles' : 'No data available yet'}</div>`;
            historyInsightMsg.innerHTML = `<p style="margin:0;">${lang === 'es' ? 'Analiza tu primer ticket de apuesta para ver las sugerencias de conducta de la IA.' : 'Analyze your first betting ticket to see AI behavior insights.'}</p>`;
            historyList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 12px;">${lang === 'es' ? 'No se encontró historial' : 'No history found'}</div>`;
            return;
        }

        const total = history.length;
        const sumScore = history.reduce((acc, curr) => acc + curr.toxicity_score, 0);
        const avgScore = Math.round(sumScore / total);
        dbAvgScore.textContent = avgScore;
        dbTotalBets.textContent = total;

        let scoreColor = '#ef4444';
        if (avgScore >= 80) scoreColor = '#10b981';
        else if (avgScore >= 50) scoreColor = '#f59e0b';
        else if (avgScore >= 30) scoreColor = '#f97316';
        dbAvgScore.style.color = scoreColor;

        const biasCounts = {};
        history.forEach(bet => {
            if (bet.red_flags) {
                bet.red_flags.forEach(flag => {
                    const title = flag.titulo;
                    biasCounts[title] = (biasCounts[title] || 0) + 1;
                });
            }
        });
        
        let topBias = null;
        let maxCount = 0;
        for (const [bias, count] of Object.entries(biasCounts)) {
            if (count > maxCount) {
                maxCount = count;
                topBias = bias;
            }
        }

        if (topBias) {
            dbTopBias.textContent = `${topBias} (${maxCount})`;
            dbTopBias.style.color = '#ef4444';
        } else {
            dbTopBias.textContent = lang === 'es' ? 'Ninguno' : 'None';
            dbTopBias.style.color = 'var(--text-secondary)';
        }

        const chartData = history.slice(-10);
        let svgHtml = '';
        if (chartData.length > 1) {
            const width = 300;
            const height = 110;
            const paddingLeft = 30;
            const paddingRight = 15;
            const paddingTop = 15;
            const paddingBottom = 20;

            const chartWidth = width - paddingLeft - paddingRight;
            const chartHeight = height - paddingTop - paddingBottom;

            const points = chartData.map((bet, i) => {
                const x = paddingLeft + (i / (chartData.length - 1)) * chartWidth;
                const y = paddingTop + ((100 - bet.toxicity_score) / 100) * chartHeight;
                return { x, y, score: bet.toxicity_score };
            });

            const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            const areaD = `${lineD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

            let gridlines = '';
            [0, 50, 100].forEach(val => {
                const y = paddingTop + ((100 - val) / 100) * chartHeight;
                gridlines += `
                    <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" class="chart-grid-line" />
                    <text x="${paddingLeft - 8}" y="${y + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end">${val}</text>
                `;
            });

            const yZero = paddingTop + chartHeight;
            gridlines += `<line x1="${paddingLeft}" y1="${yZero}" x2="${width - paddingRight}" y2="${yZero}" class="chart-axis-line" />`;

            let dots = '';
            points.forEach(p => {
                dots += `<circle cx="${p.x}" cy="${p.y}" r="4" class="chart-dot"><title>${lang === 'es' ? 'Nota' : 'Score'}: ${p.score}</title></circle>`;
            });

            svgHtml = `
                <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="overflow: visible;">
                    <defs>
                        <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="var(--accent-color)" stop-opacity="0.3"></stop>
                            <stop offset="100%" stop-color="var(--accent-color)" stop-opacity="0.0"></stop>
                        </linearGradient>
                    </defs>
                    ${gridlines}
                    <path d="${areaD}" class="chart-area" />
                    <path d="${lineD}" class="chart-line" />
                    ${dots}
                </svg>
            `;
        } else {
            svgHtml = `<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">${lang === 'es' ? 'Se necesitan al menos 2 análisis para trazar evolución' : 'Need at least 2 entries to plot evolution'}</div>`;
        }
        chartContainer.innerHTML = svgHtml;

        let insightMsg = '';
        if (avgScore >= 75) {
            insightMsg = lang === 'es' 
                ? `<div class="history-insight-banner-green"><strong>✅ Patrón de Banca Excelente:</strong> Tu rendimiento histórico es altamente profesional. Mantienes un promedio de riesgo bajo. Sigue aplicando gestión estricta y evita sobreexponerte.</div>`
                : `<div class="history-insight-banner-green"><strong>✅ Excellent Bankroll Pattern:</strong> Your historical performance is highly professional. You maintain a low-risk average. Keep practicing disciplined management.</div>`;
        } else {
            if (topBias) {
                insightMsg = lang === 'es'
                    ? `<div class="history-insight-banner"><strong>🚨 Corrección de Sesgo Urgente:</strong> Tu debilidad recurrente es <strong>"${topBias}"</strong>, detectada ${maxCount} veces. Prioriza mitigar este sesgo en tus próximas selecciones para detener la pérdida de bankroll.</div>`
                    : `<div class="history-insight-banner"><strong>🚨 Urgent Bias Correction:</strong> Your top weakness is <strong>"${topBias}"</strong>, detected ${maxCount} times. Prioritize resolving this bias in your upcoming slips to protect your bankroll.</div>`;
            } else {
                insightMsg = lang === 'es'
                    ? `<div class="history-insight-banner"><strong>⚠️ Alerta de Rendimiento:</strong> Tu promedio actual de ${avgScore} indica una exposición de riesgo alta a largo plazo. Te recomendamos priorizar apuestas simples.</div>`
                    : `<div class="history-insight-banner"><strong>⚠️ Performance Warning:</strong> Your current average of ${avgScore} indicates high long-term risk. We recommend sticking to single bets.</div>`;
            }
        }
        historyInsightMsg.innerHTML = insightMsg;

        historyList.innerHTML = '';
        const reversedHistory = [...history].reverse();
        reversedHistory.forEach((item, index) => {
            const dateStr = new Date(item.date).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const itemDiv = document.createElement('div');
            itemDiv.className = 'history-item';
            
            let itemScoreColor = '#ef4444';
            if (item.toxicity_score >= 80) itemScoreColor = '#10b981';
            else if (item.toxicity_score >= 50) itemScoreColor = '#f59e0b';
            else if (item.toxicity_score >= 30) itemScoreColor = '#f97316';

            const originalIndex = history.length - 1 - index;

            itemDiv.innerHTML = `
                <div class="history-item-left">
                    <div style="font-weight:600; color:var(--text-primary);">
                        ${lang === 'es' ? 'Cuota' : 'Odds'}: ${item.cuota_total.toFixed(2)} (${item.num_eventos} ${lang === 'es' ? 'eventos' : 'events'})
                    </div>
                    <div class="history-item-meta">${dateStr}</div>
                </div>
                <div class="history-item-right">
                    <div class="history-item-score" style="color:${itemScoreColor}; border-color:${itemScoreColor}33;">${item.toxicity_score}</div>
                    <button class="btn btn-ghost btn-sm btn-load-history" data-index="${originalIndex}" style="padding: 2px 6px; font-size:11px;">${lang === 'es' ? 'Detalles' : 'Details'}</button>
                    <button class="btn-icon btn-delete-history-item" data-index="${originalIndex}" style="color:var(--red-flag-color); font-size:16px; background:none; border:none; cursor:pointer;" title="Delete">✕</button>
                </div>
            `;
            historyList.appendChild(itemDiv);
        });

        historyList.querySelectorAll('.btn-load-history').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                renderResults(history[idx]);
                resultsPanel.scrollIntoView({ behavior: 'smooth' });
            });
        });

        historyList.querySelectorAll('.btn-delete-history-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                if (confirm(lang === 'es' ? '¿Eliminar este análisis del historial?' : 'Delete this audit from history?')) {
                    history.splice(idx, 1);
                    localStorage.setItem('betting_audit_history', JSON.stringify(history));
                    updateDashboard();
                }
            });
        });
    }
});


