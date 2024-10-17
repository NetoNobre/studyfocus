let focusTimer; // Temporizador de foco
let alertInterval; // Intervalo para alertas periódicos
let blockedUrls = []; // Lista de URLs bloqueadas
let activeNotificationId = null; // ID da notificação ativa

// Função para redirecionar sites para blocked.html
function redirectDistractingWebsites(websites) {
    blockedUrls = websites; // Atualiza a lista de URLs bloqueadas

    const rules = websites.map((site, index) => ({
        id: index + 1,
        priority: 1,
        action: {
            type: 'redirect',
            redirect: { extensionPath: '/blocked.html' }
        },
        condition: {
            urlFilter: `*://${site}/*`,
            resourceTypes: ['main_frame']
        }
    }));

    // Remove regras anteriores e adiciona novas
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: Array.from({ length: blockedUrls.length }, (_, i) => i + 1),
        addRules: rules
    }, () => {
        if (chrome.runtime.lastError) {
            console.error('Erro ao atualizar regras:', chrome.runtime.lastError.message);
        } else {
            console.log('Regras de bloqueio aplicadas com sucesso!');
        }
    });
}

// Listener para mensagens do popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startSession') {
        startFocusSession(request);
        sendResponse({ status: 'Sessão de foco iniciada' });
    } else if (request.action === 'stopSession') {
        stopFocusSession();
        sendResponse({ status: 'Sessão de foco parada' });
    }
});

// Iniciar a sessão de foco
function startFocusSession(request) {
    const { blockTime, websites } = request;
    const parsedBlockTime = parseFloat(blockTime);

    if (!websites || websites.length === 0) {
        return showError('Nenhum site para bloquear foi fornecido.');
    }

    if (isNaN(parsedBlockTime) || parsedBlockTime <= 0) {
        return showError('O tempo de bloqueio deve ser maior que zero.');
    }

    redirectDistractingWebsites(websites);

    focusTimer = setTimeout(() => {
        endFocusSession();
    }, parsedBlockTime * 60 * 1000);

    alertInterval = setInterval(() => {
        showNotification('Lembrete!', 'Você está na sua sessão de foco!');
        playAlertSound();
    }, 10 * 60 * 1000);

    showNotification('Sessão de Foco Iniciada!', `Você tem ${parsedBlockTime} minutos para focar.`);
}

// Encerrar a sessão de foco
function endFocusSession() {
    clearInterval(alertInterval);
    showNotification('Sessão de Foco Concluída!', 'O tempo de foco acabou. Bom trabalho!');

    chrome.storage.sync.get('focusHistory', (data) => {
        const history = data.focusHistory || [];
        history.push(new Date().toLocaleString());
        chrome.storage.sync.set({ focusHistory: history });
    });

    clearFocusState();
}

// Parar a sessão de foco manualmente
function stopFocusSession() {
    clearTimeout(focusTimer);
    clearInterval(alertInterval);

    if (activeNotificationId) {
        chrome.notifications.clear(activeNotificationId);
        activeNotificationId = null;
    }

    clearFocusState();
    console.log('Sessão de foco interrompida.');
}

// Limpar estados de foco e remover regras
function clearFocusState() {
    chrome.declarativeNetRequest.updateDynamicRules(
        { removeRuleIds: Array.from({ length: blockedUrls.length }, (_, i) => i + 1) },
        () => console.log('Regras antigas removidas.')
    );
    blockedUrls = []; // Limpa a lista de URLs
}

// Exibir notificação
function showNotification(title, message) {
    chrome.notifications.create(
        {
            type: 'basic',
            iconUrl: 'icon.png',
            title: title,
            message: message,
            priority: 2
        },
        (notificationId) => {
            activeNotificationId = notificationId;
        }
    );
}

// Exibir erros como notificações
function showError(errorMessage) {
    console.error(errorMessage);
    showNotification('Erro', errorMessage);
}

// Tocar som de alerta
function playAlertSound() {
    const audio = new Audio(chrome.runtime.getURL('alert.mp3'));
    audio.play().catch((error) => {
        console.error('Erro ao tocar o som do alerta:', error);
    });
}
