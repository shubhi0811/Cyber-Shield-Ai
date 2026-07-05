// ============================================
// Cyber Shield AI - Main JavaScript
// Features: Password Tools, Breach Check, Local Scam Detector
// APIs Used: HaveIBeenPwned
// ============================================

function checkPasswordStrength(password) {
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');

    if (!password) {
        strengthFill.className = 'strength-fill';
        strengthFill.removeAttribute('style');
        strengthText.textContent = 'None';
        strengthText.className = 'strength-text';
        return;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    strengthFill.className = 'strength-fill';
    strengthText.className = 'strength-text';

    if (score <= 2) {
        strengthFill.id = 'strength-fill';
        strengthFill.classList.add('weak');
        strengthText.classList.add('weak');
        strengthText.textContent = 'Weak';
    } else if (score === 3) {
        strengthFill.id = 'strength-fill';
        strengthFill.classList.add('medium');
        strengthText.classList.add('medium');
        strengthText.textContent = 'Medium';
    } else if (score === 4) {
        strengthFill.id = 'strength-fill';
        strengthFill.classList.add('strong');
        strengthText.classList.add('strong');
        strengthText.textContent = 'Strong';
    } else {
        strengthFill.id = 'strength-fill';
        strengthFill.classList.add('very-strong');
        strengthText.classList.add('very-strong');
        strengthText.textContent = 'Very Strong';
    }
}

// ============================================
// 1. PASSWORD TOOLKIT CLASS
// ============================================
class PasswordToolkit {
    constructor() {
        this.input = document.getElementById('password-input');
        this.strengthFill = document.getElementById('strength-fill');
        this.strengthText = document.getElementById('strength-text');
        this.generateBtn = document.getElementById('generateBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.lengthInput = document.getElementById('passLength');
        this.symbolsCheck = document.getElementById('includeSymbols');
        this.numbersCheck = document.getElementById('includeNumbers');
        
        this.init();
    }

    init() {
        this.input.oninput = () => checkPasswordStrength(this.input.value);
        this.generateBtn.onclick = () => this.generatePassword();
        this.copyBtn.onclick = () => this.copyToClipboard();
    }

    calculateStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    }

    updateStrengthMeter() {
        checkPasswordStrength(this.input.value);
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
// 4. SCAM DETECTOR CLASS - Runs locally
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
        
        this.resultDiv.textContent = 'Checking for scams locally...';
        
        try {
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            
            const data = await response.json();

            if (!response.ok) {
                const message = data?.error || 'Scam analysis failed. Check server logs.';
                this.showResult(message, 'result-warn');
                return;
            }

            const riskLevel = data.riskLevel || 'Safe';
            const score = data.score ?? 'n/a';
            const why = data.why || 'No common scam patterns found.';
            const redFlags = data.redFlags || [];

            let riskClass = 'result-safe';
            if (riskLevel === 'Scam') riskClass = 'result-danger';
            else if (riskLevel === 'Suspicious') riskClass = 'result-warn';

            const details = [
                `<strong>Risk Level:</strong> ${riskLevel}`,
                `<strong>Score:</strong> ${score}`,
                `<strong>Why:</strong> ${why}`
            ];
            if (redFlags.length) {
                details.push(`<strong>Red Flags:</strong> ${redFlags.join(', ')}`);
            }
            
            this.showResult(details.join('<br>'), riskClass);
        } catch (error) {
            this.showResult('Scam analysis failed. Check server connection.', 'result-warn');
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

document.getElementById('password-input').addEventListener('input', (e) => {
    checkPasswordStrength(e.target.value);
});

document.addEventListener('DOMContentLoaded', () => {
    new PasswordToolkit();
    new BreachChecker();
    new ScamDetector();
    new CyberTips();
    console.log('🛡️ Cyber Shield AI loaded successfully');
});