const firebaseConfig = {
    apiKey: "AIzaSyAo12uC5EM7t4_nocYhfOdTY15men1Ping",
    authDomain: "dsigner-com-br.firebaseapp.com",
    databaseURL: "https://dsigner-com-br-default-rtdb.firebaseio.com",
    projectId: "dsigner-com-br",
    storageBucket: "dsigner-com-br.firebasestorage.app",
    messagingSenderId: "905799758619",
    appId: "1:905799758619:web:713beeced2de2cdd7f19be"
  };
  
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Feedback visual
            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = "Autenticando...";
            
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then(() => {
                    window.location.href = 'painel.html';
                })
                .catch(error => {
                    document.getElementById('login-message').textContent = getErrorMessage(error);
                    btn.disabled = false;
                    btn.textContent = originalText;
                });
        });
    }
});

function getErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email': return 'Email inválido';
        case 'auth/user-disabled': return 'Conta desativada';
        case 'auth/user-not-found': return 'Usuário não encontrado';
        case 'auth/wrong-password': return 'Senha incorreta';
        default: return 'Erro ao fazer login';
    }
}