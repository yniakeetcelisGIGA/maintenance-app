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

function startScanner() {
    const readerElement = document.getElementById('reader');
    const loginFields = document.getElementById('loginFields');
    readerElement.style.display = 'block';
    loginFields.style.display = 'none';

    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (decodedText) => {
        html5QrCode.stop().then(() => {
            readerElement.style.display = 'none';
            loginFields.style.display = 'block';
            const guestName = prompt("Enter your name to report this issue (Optional):");
            // Default to Guest if prompt is left blank
            const finalName = guestName?.trim() || "Guest"; 
            state.currentUser = { username: finalName, role: 'user' };
            localStorage.setItem('maintenance-user', JSON.stringify(state.currentUser));
            navigate('submit', { roomId: decodedText });
        });
    }).catch(err => { alert("Camera error: " + err); render(); });
}

// ==========================================
// Auth & Navigation
// ==========================================

function handleLogin(role) {
    const nameInput = document.getElementById('loginName')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    
    // Logic update: Use "Guest" if name is blank
    const name = nameInput || "Guest";

    if (role === 'admin' && password !== "Roque") { alert('Incorrect Admin Name or Password!'); return; }
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
        <div class="container-sm" style="margin-top: 5vh;">
            <div class="card">
                <div class="card-header" style="text-align: center;"><h1>Maintenance System</h1></div>
                <div class="card-content">
                    <div id="reader" style="width: 100%; display: none; margin-bottom: 1rem;"></div>
                    <div id="loginFields">
                        <div class="form-group">
                            <label class="form-label"> Name <span class="text-muted">(Any Name)</span></label>
                            <input type="text" id="loginName" class="form-input" placeholder="Name">
                        </div>
                        <div class="form-group"><label class="form-label">Admin Password</label>
                            <input type="password" id="loginPassword" class="form-input" placeholder="Password"></div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <button class="btn btn-primary" onclick="handleLogin('admin')">Admin</button>
                            <button class="btn btn-secondary" onclick="handleLogin('user')">User</button>
                        </div>
                        <button class="btn btn-outline" style="width: 100%; margin-top: 1rem;" onclick="startScanner()">📷 Scan Room QR</button>
                    </div>
                </div>
            </div>
        </div>`;
}

function renderDashboard() {
    return `
        <div class="container">
            <div class="flex-between" style="margin-bottom: 2rem;">
                <h1>Admin Dashboard</h1>
                <div class="flex gap-1">
                    <button class="btn btn-primary" onclick="navigate('rooms')">🏨 Rooms</button>
                    <button class="btn btn-outline" onclick="logout()">Logout</button>
                </div>
            </div>
            <div class="card">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: var(--gray-50);">
                        <tr><th style="padding: 1rem; text-align: left;">Issue</th><th style="padding: 1rem; text-align: left;">Room</th><th style="padding: 1rem; text-align: right;">Action</th></tr>
                    </thead>
                    <tbody>
                        ${state.requests.map(req => `
                            <tr style="border-bottom: 1px solid var(--gray-100);">
                                <td style="padding: 1rem;">
                                    <b>${req.title}</b><br>
                                    <small>By ${req.submittedBy} | ${req.expectedFixAt ? '🕒 ' + req.expectedFixAt : 'No date'}</small>
                                </td>
                                <td style="padding: 1rem;">${(state.rooms.find(r => r.id === req.assetId) || {}).name || 'Unknown'}</td>
                                <td style="padding: 1rem; text-align: right;">
                                    ${req.status !== 'completed' ? `
                                        <button class="btn btn-outline btn-sm" onclick="setExpectedFix('${req.id}')">Set Date</button>
                                        <button class="btn btn-primary btn-sm" onclick="updateStatus('${req.id}', 'completed')">Fixed</button>
                                    ` : `<div style="color: var(--success); font-size: 0.7rem;">Fixed: ${req.completedAt}</div>`}
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

function renderSubmitRequest() {
    const selectedRoom = getUrlParams().roomId || "";
    
    const userHistory = state.requests.filter(req => req.submittedBy === state.currentUser.username)
        .sort((a, b) => (a.status === 'completed' ? 1 : -1));

    return `
        <div class="container-sm">
            <div class="flex-between"><h1>Report Issue</h1><button class="btn btn-outline btn-sm" onclick="logout()">Logout</button></div>
            <div class="card" style="margin: 1rem 0;">
                <div class="card-content">
                    <form id="submitRequestForm">
                        <select id="requestAsset" class="form-select" required>
                            <option value="">Select Room</option>
                            ${state.rooms.map(r => `<option value="${r.id}" ${r.id === selectedRoom ? 'selected' : ''}>${r.name}</option>`).join('')}
                        </select>
                        <input type="text" id="requestTitle" class="form-input" style="margin: 1rem 0;" placeholder="What is broken?" required>
                        <select id="requestPriority" class="form-select" style="margin-bottom: 1rem;">
                            <option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option>
                        </select>
                        <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Report</button>
                    </form>
                </div>
            </div>
            <h3>Your History (${userHistory.length})</h3>
            <div class="card">
                ${userHistory.length === 0 ? `<div style="padding:2rem; text-align:center;" class="text-muted">You haven't reported any issues yet.</div>` : 
                userHistory.map(req => `
                    <div style="padding: 1rem; border-bottom: 1px solid var(--gray-100); opacity: ${req.status === 'completed' ? 0.6 : 1}">
                        <div class="flex-between"><b>${req.title}</b><span class="badge badge-${req.priority}">${req.priority}</span></div>
                        <div style="font-size: 0.8rem; margin-top: 5px;">
                            ${req.status === 'completed' ? `<span style="color: var(--success);">✅ Fixed: ${req.completedAt}</span>` : 
                            `⏳ Pending ${req.expectedFixAt ? `<br><span style="color: var(--primary);">🕒 Expected: ${req.expectedFixAt}</span>` : ''}`}
                        </div>
                    </div>`).join('')}
            </div>
        </div>`;
}

function renderRooms() {
    return `<div class="container">
        <div class="flex-between"><h1>Rooms</h1><button class="btn btn-outline" onclick="navigate('dashboard')">Back</button></div>
        <div class="card" style="margin-top: 1rem;">
            ${state.rooms.map(r => `<div style="padding: 1rem; border-bottom: 1px solid var(--gray-100);">${r.name} - ${r.location}</div>`).join('')}
        </div>
    </div>`;
}

// ==========================================
// Init & Events
// ==========================================

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
            alert('Success!'); render();
        };
    }
}

window.addEventListener('popstate', render);
render();