document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const bob = document.getElementById('bob');
    const stringContainer = document.querySelector('.pendulum-string-container');
    const stringElement = document.querySelector('.pendulum-string');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const oscillationsInput = document.getElementById('oscillations');
    const lengthInput = document.getElementById('length');
    const dataBody = document.getElementById('data-body');
    const averageBtn = document.getElementById('average-btn');
    const averageResult = document.getElementById('average-result');
    const phaseDisplay = document.getElementById('phase-difference-value');
    const timeDisplay = document.getElementById('time-difference');
    const phaseGraphCanvas = document.getElementById('phaseGraph');

    // Stopwatch Elements
    const stopwatchDisplay = document.querySelector('.stopwatch-display');
    const minutesDisplay = document.createElement('span');
    minutesDisplay.id = 'minutes';
    minutesDisplay.textContent = '00';
    const secondsDisplay = document.createElement('span');
    secondsDisplay.id = 'seconds';
    secondsDisplay.textContent = '00';
    const millisecondsDisplay = document.createElement('span');
    millisecondsDisplay.id = 'milliseconds';
    millisecondsDisplay.textContent = '00';

    // Build the display structure
    stopwatchDisplay.innerHTML = '';
    stopwatchDisplay.appendChild(minutesDisplay);
    stopwatchDisplay.appendChild(document.createTextNode(':'));
    stopwatchDisplay.appendChild(secondsDisplay);
    stopwatchDisplay.appendChild(document.createTextNode('.'));
    stopwatchDisplay.appendChild(millisecondsDisplay);

    const stopwatchStartBtn = document.getElementById('stopwatch-start');
    const stopwatchStopBtn = document.getElementById('stopwatch-stop');

    // Physics Constants
    const GRAVITY = 9.8;
    const BASE_LENGTH = 300; // pixels for 100cm

    // Animation Variables
    let isDragging = false;
    let startAngle = 15;
    let animationId = null;
    let lastAngle = 0;
    let oscillationCount = 0;
    let currentLength = BASE_LENGTH;
    let trialNumber = 1;
    let isFreshStart = true;

    // Performance Optimization
    let lastFrameTime = 0;
    const MOBILE_FRAME_RATE = 30;
    const FRAME_INTERVAL = 1000 / MOBILE_FRAME_RATE;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Phase Tracking
    let phaseDifference = 0;
    let lastZeroCrossingTime = 0;
    let currentPeriod = 0;
    let periodMeasurements = [];
    let phaseMeasurements = [];

    // Stopwatch Variables
    let stopwatchInterval;
    let stopwatchStartTime;
    let elapsedTime = 0;
    let isStopwatchRunning = false;
    let isPendulumRunning = false;
    let pendulumStartTime = 0;

    // Data storage
    let trialData = [];
    let phaseChart;

    // Initialize
    updateLength();
    initializePhaseGraph();
    setupEventListeners();
    updateButtonStates();

    function setupEventListeners() {
        // Touch support for mobile
        bob.addEventListener('mousedown', startDrag);
        bob.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
        
        startBtn.addEventListener('click', startExperiment);
        resetBtn.addEventListener('click', resetPendulum);
        lengthInput.addEventListener('input', updateLength);
        averageBtn.addEventListener('click', calculateAverage);
        stopwatchStartBtn.addEventListener('click', startExperiment);
        stopwatchStopBtn.addEventListener('click', stopExperiment);
    }

    function startStopwatch() {
        if (!isStopwatchRunning) {
            stopwatchStartTime = Date.now() - elapsedTime;
            pendulumStartTime = Date.now();
            stopwatchInterval = setInterval(updateStopwatch, isMobile ? 50 : 10);
            isStopwatchRunning = true;
            updateButtonStates();
        }
    }

    function updateStopwatch() {
        const currentTime = Date.now();
        elapsedTime = currentTime - stopwatchStartTime;

        const minutes = Math.floor(elapsedTime / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        const milliseconds = Math.floor((elapsedTime % 1000) / 10);

        minutesDisplay.textContent = minutes.toString().padStart(2, '0');
        secondsDisplay.textContent = seconds.toString().padStart(2, '0');
        millisecondsDisplay.textContent = milliseconds.toString().padStart(2, '0');
    }

    function stopStopwatch() {
        clearInterval(stopwatchInterval);
        isStopwatchRunning = false;
        updateButtonStates();
    }

    function resetStopwatch() {
        stopStopwatch();
        elapsedTime = 0;
        minutesDisplay.textContent = '00';
        secondsDisplay.textContent = '00';
        millisecondsDisplay.textContent = '00';
        updateButtonStates();
    }

    function updateButtonStates() {
        stopwatchStartBtn.disabled = isStopwatchRunning || isPendulumRunning;
        stopwatchStopBtn.disabled = !isStopwatchRunning || !isPendulumRunning;
        startBtn.disabled = isPendulumRunning || isStopwatchRunning;
        resetBtn.disabled = !isPendulumRunning && !isStopwatchRunning && trialData.length === 0;
        averageBtn.disabled = trialData.length === 0;
    }

    function startExperiment() {
        if (!isPendulumRunning) {
            // Reset all variables
            oscillationCount = 0;
            lastZeroCrossingTime = 0;
            periodMeasurements = [];
            phaseMeasurements = [];
            lastFrameTime = 0;

            resetStopwatch();
            
            // Set initial angle
            startAngle = 60;
            stringContainer.style.transform = `translateX(-50%) rotate(${startAngle}deg)`;
            lastAngle = startAngle;

            // Start timing
            startStopwatch();
            isPendulumRunning = true;
            isFreshStart = false;
            updateButtonStates();

            const oscillations = parseInt(oscillationsInput.value) || 5;
            const lengthCm = parseInt(lengthInput.value) || 50;

            if (animationId) cancelAnimationFrame(animationId);
            animationId = requestAnimationFrame((t) => animatePendulum(t, oscillations, lengthCm));
        }
    }

    function stopExperiment() {
        if (isPendulumRunning) {
            stopStopwatch();
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            isPendulumRunning = false;
            updateButtonStates();
            stringContainer.style.willChange = 'auto';
        }
    }

    function updateLength() {
        const lengthCm = parseInt(lengthInput.value) || 50;
        const scale = lengthCm / 100;
        currentLength = BASE_LENGTH * scale;
        stringElement.style.height = `${currentLength}px`;
    }

    function startDrag(e) {
        e.preventDefault();
        isDragging = true;
        bob.style.cursor = 'grabbing';

        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
            isPendulumRunning = false;
        }
        updateButtonStates();
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        const container = document.querySelector('.pendulum-container');
        const rect = container.getBoundingClientRect();
        const stringContainerRect = stringContainer.getBoundingClientRect();

        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        const pivotX = rect.left + rect.width / 2;
        const pivotY = stringContainerRect.top;

        const deltaX = clientX - pivotX;
        const deltaY = clientY - pivotY;

        let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        angle = Math.max(-60, Math.min(60, angle));

        stringContainer.style.transform = `translateX(-50%) rotate(${angle}deg)`;
        startAngle = angle;
        lastAngle = angle;
    }

    function stopDrag() {
        isDragging = false;
        bob.style.cursor = 'grab';
    }

    function animatePendulum(timestamp, oscillations, lengthCm) {
        // Throttle animation for mobile
        const now = Date.now();
        const deltaTime = now - lastFrameTime;
        
        if (isMobile && deltaTime < FRAME_INTERVAL) {
            animationId = requestAnimationFrame((t) => animatePendulum(t, oscillations, lengthCm));
            return;
        }
        lastFrameTime = now - (deltaTime % FRAME_INTERVAL);

        // Use precise timing
        const elapsed = (now - pendulumStartTime) / 1000;
        
        const lengthM = lengthCm / 100;
        currentPeriod = 2 * Math.PI * Math.sqrt(lengthM / GRAVITY);
        const angle = startAngle * Math.cos(2 * Math.PI * elapsed / currentPeriod);

        phaseDifference = (2 * Math.PI * (elapsed % currentPeriod)) / currentPeriod;
        phaseDisplay.textContent = phaseDifference.toFixed(3);

        // Optimized animation
        stringContainer.style.willChange = 'transform';
        stringContainer.style.transform = `translateX(-50%) rotate(${angle}deg)`;

        // Accurate oscillation counting
        const currentSign = Math.sign(angle);
        const lastSign = Math.sign(lastAngle);

        if (currentSign !== 0 && lastSign !== 0 && currentSign !== lastSign) {
            oscillationCount += 0.5;
            if (oscillationCount % 1 === 0) {
                const period = elapsed - lastZeroCrossingTime;
                lastZeroCrossingTime = elapsed;
                periodMeasurements.push(period);
                phaseMeasurements.push(phaseDifference);
            }
        }

        // Completion check
        if (oscillationCount >= oscillations) {
            if (Math.abs(angle) < 1) {
                stopStopwatch();
                addDataToTable(oscillations, elapsed);
                isPendulumRunning = false;
                isFreshStart = true;
                updateButtonStates();
                stringContainer.style.willChange = 'auto';
                return;
            }
        }

        lastAngle = angle;
        animationId = requestAnimationFrame((t) => animatePendulum(t, oscillations, lengthCm));
    }

    function initializePhaseGraph() {
        const ctx = phaseGraphCanvas.getContext('2d');
        phaseChart = new Chart(ctx, {
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

        phaseChart.data.labels.push(`Trial ${trialNumber}`);
        phaseChart.data.datasets[0].data.push({
            x: lengthM,
            y: T2
        });
        phaseChart.update();
    }

    function resetPendulum() {
        stopExperiment();
        stringContainer.style.transform = 'translateX(-50%) rotate(0deg)';
        startAngle = 15;
        lastAngle = 0;
        oscillationCount = 0;
        lastZeroCrossingTime = 0;
        currentPeriod = 0;
        isFreshStart = true;
        phaseDisplay.textContent = "0";
        timeDisplay.textContent = "0";
        updateButtonStates();

        phaseChart.data.labels = [];
        phaseChart.data.datasets[0].data = [];
        phaseChart.update();

        fetch('/clear_data', { method: 'POST' })
            .catch(error => console.error('Error clearing server data:', error));
    }

    function addDataToTable(oscillations, totalTime) {
        const period = (totalTime / oscillations).toFixed(2);
        const trial = {
            number: trialNumber,
            oscillations: oscillations,
            totalTime: totalTime.toFixed(2),
            period: period
        };

        trialData.push(trial);
        const lengthCm = parseInt(lengthInput.value) || 50;
        updateLengthVsT2Graph(lengthCm, period);

        const row = `
            <tr>
                <td>${trial.number}</td>
                <td>${trial.oscillations}</td>
                <td>${trial.totalTime}</td>
                <td>${trial.period}</td>
            </tr>
        `;
        dataBody.insertAdjacentHTML('beforeend', row);
        trialNumber++;

        saveDataToServer(trial);
    }

    function saveDataToServer(trial) {
        fetch('/add_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(trial)
        })
        .catch(error => {
            console.error('Error saving data:', error);
        });
    }

    function calculateAverage() {
        fetch('/get_average')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                if (data.status === 'success' && data.count === trialData.length) {
                    displayAverageResult(data.average, data.count, true);
                } else {
                    calculateClientSideAverage();
                }
            })
            .catch(() => {
                calculateClientSideAverage();
            });
    }

    function calculateClientSideAverage() {
        if (trialData.length === 0) {
            displayAverageResult(0, 0, false);
            return;
        }

        const totalPeriod = trialData.reduce((sum, trial) => {
            return sum + parseFloat(trial.period);
        }, 0);

        const average = totalPeriod / trialData.length;
        displayAverageResult(average, trialData.length, false);
    }

    function displayAverageResult(average, count, fromServer) {
        if (count === 0) {
            averageResult.textContent = 'No data available to calculate average';
            averageResult.style.color = '#ff9800';
        } else {
            const source = fromServer ? '(server calculation)' : '(client calculation)';
            averageResult.textContent = `Average Time Period: ${average.toFixed(2)}s (from ${count} trial${count !== 1 ? 's' : ''} ${source})`;
            averageResult.style.color = '#11999E';
        }
    }
});
