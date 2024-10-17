let timerInterval; // Variável para armazenar o intervalo do temporizador
let totalTimeActive = 0; // Total de tempo que a extensão ficou ativa em segundos
let presenceCheckInterval; // Intervalo de verificação de presença
let audio; // Referência ao áudio de presença

document.getElementById('startButton').addEventListener('click', () => {
    const blockTime = document.getElementById('blockTime').value;
    const websites = document.getElementById('urlList').value.split('\n').filter(url => url.trim() !== '');

    if (!blockTime || isNaN(blockTime) || parseFloat(blockTime) <= 0) {
        alert('O tempo de bloqueio deve ser maior que zero.');
        return;
    }

    chrome.runtime.sendMessage({
        action: 'startSession',
        blockTime: blockTime,
        websites: websites
    }, (response) => {
        console.log(response.status);
    });
});


// Evento de submissão do formulário de foco
document.getElementById('focusForm').addEventListener('submit', function (e) {
    e.preventDefault(); // Previne o comportamento padrão do formulário

    let websites = document.getElementById('urlList').value
        .split(',')
        .map(site => site.trim())
        .filter(site => site.length > 0); // Filtra sites vazios

    if (websites.length === 0) {
        alert('Nenhum site para bloquear foi fornecido.');
        return;
    }

    chrome.storage.sync.set({ websites: websites }, function () {
        alert('Sites bloqueados com sucesso!');
        chrome.runtime.reload(); // Reinicia o serviço para aplicar as mudanças
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');

    if (startButton) {
        startButton.addEventListener('click', function () {
            console.log('Sessão iniciada!');
            // Lógica para iniciar a sessão
        });
    } else {
        console.error('Elemento startButton não encontrado.');
    }

    // Verifica se a aba ativa está bloqueada
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const activeTab = tabs[0]; // Pega a aba ativa
        if (activeTab) {
            const blockedWebsites = await getBlockedWebsites();
            const blocked = isBlocked(activeTab.url, blockedWebsites);
            if (blocked) {
                alert("Este site está bloqueado!");
                // Redireciona para uma página em branco
                chrome.tabs.update(activeTab.id, { url: 'about:blank' });
            }
        }
    });
});

// Função para obter sites bloqueados do armazenamento
async function getBlockedWebsites() {
    return new Promise((resolve) => {
        chrome.storage.sync.get('websites', (data) => {
            resolve(data.websites || []);
        });
    });
}

// Função para verificar se a URL está bloqueada
function isBlocked(url, blockedWebsites) {
    return blockedWebsites.some(blocked => url.includes(blocked));
}

// Função para iniciar o temporizador
function startTimer(duration) {
    let timerDisplay = document.getElementById('timeDisplay');
    document.getElementById('timer').style.display = 'block';
    let timeRemaining = duration * 60; // Converte minutos em segundos

    timerInterval = setInterval(() => {
        let minutes = Math.floor(timeRemaining / 60);
        let seconds = timeRemaining % 60;

        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Verifica se o tempo acabou
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            timerDisplay.textContent = "00:00";
            document.getElementById('timer').style.display = 'none';
            alert("O tempo de foco acabou!");

            addToHistory(duration); // Adiciona ao histórico
        }

        timeRemaining--; // Decrementa o tempo restante
    }, 1000);
}

// Função para adicionar o tempo ao histórico
function addToHistory(duration) {
    totalTimeActive += duration;

    chrome.storage.sync.get('focusHistory', (data) => {
        let history = data.focusHistory || [];
        history.push(duration);
        chrome.storage.sync.set({ focusHistory: history }, () => {
            motivateUser(history); // Motiva o usuário com base no histórico
        });
    });
}

// Função para parar a sessão de foco
function stopFocus() {
    clearInterval(timerInterval); // Limpa o temporizador
    document.getElementById('timer').style.display = 'none'; // Esconde o timer

    stopPresenceCheck(); // Para a verificação de presença

    // Exibe o histórico de sessões
    chrome.storage.sync.get('focusHistory', (data) => {
        displayHistory(data.focusHistory || []);
        document.getElementById('historyDisplay').style.display = 'block';
    });

    chrome.runtime.sendMessage({ action: 'stopSession' }); // Envia mensagem para parar a sessão
}

// Função para exibir o histórico
function displayHistory(history) {
    const historyDisplay = document.getElementById('historyList');
    historyDisplay.innerHTML = ''; // Limpa o histórico atual

    history.sort((a, b) => b - a); // Ordena do maior para o menor
    history.forEach((time, index) => {
        const li = document.createElement('li');
        li.textContent = `Sessão ${index + 1}: ${time} minutos`;
        historyDisplay.appendChild(li);
    });
}

// Função para motivar o usuário
function motivateUser(history) {
    const totalMinutes = history.reduce((sum, time) => sum + time, 0);
    if (totalMinutes >= 120) {
        alert('Ótimo trabalho! Você já focou por mais de 2 horas! Continue assim!');
    } else if (totalMinutes >= 60) {
        alert('Você já focou por mais de 1 hora! Excelente progresso!');
    }
}

// Função para verificar presença
function startPresenceCheck() {
    presenceCheckInterval = setInterval(() => {
        // Aqui você pode implementar a lógica de presença
        console.log('Verificando presença...'); // Adicione sua lógica aqui
    }, 60000); // Verifica a cada 60 segundos
}

// Função para parar a verificação de presença
function stopPresenceCheck() {
    clearInterval(presenceCheckInterval);
}
