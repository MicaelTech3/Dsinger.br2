// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAo12uC5EM7t4_nocYhfOdTY15men1Ping",
    authDomain: "dsigner-com-br.firebaseapp.com",
    projectId: "dsigner-com-br",
    storageBucket: "dsigner-com-br.firebasestorage.app",
    messagingSenderId: "905799758619",
    appId: "1:905799758619:web:713beeced2de2cdd7f19be"
  };;

// Inicialização do Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const loginForm = document.getElementById('login-form');
    const supportForm = document.getElementById('support-form');
    
    // 1. Configuração de Navegação (Funciona em ambos ambientes)
    function setupNavigation() {
        // Mostra a seção com base no hash da URL
        function showSectionFromHash() {
            const hash = window.location.hash.substring(1);
            const sectionId = hash ? `${hash}-section` : 'home-section';
            
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            const activeSection = document.getElementById(sectionId);
            if (activeSection) {
                activeSection.classList.add('active');
            }
            
            // Atualiza links ativos
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${hash}` || 
                   (!hash && link.getAttribute('data-section') === 'home-section')) {
                    link.classList.add('active');
                }
            });
        }
        
        // Configura eventos de clique
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.getAttribute('data-section');
                const hash = this.getAttribute('href').substring(1);
                
                // Atualiza a URL
                history.pushState(null, null, this.getAttribute('href'));
                
                // Mostra a seção
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.remove('active');
                });
                document.getElementById(section).classList.add('active');
                
                // Atualiza links ativos
                navLinks.forEach(navLink => navLink.classList.remove('active'));
                this.classList.add('active');
            });
        });
        
        // Verifica hash inicial
        showSectionFromHash();
        
        // Configura popstate para navegação pelo browser
        window.addEventListener('popstate', showSectionFromHash);
    }

    // 2. Configuração do Formulário de Login (Firebase)
    function setupLogin() {
        if (!loginForm) return;
        
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
                })
                .finally(() => {
                    btn.disabled = false;
                    btn.textContent = originalText;
                });
        });
    }

    // 3. Configuração do Formulário de Suporte
    function setupSupport() {
        if (!supportForm) return;
        
        supportForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Feedback visual
            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = "Enviando...";
            
            fetch('https://formspree.io/f/xyzedylg', {
                method: 'POST',
                body: new FormData(this),
                headers: { 'Accept': 'application/json' }
            })
            .then(response => {
                if (!response.ok) throw new Error('Erro no servidor');
                return response.json();
            })
            .then(() => {
                window.location.href = 'enviado.html';
            })
            .catch(error => {
                alert('Erro ao enviar: ' + error.message);
            })
            .finally(() => {
                btn.disabled = false;
                btn.textContent = originalText;
            });
        });
    }

    // Função auxiliar para mensagens de erro
    function getErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email': return 'E-mail inválido';
            case 'auth/user-disabled': return 'Conta desativada';
            case 'auth/user-not-found': return 'Usuário não encontrado';
            case 'auth/wrong-password': return 'Senha incorreta';
            case 'auth/too-many-requests': return 'Muitas tentativas. Tente mais tarde';
            default: return 'Erro ao fazer login';
        }
    }

    // Inicializa todas as funcionalidades
    setupNavigation();
    setupLogin();
    setupSupport();
});