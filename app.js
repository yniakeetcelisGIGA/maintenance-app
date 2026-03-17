// ==========================================
// Data Management & State
// ==========================================

const initialRooms = [
    { id: 'room-1', name: 'Room 101', location: 'Level 1 - East Wing', category: 'Standard' },
    { id: 'room-2', name: 'Room 205', location: 'Level 2 - West Wing', category: 'Deluxe' }
];

const initialRequests = [
    {
        id: 'req-1',
        assetId: 'room-1',
        title: 'AC not cooling',
        priority: 'high',
        status: 'pending',
        submittedBy: 'System Admin',
        submittedAt: new Date().toISOString(),
        expectedFixAt: null
    }
];

const Storage = {
    getRooms: () => {
        const saved = localStorage.getItem('maintenance-rooms');
        return saved ? JSON.parse(saved) : initialRooms;
    },
    setRooms: (rooms) => {
        localStorage.setItem('maintenance-rooms', JSON.stringify(rooms));
    },
    getRequests: () => {
        const saved = localStorage.getItem('maintenance-requests');
        return saved ? JSON.parse(saved) : initialRequests;
    },
    setRequests: (requests) => {
        localStorage.setItem('maintenance-requests', JSON.stringify(requests));
    }
};

let state = {
    rooms: Storage.getRooms(),
    requests: Storage.getRequests(),
    currentPage: 'login',
    currentUser: JSON.parse(localStorage.getItem('maintenance-user')) || null
};

// ==========================================
// Core Logic
// ==========================================

function setExpectedFix(id) {
    const date = prompt("When do you expect to fix this? (e.g., Today at 5 PM)");
    if (date === null) return;
    state.requests = state.requests.map(req => req.id === id ? { ...req, expectedFixAt: date } : req);
    Storage.setRequests(state.requests);
    render();
}

function updateStatus(id, newStatus) {
    state.requests = state.requests.map(req => {
        if (req.id === id) {
            return { 
                ...req, 
                status: newStatus, 
                completedAt: newStatus === 'completed' ? new Date().toLocaleString() : null,
                expectedFixAt: newStatus === 'completed' ? null : req.expectedFixAt,
                updatedAt: new Date().toISOString() 
            };
        }
        return req;
    });
    Storage.setRequests(state.requests);
    render();
}

function stopScanner() {
    const readerElement = document.getElementById('reader');
    const loginFields = document.getElementById('loginFields');
    
    if (window.html5QrCode) {
        window.html5QrCode.stop().then(() => {
            window.html5QrCode = null;
            readerElement.style.display = 'none';
            loginFields.style.display = 'block';
            readerElement.innerHTML = '';
        }).catch(err => {
            console.warn("Scanner stop error:", err);
            readerElement.style.display = 'none';
            loginFields.style.display = 'block';
        });
    } else {
        readerElement.style.display = 'none';
        loginFields.style.display = 'block';
    }
}

function startScanner() {
    const readerElement = document.getElementById('reader');
    const loginFields = document.getElementById('loginFields');
    
    readerElement.innerHTML = `
        <div id="qr-display" style="width: 100%; min-height: 250px; background: #000; border-radius: 8px;"></div>
        <button type="button" class="btn btn-secondary" style="width: 100%; margin-top: 1rem;" onclick="stopScanner(),logout()">
            ⬅ Cancel Scan
        </button>
    `;
    
    readerElement.style.display = 'block';
    loginFields.style.display = 'none';

    window.html5QrCode = new Html5Qrcode("qr-display");
    window.html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: 250 }, 
        (decodedText) => {
            window.html5QrCode.stop().then(() => {
                readerElement.style.display = 'none';
                loginFields.style.display = 'block';
                const guestName = prompt("Enter your name (Optional):");
                const finalName = guestName?.trim() || "Guest";
                state.currentUser = { username: finalName, role: 'user' };
                localStorage.setItem('maintenance-user', JSON.stringify(state.currentUser));
                navigate('submit', { roomId: decodedText });
            });
        }
    ).catch(err => { 
        console.error("Camera error:", err);
        stopScanner(); 
    });
}

// ==========================================
// Auth & Navigation
// ==========================================

function handleLogin(role) {
    const nameInput = document.getElementById('loginName')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    const name = nameInput || "Guest";

    if (role === 'admin' && password !== "admin123") { 
        alert('Incorrect Admin Password!'); 
        return; 
    }
    
    state.currentUser = { username: name, role: role };
    localStorage.setItem('maintenance-user', JSON.stringify(state.currentUser));
    navigate(role === 'admin' ? 'dashboard' : 'submit');
}

function logout() {
    state.currentUser = null;
    localStorage.removeItem('maintenance-user');
    navigate('login');
}

function navigate(page, params = {}) {
    state.currentPage = page;
    const url = new URL(window.location);
    url.searchParams.set('page', page);
    for (const key in params) { url.searchParams.set(key, params[key]); }
    window.history.pushState({}, '', url);
    render();
}

function getUrlParams() {
    return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

// ==========================================
// UI Rendering
// ==========================================

function renderLogin() {
    return `
        <div class="container-sm">
            <div class="card" style="border-top: 4px solid var(--primary);">
                <div class="card-header" style="text-align: center;">
                    <h1 style="color: var(--primary);">Maintenance System</h1>
                    <p class="text-muted">QR-Based</p>
                </div>
                <div class="card-content">
                    <div id="reader" style="width: 100%; display: none; margin-bottom: 1rem;"></div>
                    <div id="loginFields">
                        <div class="form-group">
                            <label class="form-label">NAME(optional if user)</label>
                            <input type="text" id="loginName" class="form-input" placeholder="e.g Roque">
                        </div>
                        <div class="form-group">
                            <label class="form-label">ADMIN PASSWORD</label>
                            <input type="password" id="loginPassword" class="form-input" placeholder="••••••••">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem;">
                            <button class="btn btn-primary" onclick="handleLogin('admin')">Admin Login</button>
                            <button class="btn btn-secondary" onclick="handleLogin('user')">User Access</button>
                        </div>
                        <div style="text-align: center; margin-top: 1.5rem; border-top: 1px solid var(--gray-200); padding-top: 1rem;">
                            <button class="btn btn-outline" style="width: 100%;" onclick="startScanner()">📷 Scan Asset QR</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

function renderDashboard() {
    return `
        <div class="page-header">
            <div class="container flex-between">
                <h1>Work Orders</h1>
                <div class="flex gap-1">
                    <button class="btn btn-secondary" onclick="navigate('rooms')">🏨 Manage Rooms</button>
                    <button class="btn btn-outline" onclick="logout()">Logout</button>
                </div>
            </div>
        </div>
        <div class="container">
            <div class="card">
                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Maintenance Issue</th>
                            <th>Location/Asset</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.requests.map(req => `
                            <tr>
                                <td>
                                    <div style="font-weight: 600;">${req.title}</div>
                                    <div class="text-muted" style="font-size: 0.75rem;">
                                        By ${req.submittedBy} • ${req.expectedFixAt ? 'Expected: ' + req.expectedFixAt : 'No date set'}
                                    </div>
                                </td>
                                <td>
                                    <div class="badge badge-low" style="display:inline-block; margin-bottom: 4px;">Room</div><br>
                                    ${(state.rooms.find(r => r.id === req.assetId) || {}).name || 'Unknown'}
                                </td>
                                <td style="text-align: right;">
                                    ${req.status !== 'completed' ? `
                                        <div class="flex gap-1" style="justify-content: flex-end;">
                                            <button class="btn btn-secondary btn-sm" onclick="setExpectedFix('${req.id}')">Schedule</button>
                                            <button class="btn btn-primary btn-sm" onclick="updateStatus('${req.id}', 'completed')">Mark Fixed</button>
                                        </div>
                                    ` : `<span style="color: var(--success); font-weight:600; font-size: 0.8rem;">✓ COMPLETED</span>`}
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

function renderSubmitRequest() {
    const params = getUrlParams();
    const selectedRoom = params.roomId || "";
    const userHistory = state.requests.filter(req => req.submittedBy === state.currentUser.username)
        .sort((a, b) => (a.status === 'completed' ? 1 : -1));

    return `
        <div class="page-header">
            <div class="container flex-between">
                <h1>Submit Request</h1>
                <button class="btn btn-outline btn-sm" onclick="logout()">Logout</button>
            </div>
        </div>
        <div class="container" style="max-width: 600px;">
            <div class="card">
                <div class="card-content">
                    <form id="submitRequestForm">
                        <div class="form-group">
                            <label class="form-label">SELECT ASSET</label>
                            <select id="requestAsset" class="form-select" required>
                                <option value="">Choose a room...</option>
                                ${state.rooms.map(r => `<option value="${r.id}" ${r.id === selectedRoom ? 'selected' : ''}>${r.name} - ${r.location}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">ISSUE DESCRIPTION</label>
                            <input type="text" id="requestTitle" class="form-input" placeholder="e.g. Broken light fixture" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">PRIORITY LEVEL</label>
                            <select id="requestPriority" class="form-select">
                                <option value="low">Low - Routine</option>
                                <option value="medium" selected>Medium - Urgent</option>
                                <option value="high">High - Emergency</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.8rem; margin-top: 1rem;">Submit Work Order</button>
                    </form>
                </div>
            </div>

            <h3 style="margin: 2rem 0 1rem;">Your Submission History</h3>
            ${userHistory.length === 0 ? `<div class="card" style="padding:2rem; text-align:center; color: var(--gray-500);">No requests found.</div>` : 
            userHistory.map(req => `
                <div class="card" style="opacity: ${req.status === 'completed' ? 0.7 : 1}">
                    <div class="card-content flex-between">
                        <div>
                            <div style="font-weight: 600;">${req.title}</div>
                            <div class="text-muted">
                                ${req.status === 'completed' ? `✅ Resolved` : `⏳ Pending ${req.expectedFixAt ? '• Due: '+req.expectedFixAt : ''}`}
                            </div>
                        </div>
                        <span class="badge badge-${req.priority}">${req.priority}</span>
                    </div>
                </div>`).join('')}
        </div>`;
}

function renderRooms() {
    return `
        <div class="page-header">
            <div class="container flex-between">
                <h1>Asset Registry</h1>
                <button class="btn btn-secondary" onclick="navigate('dashboard')">Back to Dashboard</button>
            </div>
        </div>
        <div class="container">
            <div class="card">
                <table>
                    <thead>
                        <tr><th>Asset Name</th><th>Location</th><th>Category</th></tr>
                    </thead>
                    <tbody>
                        ${state.rooms.map(r => `
                            <tr>
                                <td style="font-weight:600;">${r.name}</td>
                                <td>${r.location}</td>
                                <td><span class="badge badge-low">${r.category}</span></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

function render() {
    const app = document.getElementById('app');
    if (!app) return;
    if (!state.currentUser) { app.innerHTML = renderLogin(); return; }
    const page = getUrlParams().page || state.currentPage;
    
    if (state.currentUser.role === 'user' && page !== 'submit') { app.innerHTML = renderSubmitRequest(); }
    else {
        switch (page) {
            case 'dashboard': app.innerHTML = renderDashboard(); break;
            case 'submit': app.innerHTML = renderSubmitRequest(); break;
            case 'rooms': app.innerHTML = renderRooms(); break;
            default: app.innerHTML = state.currentUser.role === 'admin' ? renderDashboard() : renderSubmitRequest();
        }
    }
    
    const form = document.getElementById('submitRequestForm');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            const newReq = { 
                assetId: document.getElementById('requestAsset').value,
                title: document.getElementById('requestTitle').value,
                priority: document.getElementById('requestPriority').value,
                submittedBy: state.currentUser.username, 
                status: 'pending', id: `req-${Date.now()}`, submittedAt: new Date().toISOString(), expectedFixAt: null
            };
            state.requests.unshift(newReq);
            Storage.setRequests(state.requests);
            alert('Work Order Created Successfully!'); render();
        };
    }
}

window.addEventListener('popstate', render);
render();