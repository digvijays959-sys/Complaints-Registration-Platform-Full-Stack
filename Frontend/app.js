// --- Configuration ---
const BACKEND_BASE_URL = "http://localhost:3000/api";

// --- State Management ---
let currentUser = null;

// --- DOM Elements ---
const sections = {
    register: document.getElementById('register-section'),
    login: document.getElementById('login-section'),
    submit: document.getElementById('submit-complaint-section'),
    myComplaints: document.getElementById('my-complaints-section'),
    admin: document.getElementById('admin-section')
};

const nav = document.getElementById('main-nav');
const navLinks = {
    my: document.getElementById('nav-complaints'),
    admin: document.getElementById('nav-admin')
};

// --- Routing ---
function showSection(sectionId) {
    Object.values(sections).forEach(s => s.classList.add('hidden'));
    if (sections[sectionId]) {
        sections[sectionId].classList.remove('hidden');
    }
    updateNav();
}

function updateNav() {
    if (currentUser) {
        nav.classList.remove('hidden');
        if (currentUser.role === 'admin') {
            navLinks.admin.classList.remove('hidden');
            navLinks.my.classList.add('hidden');
        } else {
            navLinks.my.classList.remove('hidden');
            navLinks.admin.classList.add('hidden');
        }
    } else {
        nav.classList.add('hidden');
    }
}

// --- API Helpers ---
async function apiFetch(endpoint, options = {}) {
    options.credentials = 'include'; // Essential for cookies
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
        options.headers = { ...options.headers, 'Content-Type': 'application/json' };
    }

    try {
        const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Something went wrong');
        return data;
    } catch (err) {
        showToast(err.message, 'error');
        throw err;
    }
}

// --- Toast ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// --- Auth Functions ---
async function checkSession() {
    try {
        const user = await apiFetch('/auth/me');
        currentUser = user;
        if (user.role === 'admin') showSection('admin');
        else showSection('myComplaints');
        if (user.role === 'admin') loadAdminComplaints();
        else loadMyComplaints();
    } catch {
        currentUser = null;
        showSection('login');
    }
}

// --- Event Listeners ---

// Register Flow
document.getElementById('send-otp-btn').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    try {
        await apiFetch('/auth/send-otp', { method: 'POST', body: { name, email } });
        document.getElementById('register-step-1').classList.add('hidden');
        document.getElementById('register-step-2').classList.remove('hidden');
        showToast('OTP sent to your email');
    } catch {}
});

document.getElementById('verify-reg-btn').addEventListener('click', async () => {
    const email = document.getElementById('reg-email').value;
    const otp = document.getElementById('reg-otp').value;
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm-password').value;

    if (password !== confirm) return showToast('Passwords do not match', 'error');

    try {
        await apiFetch('/auth/register', { method: 'POST', body: { email, otp, password } });
        showToast('Registration successful! Please login.');
        showSection('login');
    } catch {}
});

// Login
document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const user = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
        currentUser = user;
        showToast(`Welcome back, ${user.name}!`);
        if (user.role === 'admin') {
            showSection('admin');
            loadAdminComplaints();
        } else {
            showSection('myComplaints');
            loadMyComplaints();
        }
    } catch {}
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await apiFetch('/auth/logout', { method: 'POST' });
        currentUser = null;
        showSection('login');
    } catch {}
});

// Navigation Click Handlers
document.getElementById('nav-complaints').addEventListener('click', () => {
    showSection('myComplaints');
    loadMyComplaints();
});

document.getElementById('nav-admin').addEventListener('click', () => {
    showSection('admin');
    loadAdminComplaints();
});

document.getElementById('goto-register').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('register');
});

document.getElementById('goto-login').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('login');
});

document.getElementById('goto-submit-btn').addEventListener('click', () => {
    showSection('submit');
    document.getElementById('complaint-step-1').classList.remove('hidden');
    document.getElementById('complaint-step-2').classList.add('hidden');
    document.getElementById('complaint-text').value = '';
});

// --- Complaint Flow ---
let currentAiQuestion = '';

document.getElementById('get-ai-q-btn').addEventListener('click', async () => {
    const text = document.getElementById('complaint-text').value;
    if (!text) return showToast('Please enter your complaint', 'error');

    try {
        const { question } = await apiFetch('/ai/question', { method: 'POST', body: { complaint_text: text } });
        currentAiQuestion = question;
        document.getElementById('ai-question-display').textContent = question;
        document.getElementById('complaint-step-1').classList.add('hidden');
        document.getElementById('complaint-step-2').classList.remove('hidden');
    } catch {}
});

document.getElementById('submit-final-complaint-btn').addEventListener('click', async () => {
    const text = document.getElementById('complaint-text').value;
    const answer = document.getElementById('user-answer').value;

    try {
        await apiFetch('/complaints', { 
            method: 'POST', 
            body: { 
                complaint_text: text, 
                ai_question: currentAiQuestion, 
                user_answer: answer 
            } 
        });
        showToast('Complaint submitted successfully');
        showSection('myComplaints');
        loadMyComplaints();
    } catch {}
});

// --- Data Loading ---
async function loadMyComplaints() {
    const list = document.getElementById('my-complaints-list');
    list.innerHTML = '<p>Loading complaints...</p>';
    try {
        const complaints = await apiFetch('/complaints/my');
        if (complaints.length === 0) {
            list.innerHTML = '<p class="text-dim">You haven\'t submitted any complaints yet.</p>';
            return;
        }
        list.innerHTML = complaints.map(c => renderComplaint(c)).join('');
    } catch {}
}

async function loadAdminComplaints() {
    const list = document.getElementById('admin-complaints-list');
    list.innerHTML = '<p>Loading all complaints...</p>';
    try {
        const complaints = await apiFetch('/complaints/admin/all');
        if (complaints.length === 0) {
            list.innerHTML = '<p class="text-dim">No complaints found in the system.</p>';
            return;
        }
        list.innerHTML = complaints.map(c => renderComplaint(c, true)).join('');
    } catch {}
}

function renderComplaint(c, isAdmin = false) {
    const date = new Date(c.created_at).toLocaleDateString();
    return `
        <div class="complaint-card">
            <div class="complaint-meta">
                <span>${isAdmin ? `<strong>${c.userName}</strong> (${c.userEmail})` : 'Complaint ID: #' + c.id}</span>
                <span>${date}</span>
            </div>
            <div class="complaint-text">
                <p>${c.complaint_text}</p>
            </div>
            <div class="complaint-qa">
                <div class="qa-item">
                    <p class="qa-label">Follow-up Question</p>
                    <p><em>${c.ai_question || 'N/A'}</em></p>
                </div>
                <div class="qa-item">
                    <p class="qa-label">Answer</p>
                    <p>${c.user_answer || 'N/A'}</p>
                </div>
            </div>
        </div>
    `;
}

// Initial Load
checkSession();
