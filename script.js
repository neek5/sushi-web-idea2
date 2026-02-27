// Physical System State Simulation
const systemState = {
    1: { status: 'O', pin: '' }, // O = Empty, X = Taken
    2: { status: 'O', pin: '' }
};

// Application State Variables
let currentScreen = 'screen-main-menu';
let flowType = null; // 'A' (Deposit) or 'B' (Retrieve)
let selectedLane = null;
let currentPin = '';

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    updateLaneDisplay();

    // Keypad Event Listeners
    document.querySelectorAll('.key-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Apply visual active state programmatically for rapid clicks
            btn.style.transform = 'translateY(6px)';
            setTimeout(() => btn.style.transform = '', 100);

            const key = e.target.getAttribute('data-key');
            handleKeypress(key);
        });
    });

    // Allow physical keyboard for easier testing on desktop
    document.addEventListener('keydown', (e) => {
        const keyMap = {
            'a': 'A', 'A': 'A', 'b': 'B', 'B': 'B', 'c': 'C', 'C': 'C', 'd': 'D', 'D': 'D',
            '*': '*', '#': '#', 'Enter': '#'
        };
        const key = keyMap[e.key] || e.key;
        if (['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'A', 'B', 'C', 'D', '*', '#'].includes(key)) {
            handleKeypress(key);
        }
    });
});

// Central Keypress Handler based on State Machine
function handleKeypress(key) {
    // Global Cancel ('D') aborts the flow unless processing
    if (key === 'D' && currentScreen !== 'screen-processing' && currentScreen !== 'screen-message') {
        resetFlow();
        return;
    }

    switch (currentScreen) {
        case 'screen-main-menu':
            if (key === 'A') {
                startFlow('A');
            } else if (key === 'B') {
                startFlow('B');
            }
            break;

        case 'screen-select-lane':
            if (key === '1' || key === '2') {
                selectLane(parseInt(key));
            }
            break;

        case 'screen-enter-pin':
            if (key === 'C') {
                currentPin = '';
                updatePinDisplay();
            } else if (/\d/.test(key)) { // If it's a number 0-9
                if (currentPin.length < 7) {
                    currentPin += key;
                    updatePinDisplay();

                    // Auto-submit on 7th digit
                    if (currentPin.length === 7) {
                        setTimeout(submitPin, 300); // slight delay to let user see 7th digit
                    }
                }
            }
            break;

        case 'screen-drop-off':
            if (key === '#') {
                startProcessing();
            }
            break;

        case 'screen-processing':
        case 'screen-message':
            // Ignore keypad input during processing and messages
            break;
    }
}

// -----------------------------------------
// Navigation & Flow Logic
// -----------------------------------------

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        currentScreen = screenId;
    }
}

function startFlow(type) {
    flowType = type; // 'A' or 'B'
    updateLaneDisplay();
    showScreen('screen-select-lane');
}

function resetFlow() {
    flowType = null;
    selectedLane = null;
    currentPin = '';
    showScreen('screen-main-menu');
}

function selectLane(laneNum) {
    const status = systemState[laneNum].status;

    if (flowType === 'A') {
        // Deposit requires Empty lane ('O')
        if (status === 'O') {
            selectedLane = laneNum;
            currentPin = '';
            updatePinDisplay();
            showScreen('screen-enter-pin');
        } else {
            showTemporaryMessage("Lane Taken", "Please select an empty lane.", 'screen-select-lane');
        }
    }
    else if (flowType === 'B') {
        // Retrieve requires Taken lane ('X')
        if (status === 'X') {
            selectedLane = laneNum;
            currentPin = '';
            updatePinDisplay();
            showScreen('screen-enter-pin');
        } else {
            showTemporaryMessage("Lane Empty", "Nothing to retrieve here.", 'screen-select-lane');
        }
    }
}

function updatePinDisplay() {
    const display = document.getElementById('pin-display');
    // Format: "1 2 3 _ _ _ _"
    const padded = currentPin.padEnd(7, '_');
    display.textContent = padded.split('').join(' ');
}

function submitPin() {
    if (flowType === 'A') {
        // Deposit: PIN entered, move to Drop-Off
        showScreen('screen-drop-off');
    }
    else if (flowType === 'B') {
        // Retrieve: Verify PIN matches the stored PIN for that lane
        if (currentPin === systemState[selectedLane].pin) {
            startProcessing();
        } else {
            showTemporaryMessage("Wrong PIN!", "Try again.", 'screen-enter-pin');
            currentPin = '';
            updatePinDisplay();
        }
    }
}

function startProcessing() {
    showScreen('screen-processing');

    // Per requirements: Locker 1 waits 2s, Locker 2 waits 4s
    const delayMs = selectedLane === 1 ? 2000 : 4000;

    const title = document.getElementById('processing-title');
    const subtitle = document.getElementById('processing-subtitle');
    const container = document.getElementById('dynamic-luggage-container');

    // Inject animated luggage visual
    container.innerHTML = `
        <div class="luggage-item-wrap ${flowType === 'A' ? 'luggage-anim-in' : 'luggage-anim-out'}">
            <img src="images/sushi-combo.png" style="height: 80px;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgODAiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIHk9IjQwIiByeD0iNSIgZmlsbD0iIzMzMyIvPjxyZWN0IHdpZHRoPSI4MCIgaGVpZ2h0PSI1MCIgeD0iMTAiIHk9IjUiIHJ4PSI4IiBmaWxsPSIjZTg1YTM2Ii8+PC9zdmc+'">
        </div>
    `;

    if (flowType === 'A') {
        title.textContent = "Storing...";
        subtitle.textContent = `Pushing into Locker ${selectedLane} (takes ${delayMs / 1000}s)`;
    } else {
        title.textContent = "Retrieving...";
        subtitle.textContent = `Fetching from Locker ${selectedLane} (takes ${delayMs / 1000}s)`;
    }

    // Wait the exact physical machinery time required
    setTimeout(() => {
        completeProcessing();
    }, delayMs);
}

function completeProcessing() {
    // Update underlying state
    if (flowType === 'A') {
        systemState[selectedLane].status = 'X';
        systemState[selectedLane].pin = currentPin;
        showTemporaryMessage("Success!", "Luggage stored securely.", 'screen-main-menu');
    } else {
        systemState[selectedLane].status = 'O';
        systemState[selectedLane].pin = '';
        showTemporaryMessage("Success!", "Don't forget your items!", 'screen-main-menu');
    }

    // Reset variables silently without routing, routing handled by TemporaryMessage
    flowType = null;
    selectedLane = null;
    currentPin = '';
}

// -----------------------------------------
// Utility Functions
// -----------------------------------------

function updateLaneDisplay() {
    const l1 = document.getElementById('lane-1-indicator');
    const s1 = document.getElementById('lane-1-state');

    s1.textContent = systemState[1].status;
    l1.className = `lane-item ${systemState[1].status === 'O' ? 'state-empty' : 'state-taken'}`;

    const l2 = document.getElementById('lane-2-indicator');
    const s2 = document.getElementById('lane-2-state');

    s2.textContent = systemState[2].status;
    l2.className = `lane-item ${systemState[2].status === 'O' ? 'state-empty' : 'state-taken'}`;
}

function showTemporaryMessage(title, subtitle, nextScreen) {
    document.getElementById('msg-title').textContent = title;

    // Check if error or success for styling color
    if (title.includes("Success")) {
        document.getElementById('msg-title').style.color = '#27ae60';
    } else {
        document.getElementById('msg-title').style.color = '#c0392b';
    }

    document.getElementById('msg-subtitle').textContent = subtitle;
    showScreen('screen-message');

    setTimeout(() => {
        if (nextScreen === 'screen-main-menu') {
            resetFlow();
        } else {
            showScreen(nextScreen);
        }
    }, 2000);
}
