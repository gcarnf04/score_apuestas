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
    });

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
            renderResults(data);

        } catch (error) {
            console.warn("[Backend Offline/Blocked] Falling back to direct browser Gemini call...", error);
            try {
                // If local server fails, execute the analysis 100% serverless in the browser
                const slipData = await callGeminiDirectly(file, apiKey);
                const auditResult = auditBetClientSide(slipData);
                renderResults(auditResult);
            } catch (fallbackError) {
                showError(fallbackError.message || "Failed to process the bet slip. Please check your API key.");
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

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const prompt = `You are a sports betting risk manager. Analyze this soccer bet slip image and extract the breakdown into the following strict JSON format. RESPOND ENTIRELY IN ENGLISH, translating any team names, competitions, and markets to English if necessary.
JSON structure: {"cuota_total": float, "stake_euros": float or null, "num_eventos": int, "selecciones": [{"evento": str, "mercado": str, "cuota": float, "competicion": str}]}.
Only return valid JSON matching the schema.`;

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
            throw new Error(errData.error?.message || "Failed to communicate with Gemini API. Verify your API Key.");
        }

        const resData = await response.json();
        const text = resData.candidates[0].content.parts[0].text;
        
        // Return parsed JSON data
        return JSON.parse(text.trim());
    }

    // JS Implementation of the 20 audit rules from logic_engine.py
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
});
