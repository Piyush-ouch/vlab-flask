document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const elements = {
        bob: document.getElementById('bob'),
        stringContainer: document.querySelector('.pendulum-string-container'),
        stringElement: document.querySelector('.pendulum-string'),
        startBtn: document.getElementById('start-btn'),
        resetBtn: document.getElementById('reset-btn'),
        oscillationsInput: document.getElementById('oscillations'),
        lengthInput: document.getElementById('length'),
        dataBody: document.getElementById('data-body'),
        averageBtn: document.getElementById('average-btn'),
        averageResult: document.getElementById('average-result'),
        phaseDisplay: document.getElementById('phase-difference-value'),
        timeDisplay: document.getElementById('time-difference'),
        phaseGraphCanvas: document.getElementById('phaseGraph'),
        stopwatchDisplay: document.querySelector('.stopwatch-display')
    };

    // Constants
    const PHYSICS = {
        GRAVITY: 9.8,
        BASE_LENGTH: 300 // pixels for 100cm
    };

    // State Management
    const state = {
        isDragging: false,
        startAngle: 15,
        animationId: null,
        lastAngle: 0,
        oscillationCount: 0,
        currentLength: PHYSICS.BASE_LENGTH,
        trialNumber: 1,
        isFreshStart: true,
        phaseDifference: 0,
        lastZeroCrossingTime: 0,
        currentPeriod: 0,
        periodMeasurements: [],
        phaseMeasurements: [],
        stopwatchInterval: null,
        stopwatchStartTime: 0,
        elapsedTime: 0,
        isStopwatchRunning: false,
        isPendulumRunning: false,
        pendulumStartTime: 0,
        trialData: [],
        lastFrameTime: 0,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    };

    // Performance Settings
    const performanceSettings = {
        mobileFrameRate: 30,
        frameInterval: 1000 / 30,
        stopwatchInterval: () => state.isMobile ? 50 : 10
    };

    // Initialize
    function init() {
        createStopwatchDisplay();
        updateLength();
        initializePhaseGraph();
        setupEventListeners();
        updateButtonStates();
    }

    function createStopwatchDisplay() {
        elements.stopwatchDisplay.innerHTML = '';
        
        const minutesDisplay = document.createElement('span');
        minutesDisplay.id = 'minutes';
        minutesDisplay.textContent = '00';
        
        const secondsDisplay = document.createElement('span');
        secondsDisplay.id = 'seconds';
        secondsDisplay.textContent = '00';
        
        const millisecondsDisplay = document.createElement('span');
        millisecondsDisplay.id = 'milliseconds';
        millisecondsDisplay.textContent = '00';

        elements.stopwatchDisplay.appendChild(minutesDisplay);
        elements.stopwatchDisplay.appendChild(document.createTextNode(':'));
        elements.stopwatchDisplay.appendChild(secondsDisplay);
        elements.stopwatchDisplay.appendChild(document.createTextNode('.'));
        elements.stopwatchDisplay.appendChild(millisecondsDisplay);
    }

    function setupEventListeners() {
        // Touch and mouse events
        elements.bob.addEventListener('mousedown', startDrag);
        elements.bob.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
        
        // Control buttons
        elements.startBtn.addEventListener('click', startExperiment);
        document.getElementById('stopwatch-start').addEventListener('click', startExperiment);
        elements.resetBtn.addEventListener('click', resetPendulum);
        document.getElementById('stopwatch-stop').addEventListener('click', stopExperiment);
        
        // Inputs
        elements.lengthInput.addEventListener('input', updateLength);
        elements.averageBtn.addEventListener('click', calculateAverage);
    }

    // Core Pendulum Functions
    function startExperiment() {
        if (state.isPendulumRunning) return;

        resetExperimentState();
        setInitialAngle();
        startTiming();
        
        const oscillations = parseInt(elements.oscillationsInput.value) || 5;
        const lengthCm = parseInt(elements.lengthInput.value) || 50;

        if (state.animationId) cancelAnimationFrame(state.animationId);
        state.animationId = requestAnimationFrame((t) => animatePendulum(t, oscillations, lengthCm));
    }

    function resetExperimentState() {
        state.oscillationCount = 0;
        state.lastZeroCrossingTime = 0;
        state.periodMeasurements = [];
        state.phaseMeasurements = [];
        state.lastFrameTime = 0;
        resetStopwatch();
    }

    function setInitialAngle() {
        state.startAngle = 60;
        state.lastAngle = state.startAngle;
        elements.stringContainer.style.transform = `translateX(-50%) rotate(${state.startAngle}deg)`;
    }

    function startTiming() {
        state.stopwatchStartTime = Date.now() - state.elapsedTime;
        state.pendulumStartTime = Date.now();
        state.stopwatchInterval = setInterval(updateStopwatch, performanceSettings.stopwatchInterval());
        state.isStopwatchRunning = true;
        state.isPendulumRunning = true;
        state.isFreshStart = false;
        updateButtonStates();
    }

    function animatePendulum(timestamp, oscillations, lengthCm) {
        // Throttle animation for mobile
        const now = Date.now();
        const deltaTime = now - state.lastFrameTime;
        
        if (state.isMobile && deltaTime < performanceSettings.frameInterval) {
            state.animationId = requestAnimationFrame((t) => animatePendulum(t, oscillations, lengthCm));
            return;
        }
        state.lastFrameTime = now - (deltaTime % performanceSettings.frameInterval);

        // Calculate pendulum position
        const elapsed = (now - state.pendulumStartTime) / 1000;
        const lengthM = lengthCm / 100;
        state.currentPeriod = 2 * Math.PI * Math.sqrt(lengthM / PHYSICS.GRAVITY);
        const angle = state.startAngle * Math.cos(2 * Math.PI * elapsed / state.currentPeriod);

        // Update display
        state.phaseDifference = (2 * Math.PI * (elapsed % state.currentPeriod)) / state.currentPeriod;
        elements.phaseDisplay.textContent = state.phaseDifference.toFixed(3);
        elements.stringContainer.style.transform = `translateX(-50%) rotate(${angle}deg)`;

        // Count oscillations precisely
        countOscillations(angle, elapsed);

        // Check for completion
        if (state.oscillationCount >= oscillations && Math.abs(angle) < 1) {
            completeExperiment(oscillations, elapsed);
            return;
        }

        state.lastAngle = angle;
        state.animationId = requestAnimationFrame((t) => animatePendulum(t, oscillations, lengthCm));
    }

    function countOscillations(currentAngle, elapsed) {
        const currentSign = Math.sign(currentAngle);
        const lastSign = Math.sign(state.lastAngle);

        if (currentSign !== 0 && lastSign !== 0 && currentSign !== lastSign) {
            state.oscillationCount += 0.5;
            if (state.oscillationCount % 1 === 0) {
                const period = elapsed - state.lastZeroCrossingTime;
                state.lastZeroCrossingTime = elapsed;
                state.periodMeasurements.push(period);
                state.phaseMeasurements.push(state.phaseDifference);
            }
        }
    }

    function completeExperiment(oscillations, elapsedTime) {
        stopStopwatch();
        addDataToTable(oscillations, elapsedTime);
        state.isPendulumRunning = false;
        state.isFreshStart = true;
        updateButtonStates();
    }

    // Stopwatch Functions
    function updateStopwatch() {
        const currentTime = Date.now();
        state.elapsedTime = currentTime - state.stopwatchStartTime;

        const minutes = Math.floor(state.elapsedTime / 60000);
        const seconds = Math.floor((state.elapsedTime % 60000) / 1000);
        const milliseconds = Math.floor((state.elapsedTime % 1000) / 10);

        document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
        document.getElementById('milliseconds').textContent = milliseconds.toString().padStart(2, '0');
    }

    function stopStopwatch() {
        clearInterval(state.stopwatchInterval);
        state.isStopwatchRunning = false;
    }

    function resetStopwatch() {
        stopStopwatch();
        state.elapsedTime = 0;
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
        document.getElementById('milliseconds').textContent = '00';
    }

    // Drag Functions
    function startDrag(e) {
        e.preventDefault();
        state.isDragging = true;
        elements.bob.style.cursor = 'grabbing';

        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
            state.animationId = null;
            state.isPendulumRunning = false;
        }
        updateButtonStates();
    }

    function drag(e) {
        if (!state.isDragging) return;
        e.preventDefault();

        const container = document.querySelector('.pendulum-container');
        const rect = container.getBoundingClientRect();
        const stringContainerRect = elements.stringContainer.getBoundingClientRect();

        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        const pivotX = rect.left + rect.width / 2;
        const pivotY = stringContainerRect.top;

        const deltaX = clientX - pivotX;
        const deltaY = clientY - pivotY;

        let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        angle = Math.max(-60, Math.min(60, angle));

        elements.stringContainer.style.transform = `translateX(-50%) rotate(${angle}deg)`;
        state.startAngle = angle;
        state.lastAngle = angle;
    }

    function stopDrag() {
        state.isDragging = false;
        elements.bob.style.cursor = 'grab';
    }

    // UI Functions
    function updateButtonStates() {
        const buttons = {
            start: document.getElementById('stopwatch-start'),
            stop: document.getElementById('stopwatch-stop'),
            mainStart: elements.startBtn,
            reset: elements.resetBtn,
            average: elements.averageBtn
        };

        buttons.start.disabled = state.isStopwatchRunning || state.isPendulumRunning;
        buttons.stop.disabled = !state.isStopwatchRunning || !state.isPendulumRunning;
        buttons.mainStart.disabled = state.isPendulumRunning || state.isStopwatchRunning;
        buttons.reset.disabled = !state.isPendulumRunning && !state.isStopwatchRunning && state.trialData.length === 0;
        buttons.average.disabled = state.trialData.length === 0;
    }

    function updateLength() {
        const lengthCm = parseInt(elements.lengthInput.value) || 50;
        const scale = lengthCm / 100;
        state.currentLength = PHYSICS.BASE_LENGTH * scale;
        elements.stringElement.style.height = `${state.currentLength}px`;
    }

    // Data Functions
    function addDataToTable(oscillations, totalTime) {
        const period = (totalTime / oscillations).toFixed(2);
        const trial = {
            number: state.trialNumber,
            oscillations: oscillations,
            totalTime: totalTime.toFixed(2),
            period: period
        };

        state.trialData.push(trial);
        const lengthCm = parseInt(elements.lengthInput.value) || 50;
        updateLengthVsT2Graph(lengthCm, period);

        const row = `
            <tr>
                <td>${trial.number}</td>
                <td>${trial.oscillations}</td>
                <td>${trial.totalTime}</td>
                <td>${trial.period}</td>
            </tr>
        `;
        elements.dataBody.insertAdjacentHTML('beforeend', row);
        state.trialNumber++;

        saveDataToServer(trial);
    }

    function initializePhaseGraph() {
        const ctx = elements.phaseGraphCanvas.getContext('2d');
        window.phaseChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                labels: [],
                datasets: [{
                    label: 'T² vs Length',
                    data: [],
                    borderColor: '#30e3ca',
                    backgroundColor: 'rgba(48, 227, 202, 0.8)',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    showLine: true,
                    borderWidth: 2,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Length (m)',
                            color: '#ffffff'
                        },
                        ticks: { color: '#ffffff' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'T² (s²)',
                            color: '#ffffff'
                        },
                        ticks: { color: '#ffffff' },
                        min: 0
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return [
                                    `Length: ${context.parsed.x.toFixed(3)} m`,
                                    `T²: ${context.parsed.y.toFixed(3)} s²`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    function updateLengthVsT2Graph(lengthCm, period) {
        const T2 = Math.pow(period, 2);
        const lengthM = lengthCm / 100;

        window.phaseChart.data.labels.push(`Trial ${state.trialNumber}`);
        window.phaseChart.data.datasets[0].data.push({
            x: lengthM,
            y: T2
        });
        window.phaseChart.update();
    }

    function resetPendulum() {
        stopExperiment();
        elements.stringContainer.style.transform = 'translateX(-50%) rotate(0deg)';
        state.startAngle = 15;
        state.lastAngle = 0;
        state.oscillationCount = 0;
        state.lastZeroCrossingTime = 0;
        state.currentPeriod = 0;
        state.isFreshStart = true;
        elements.phaseDisplay.textContent = "0";
        elements.timeDisplay.textContent = "0";
        updateButtonStates();

        if (window.phaseChart) {
            window.phaseChart.data.labels = [];
            window.phaseChart.data.datasets[0].data = [];
            window.phaseChart.update();
        }

        fetch('/clear_data', { method: 'POST' })
            .catch(error => console.error('Error clearing server data:', error));
    }

    function stopExperiment() {
        if (state.isPendulumRunning) {
            stopStopwatch();
            if (state.animationId) {
                cancelAnimationFrame(state.animationId);
                state.animationId = null;
            }
            state.isPendulumRunning = false;
            updateButtonStates();
        }
    }

    function saveDataToServer(trial) {
        fetch('/add_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(trial)
        }).catch(error => console.error('Error saving data:', error));
    }

    function calculateAverage() {
        fetch('/get_average')
            .then(response => response.ok ? response.json() : Promise.reject())
            .then(data => {
                if (data.status === 'success' && data.count === state.trialData.length) {
                    displayAverageResult(data.average, data.count, true);
                } else {
                    calculateClientSideAverage();
                }
            })
            .catch(calculateClientSideAverage);
    }

    function calculateClientSideAverage() {
        if (state.trialData.length === 0) {
            displayAverageResult(0, 0, false);
            return;
        }

        const totalPeriod = state.trialData.reduce((sum, trial) => sum + parseFloat(trial.period), 0);
        const average = totalPeriod / state.trialData.length;
        displayAverageResult(average, state.trialData.length, false);
    }

    function displayAverageResult(average, count, fromServer) {
        elements.averageResult.textContent = count === 0 
            ? 'No data available to calculate average'
            : `Average Time Period: ${average.toFixed(2)}s (from ${count} trial${count !== 1 ? 's' : ''} ${fromServer ? '(server calculation)' : '(client calculation)'})`;
        
        elements.averageResult.style.color = count === 0 ? '#ff9800' : '#11999E';
    }

    // Initialize the application
    init();
});
