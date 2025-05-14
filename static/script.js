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

    // Stopwatch Elements - Updated to match current HTML
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
    let startAngle = 15; // Default starting angle
    let animationId = null;
    let lastAngle = 0;
    let oscillationCount = 0;
    let startTime = 0;
    let currentLength = BASE_LENGTH;
    let trialNumber = 1;
    let pauseTime = 0;
    let lastResumeTime = 0;

    // Phase Difference Tracking
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

    // Data storage
    let trialData = [];
    let phaseChart;

    // Initialize
    updateLength();
    initializePhaseGraph();
    setupEventListeners();

    function setupEventListeners() {
        bob.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        startBtn.addEventListener('click', startOscillation);
        resetBtn.addEventListener('click', resetPendulum);
        lengthInput.addEventListener('input', updateLength);
        averageBtn.addEventListener('click', calculateAverage);
        stopwatchStartBtn.addEventListener('click', startStopwatchAndPendulum);
        stopwatchStopBtn.addEventListener('click', stopStopwatchAndPendulum);
    }

    function startStopwatch() {
        if (!isStopwatchRunning) {
            stopwatchStartTime = Date.now() - elapsedTime;
            stopwatchInterval = setInterval(updateStopwatch, 10);
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
        stopwatchStartBtn.disabled = isStopwatchRunning;
        stopwatchStopBtn.disabled = !isStopwatchRunning;
        startBtn.disabled = isPendulumRunning;
        resetBtn.disabled = !isPendulumRunning && !isStopwatchRunning;
    }

    function startStopwatchAndPendulum() {
        if (!isPendulumRunning) {
            if (lastResumeTime > 0) {
                pauseTime += Date.now() - lastResumeTime;
            }
            
            startStopwatch();
            isPendulumRunning = true;
            updateButtonStates();
            
            const oscillations = parseInt(oscillationsInput.value) || 5;
            const lengthCm = parseInt(lengthInput.value) || 50;
            
            if (animationId) cancelAnimationFrame(animationId);
            animationId = requestAnimationFrame((t) => animatePendulum(t, oscillations, lengthCm));
            
            lastResumeTime = Date.now();
        }
    }

    function stopStopwatchAndPendulum() {
        if (isPendulumRunning) {
            stopStopwatch();
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            isPendulumRunning = false;
            updateButtonStates();
            lastResumeTime = Date.now();
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

        const container = document.querySelector('.pendulum-container');
        const rect = container.getBoundingClientRect();
        const stringContainerRect = stringContainer.getBoundingClientRect();

        const pivotX = rect.left + rect.width / 2;
        const pivotY = stringContainerRect.top;

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const deltaX = mouseX - pivotX;
        const deltaY = mouseY - pivotY;

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

    function startOscillation() {
        const oscillations = parseInt(oscillationsInput.value) || 5;
        const lengthCm = parseInt(lengthInput.value) || 50;

        periodMeasurements = [];
        phaseMeasurements = [];
        oscillationCount = 0;
        startTime = 0;
        lastZeroCrossingTime = 0;
        pauseTime = 0;
        lastResumeTime = 0;

        isPendulumRunning = true;
        updateButtonStates();
        resetStopwatch();
        startStopwatch();

        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame((t) => animatePendulum(t, oscillations, lengthCm));
    }

    function animatePendulum(timestamp, oscillations, lengthCm) {
        if (!startTime) startTime = timestamp;
        
        const adjustedTimestamp = timestamp - pauseTime;
        const elapsed = (adjustedTimestamp - startTime) / 1000;
    
        const lengthM = lengthCm / 100;
        currentPeriod = 2 * Math.PI * Math.sqrt(lengthM / GRAVITY);
        const angle = startAngle * Math.cos(2 * Math.PI * elapsed / currentPeriod);
    
        phaseDifference = (2 * Math.PI * (elapsed % currentPeriod)) / currentPeriod;
        phaseDisplay.textContent = phaseDifference.toFixed(3);
    
        stringContainer.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    
        // Check if we've reached the required number of oscillations
        if (oscillationCount >= oscillations) {
            // Wait until pendulum returns to vertical position (angle ≈ 0)
            if (Math.abs(angle) < 2) {  // Changed from 5 to 2 for more precise stopping
                stopStopwatch();
                addDataToTable(oscillations, elapsed);
                isPendulumRunning = false;
                updateButtonStates();
                return;
            }
        }
        else if (Math.abs(angle) < 5 && Math.sign(angle) !== Math.sign(lastAngle)) {
            oscillationCount += 0.5;
    
            if (oscillationCount % 1 === 0) {
                const period = elapsed - lastZeroCrossingTime;
                lastZeroCrossingTime = elapsed;
    
                periodMeasurements.push(period);
                phaseMeasurements.push(phaseDifference);
            }
        }
    
        lastAngle = angle;
        animationId = requestAnimationFrame((t) => animatePendulum(t, oscillations, lengthCm));
    }

    function initializePhaseGraph() {
        const ctx = document.getElementById('phaseGraph').getContext('2d');
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
        stopStopwatchAndPendulum();
        stringContainer.style.transform = 'translateX(-50%) rotate(0deg)';
        startAngle = 15;
        lastAngle = 0;
        oscillationCount = 0;
        lastZeroCrossingTime = 0;
        currentPeriod = 0;
        pauseTime = 0;
        lastResumeTime = 0;
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
            averageResult.textContent = `Average Time Period: ${average.toFixed(2)}s (from ${count} trial${count !== 1 ? 's' : ''} ${source}`;
            averageResult.style.color = '#11999E';
        }
    }

    function clearData() {
        trialData = [];
        dataBody.innerHTML = '';
        trialNumber = 1;
        averageResult.textContent = 'Data cleared';
        averageResult.style.color = '#ff9800';

        resetStopwatch();
        stopPendulum();

        phaseChart.data.labels = [];
        phaseChart.data.datasets[0].data = [];
        phaseChart.update();

        fetch('/clear_data', { method: 'POST' })
            .catch(error => console.error('Error clearing server data:', error));
    }
});