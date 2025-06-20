// DOM Elements
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const togglePasswordButtons = document.querySelectorAll('.toggle-password');

// Tab Switching
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs and forms
        authTabs.forEach(t => t.classList.remove('active'));
        authForms.forEach(f => f.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding form
        tab.classList.add('active');
        const formId = `${tab.dataset.tab}-form`;
        document.getElementById(formId).classList.add('active');
    });
});

// Toggle Password Visibility
togglePasswordButtons.forEach(button => {
    button.addEventListener('click', () => {
        const input = button.previousElementSibling;
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        button.classList.toggle('fa-eye');
        button.classList.toggle('fa-eye-slash');
    });
});

// Form Validation
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}

function showError(input, message) {
    const formGroup = input.closest('.form-group');
    const errorDiv = formGroup.querySelector('.error-message') || document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    if (!formGroup.querySelector('.error-message')) {
        formGroup.appendChild(errorDiv);
    }
    input.classList.add('error');
}

function clearError(input) {
    const formGroup = input.closest('.form-group');
    const errorDiv = formGroup.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
    input.classList.remove('error');
}

// Login Form Handling
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    // Clear previous errors
    clearError(document.getElementById('login-email'));
    clearError(document.getElementById('login-password'));
    
    // Validate inputs
    let isValid = true;
    
    if (!validateEmail(email)) {
        showError(document.getElementById('login-email'), 'Please enter a valid email address');
        isValid = false;
    }
    
    if (!validatePassword(password)) {
        showError(document.getElementById('login-password'), 'Password must be at least 8 characters long');
        isValid = false;
    }
    
    if (isValid) {
        try {
            // Here you would typically make an API call to your backend
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, rememberMe })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store the token if remember me is checked
                if (rememberMe) {
                    localStorage.setItem('token', data.token);
                } else {
                    sessionStorage.setItem('token', data.token);
                }
                
                // Redirect to chat page
                window.location.href = '/chat.html';
            } else {
                showError(document.getElementById('login-email'), data.message || 'Invalid email or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError(document.getElementById('login-email'), 'An error occurred. Please try again.');
        }
    }
});

// Registration Form Handling
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    // Clear previous errors
    clearError(document.getElementById('register-username'));
    clearError(document.getElementById('register-email'));
    clearError(document.getElementById('register-password'));
    clearError(document.getElementById('register-confirm-password'));
    
    // Validate inputs
    let isValid = true;
    
    if (username.length < 3) {
        showError(document.getElementById('register-username'), 'Username must be at least 3 characters long');
        isValid = false;
    }
    
    if (!validateEmail(email)) {
        showError(document.getElementById('register-email'), 'Please enter a valid email address');
        isValid = false;
    }
    
    if (!validatePassword(password)) {
        showError(document.getElementById('register-password'), 'Password must be at least 8 characters long');
        isValid = false;
    }
    
    if (password !== confirmPassword) {
        showError(document.getElementById('register-confirm-password'), 'Passwords do not match');
        isValid = false;
    }
    
    if (isValid) {
        try {
            // Here you would typically make an API call to your backend
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store the token
                localStorage.setItem('token', data.token);
                
                // Redirect to chat page
                window.location.href = '/chat.html';
            } else {
                showError(document.getElementById('register-email'), data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showError(document.getElementById('register-email'), 'An error occurred. Please try again.');
        }
    }
});

// Social Login Handling
document.querySelector('.social-button.google').addEventListener('click', () => {
    // Implement Google OAuth login
    console.log('Google login clicked');
});

document.querySelector('.social-button.facebook').addEventListener('click', () => {
    // Implement Facebook OAuth login
    console.log('Facebook login clicked');
});

// Check for saved token on page load
window.addEventListener('load', () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
        window.location.href = '/chat.html';
    }
}); 