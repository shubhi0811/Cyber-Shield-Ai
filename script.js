// ============================================
// Cyber Shield AI - Main JavaScript
// Features: Password Tools, Breach Check, AI Scam Detector
// APIs Used: HaveIBeenPwned, Google Gemini
// ============================================

const CONFIG = {
    GEMINI_API_KEY: 'PASTE_YOUR_GEMINI_API_KEY_HERE' // Get free key: https://aistudio.google.com/app/apikey
};

// ============================================
// 1. THEME MANAGER CLASS
// ============================================
class ThemeManager {
    constructor() {
        this.toggleBtn = document.getElementById('themeToggle');
        this.init();
    }

    init() {
        // Load saved theme on page load
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            this.setDarkMode();
        }
        this.toggleBtn.onclick = () => this.toggleTheme();
    }

    toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        isDark? this.setLightMode() : this.setDarkMode();
    }

    setDarkMode() {
        document.body.setAttribute('data-theme', 'dark');
        this.toggleBtn.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }

    setLightMode() {
        document.body.removeAttribute('data-theme');
        this.toggleBtn.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
}

// ============================================
// 2. PASSWORD TOOLKIT CLASS
// ============================================
class PasswordToolkit {
    constructor() {
        this.input = document.getElementById('passwordInput');
        this.strengthFill = document.getElementById('strengthFill');
        this.strengthText = document.getElementById('strengthText');
        this.generateBtn = document.getElementById('generateBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.lengthInput = document.getElementById('passLength');
        this.symbolsCheck = document.getElementById('includeSymbols');
        this.numbersCheck = document.getElementById('includeNumbers');
        
        this.init();
    }

    init() {
        this.input.oninput = () => this.updateStrengthMeter();
        this.generateBtn.onclick = () => this.generatePassword();
        this.copyBtn.onclick = () => this.copyToClipboard();
    }

    calculateStrength(password) {
        let score = 0;
        if (password.length >= 12) score++;
        if (password.length >= 16) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score; // 0-5
    }

    updateStrengthMeter() {
        const pwd = this.input.value;
        const score = this.calculateStrength(pwd);
        
        const levels = [
            { width: '0%', label: 'None', color: 'var(--danger)' },
            { width: '20%', label: 'Very Weak', color: 'var(--danger)' },
            { width: '40%', label: 'Weak', color: 'var(--warning)' },
            { width: '60%', label: 'Medium', color: 'var(--warning)' },
            { width: '80%', label: 'Strong', color: 'var(--success)' },
            { width: '100%', label: 'Very Strong', color: 'var(--success)' }
        ];
        
        const level = levels[score];
        this.strengthFill.style.width = level.width;
        this.strengthFill.style.background = level.color;
        this.strengthText.textContent = `Strength: ${level.label}`;
    }

    generatePassword() {
        const length = parseInt(this.lengthInput.value);
        const useSymbols = this.symbolsCheck.checked;
        const useNumbers = this.numbersCheck.checked;
        
        let charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (useNumbers) charset += '0123456789';
        if (useSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }
        
        this.input.value = password;
        this.updateStrengthMeter();
    }

    copyToClipboard() {
        navigator.clipboard.writeText(this.input.value);
        this.copyBtn.textContent = '✅ Copied';
        setTimeout(() => this.copyBtn.textContent = '📋 Copy', 2000);
    }
}

// ============================================
// 3. BREACH CHECKER CLASS - Uses k-anonymity
// ============================================
class BreachChecker {
    constructor() {
        this.input = document.getElementById('breachInput');
        this.checkBtn = document.getElementById('breachBtn');
        this.resultDiv = document.getElementById('breachResult');
        
        this.checkBtn.onclick = () => this.checkPassword();
    }

    async hashPassword(password) {
        // SHA-1 hash for HaveIBeenPwned API
        const buffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
        return Array.from(new Uint8Array(hashBuffer))
           .map(b => b.toString(16).padStart(2, '0'))
           .join('').toUpperCase();
    }

    async checkPassword() {
        const password = this.input.value;
        if (!password) {
            this.showResult('Enter a password first', 'result-warn');
            return;
        }
        
        this.resultDiv.textContent = 'Checking securely...';
        const hash = await this.hashPassword(password);
        const prefix = hash.slice(0, 5); // First 5 chars sent to API
        const suffix = hash.slice(5); // Rest stays local
        
        try {
            const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
            const text = await response.text();
            const match = text.split('\n').find(line => line.split(':')[0] === suffix);
            
            if (match) {
                const count = match.split(':')[1].trim();
                this.showResult(`⚠️ Pwned! Found in ${count} data breaches. Never use this password.`, 'result-danger');
            } else {
                this.showResult('✅ Good news! Not found in known breaches.', 'result-safe');
            }
        } catch (error) {
            this.showResult('Error connecting to breach database. Try again.', 'result-warn');
        }
    }

    showResult(message, className) {
        this.resultDiv.innerHTML = `<span class="${className}">${message}</span>`;
    }
}

// ============================================
// 4. AI SCAM DETECTOR CLASS - Uses Gemini
// ============================================
class ScamDetector {
    constructor() {
        this.input = document.getElementById('scamInput');
        this.scanBtn = document.getElementById('scanBtn');
        this.resultDiv = document.getElementById('scamResult');
        
        this.scanBtn.onclick = () => this.analyzeText();
    }

    async analyzeText() {
        const text = this.input.value.trim();
        if (!text) {
            this.showResult('Paste suspicious text first', 'result-warn');
            return;
        }
        
        if (CONFIG.GEMINI_API_KEY === 'PASTE_YOUR_GEMINI_API_KEY_HERE') {
            this.showResult('Add your Gemini API key at the top of script.js first', 'result-warn');
            return;
        }
        
        this.resultDiv.textContent = 'Analyzing with AI...';
        
        const prompt = `You are a cybersecurity expert. Analyze this message for scams/phishing. 
        Reply in this exact format:
        1. Risk Level: Safe / Suspicious / Scam
        2. Why: One sentence explanation
        3. Red Flags: Bullet list of suspicious elements
        
        Message to analyze: "${text}"`;
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${CONFIG.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            
            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text;
            
            // Color code based on risk level
            let riskClass = 'result-safe';
            if (aiText.includes('Scam')) riskClass = 'result-danger';
            else if (aiText.includes('Suspicious')) riskClass = 'result-warn';
            
            this.showResult(aiText.replace(/\n/g, '<br>'), riskClass);
        } catch (error) {
            this.showResult('AI analysis failed. Check API key or internet connection.', 'result-warn');
        }
    }

    showResult(message, className) {
        this.resultDiv.innerHTML = `<span class="${className}">${message}</span>`;
    }
}


// 5. CYBER TIPS CLASS

class CyberTips {
    constructor() {
        this.tipElement = document.getElementById('cyberTip');
        this.newTipBtn = document.getElementById('newTipBtn');
        
        this.tips = [
            "Use a unique password for every account. Password managers make this easy.",
            "Enable 2FA on email, banking, and social media. It's your best defense.",
            "Don't click links in urgent emails. Go to the website directly instead.",
            "Update software regularly. Patches fix security holes hackers exploit.",
            "Check URLs carefully. Phishing sites use tricks like 'paypaI.com' with capital i.",
            "Public WiFi is risky. Use a VPN or mobile data for banking/shopping.",
            "Back up files 3-2-1: 3 copies, 2 different media, 1 offsite/cloud.",
            "Cover your webcam when not using it. Malware can activate it secretly."
        ];
        
        this.newTipBtn.onclick = () => this.showRandomTip();
        this.showRandomTip(); // Show first tip on load
    }

    showRandomTip() {
        const randomIndex = Math.floor(Math.random() * this.tips.length);
        this.tipElement.textContent = this.tips[randomIndex];
    }
}


// INITIALIZE ALL MODULES WHEN PAGE LOADS

document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
    new PasswordToolkit();
    new BreachChecker();
    new ScamDetector();
    new CyberTips();
    console.log('🛡️ Cyber Shield AI loaded successfully');
});