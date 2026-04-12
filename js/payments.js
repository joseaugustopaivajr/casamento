/**
 * Integração com o serviço de pagamentos DaliPay
 * Ofuscado manualmente para proteção básica de credenciais
 */

// Credenciais codificadas em Base64 para dificultar a extração direta por robôs
// SITEWEDDING e 39a06cec-1f34-4569-b78a-fc14e815593e
const _0x4d1 = {
  _t: 'aHR0cHM6Ly9hcGktZGFsaXBheS1jY2dyaGFmOWV2aDNncmI3LmNhbmFkYWNlbnRyYWwtMDEuYXp1cmV3ZWJzaXRlcy5uZXQvdjEvb2F1dGgvdG9rZW4=',
  _c: 'aHR0cHM6Ly9hcGktZGFsaXBheS1jY2dyaGFmOWV2aDNncmI3LmNhbmFkYWNlbnRyYWwtMDEuYXp1cmV3ZWJzaXRlcy5uZXQvdjEvY2hhcmdl',
  _i: 'U0lURVdFRERJTkc=',
  _s: 'MzlhMDZjZWMtMWYzNC00NTY5LWI3OGEtZmMxNGU4MTU1OTNl'
};

const _0x2b2 = (str) => atob(str);

const DALI_CONFIG = {
  tokenUrl: _0x2b2(_0x4d1._t),
  chargeUrl: _0x2b2(_0x4d1._c),
  clientId: _0x2b2(_0x4d1._i),
  clientSecret: _0x2b2(_0x4d1._s)
};

/**
 * Obtém o Bearer Token necessário para as chamadas de API
 */
async function getBearerToken() {
  const params = new URLSearchParams();
  params.append('client_id', DALI_CONFIG.clientId);
  params.append('client_secret', DALI_CONFIG.clientSecret);
  params.append('grant_type', 'client_credentials');

  const response = await fetch(DALI_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: params
  });

  if (!response.ok) {
    throw new Error('Falha ao obter token de acesso');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Cria uma solicitação de pagamento (Charge) e retorna os dados do PIX
 */
async function createCharge(amount, description) {
  const token = await getBearerToken();

  // Gerar um número de compra aleatório ou baseado no timestamp
  const numeroCompra = Math.floor(Date.now() / 1000);

  const payload = {
    numeroCompra: numeroCompra,
    valor: parseFloat(amount).toFixed(2),
    nomePagador: "Site Wedding",
    numeroIdentificadorPagador: "31473254825",
    tipoDocumento: 1,
    emailPagador: "sitewedding@gmail.com",
    solicitacaoPagador: description || "Presente de Casamento"
  };

  const response = await fetch(DALI_CONFIG.chargeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Falha ao criar cobrança');
  }

  return await response.json();
}

/**
 * Função principal para processar o pagamento e exibir na tela
 */
async function processPayment(amount, description) {
  const loader = document.getElementById("paymentLoader");
  const feedback = document.getElementById("pixFeedback");

  if (loader) loader.style.display = "flex";
  if (feedback) feedback.textContent = "⌛ Gerando QR Code...";

  try {
    const data = await createCharge(amount, description);

    if (data && data.dali && data.dali.qrCode) {
      showPaymentModal(data.dali.qrCode, data.pix.pixCopiaECola, amount);
      if (feedback) feedback.textContent = "";
    } else {
      throw new Error("Resposta da API inválida");
    }
  } catch (error) {
    console.error(error);
    alert("Ocorreu um erro ao gerar o pagamento. Por favor, tente novamente.");
    if (feedback) feedback.textContent = "❌ Erro ao gerar PIX";
  } finally {
    if (loader) loader.style.display = "none";
  }
}

/**
 * Exibe o modal com o QR Code e o Pix Copia e Cola
 */
function showPaymentModal(qrCodeBase64, pixCode, amount) {
  let modal = document.getElementById('paymentModal');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'paymentModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" onclick="closePaymentModal()">&times;</button>
      <h3>Contribuir com R$ ${parseFloat(amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>

      <div class="pix-receiver-alert">
        ⚠️ <strong>Confirmação de Segurança:</strong><br>
        Ao realizar o pagamento, confira se o recebedor é <strong>SS SERVIÇOS E TECNOLOGIA LTDA ME</strong>. Caso contrário, desconsidere a transação.
      </div>

      <p>Escaneie o QR Code abaixo com o app do seu banco:</p>

      <div class="qr-container">
        <img src="${qrCodeBase64}" alt="QR Code PIX">
      </div>

      <p class="small">Ou use o Pix Copia e Cola:</p>
      <div class="pix-copy-box">
        <code id="pixCodeText">${pixCode}</code>
        <button class="btn primary" onclick="copyPixToClipboard('${pixCode}')">Copiar Código</button>
      </div>
      <div id="modalFeedback" style="color: #b08a5a; font-weight: 600; margin-top: 10px; font-size: 14px; min-height: 20px;"></div>
    </div>
  `;

  modal.style.display = 'flex';
}

function closePaymentModal() {
  const modal = document.getElementById('paymentModal');
  if (modal) modal.style.display = 'none';
}

async function copyPixToClipboard(text) {
  const feedback = document.getElementById("modalFeedback");
  try {
    await navigator.clipboard.writeText(text);
    if (feedback) {
      feedback.textContent = "✅ Código copiado!";
      setTimeout(() => feedback.textContent = "", 2500);
    }
  } catch (e) {
    alert("Não consegui copiar. Código: " + text);
  }
}

// Expor funções globalmente
window.processPayment = processPayment;
window.closePaymentModal = closePaymentModal;
window.copyPixToClipboard = copyPixToClipboard;
