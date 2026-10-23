// Vercel Function: GET /api/gerarpix?amount=..&nome=..
// Cria o Pix chamando o fluxo do N8N (PIX - Create V2), que fala com a GladePay.
// Variável opcional: N8N_PIX_CREATE_URL (padrão abaixo).
const { randomUUID } = require("crypto");

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

const URL_PADRAO = "https://webhook.linikerwambaster.com.br/webhook/pix-create-v2";
const MIN_CENTAVOS = 500;      // R$ 5,00 (a GladePay recusa valores muito baixos)
const MAX_CENTAVOS = 700499;   // R$ 7.000,00 + taxa opcional de R$ 4,99

module.exports = async function handler(req, res) {
  const env = process.env;
  const url = new URL(req.url, "https://" + (req.headers.host || "localhost"));
  const valor = parseFloat(String(url.searchParams.get("amount") || "0").replace(",", ".")) || 0;
  const centavos = Math.round(valor * 100);

  let erro = null;
  let pix = null;

  if (centavos < MIN_CENTAVOS || centavos > MAX_CENTAVOS) {
    erro = "Valor inválido. Volte e escolha um valor entre R$ 5,00 e R$ 7.000,00.";
  } else {
    try {
      const resp = await fetch(env.N8N_PIX_CREATE_URL || URL_PADRAO, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          amount: centavos / 100,
          ref: "kaue-" + Date.now() + "-" + randomUUID().slice(0, 8),
        }),
      });
      const texto = await resp.text();
      let json = {};
      try { json = JSON.parse(texto); } catch (e) { /* resposta não-JSON */ }
      if (resp.ok && json.qrCodeText) {
        pix = json;
      } else {
        erro = "Não foi possível gerar o Pix agora. Tente novamente em instantes.";
        console.error("N8N/GladePay erro HTTP " + resp.status + ": " + (json.message || json.error || texto.replace(/s+/g, " ").slice(0, 300) || "sem corpo"));
      }
    } catch (e) {
      erro = "Não foi possível gerar o Pix agora. Tente novamente em instantes.";
      console.error("Falha de conexão com o N8N: " + e.message);
    }
  }

  res.statusCode = erro ? 502 : 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(pagina({ centavos, erro, pix }));
};

function pagina({ centavos, erro, pix }) {
  let qrSrc = '';
  if (pix) {
    if (pix.qrCodeBase64) qrSrc = 'data:image/png;base64,' + pix.qrCodeBase64;
    else if (pix.qrCodeUrl) qrSrc = pix.qrCodeUrl;
  }
  const idTransacao = pix ? pix.publicId || pix.txId || '' : '';
  const valorTxt = (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const corpo = erro
    ? `<div class="pg-erro">
      <h2 style="color:var(--azul-noite);margin-bottom:.5rem">Ops!</h2>
      <p style="color:var(--tinta-suave)">${esc(erro)}</p>
      <a class="pg-voltar" href="/">Voltar e tentar de novo</a>
    </div>`
    : `<div id="areaPagamento">
      <div class="pg-lbl">Valor da doação</div>
      <div class="pg-valor">R$ ${valorTxt}</div>
      <div class="pg-qr" id="qrBox">${qrSrc ? `<img src="${esc(qrSrc)}" alt="QR Code Pix">` : ''}</div>
      <div class="pg-timer">⏱ Expira em <span id="contador">--:--</span></div>
      <div class="pg-lbl">Pix copia e cola</div>
      <div class="pg-codigo" id="codigoPix">${esc(pix.qrCodeText)}</div>
      <button class="btn-copiar" id="btnCopiar" type="button">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span>COPIAR CÓDIGO PIX</span>
      </button>
      <div class="passos">
        <div class="passo"><div class="num">1</div><span>Copie o código</span></div>
        <div class="passo"><div class="num">2</div><span>Abra seu banco</span></div>
        <div class="passo"><div class="num">3</div><span>Pix → Copia e Cola</span></div>
        <div class="passo"><div class="num">4</div><span>Confirme e doe 💙</span></div>
      </div>
      <div class="pg-status"><span class="dot"></span> Aguardando o pagamento…</div>
      <div class="pg-seguro">🔒 Pagamento 100% seguro e verificado</div>
    </div>
    <div class="pg-ok" id="areaOk">
      <div class="check"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
      <h2>Doação confirmada!</h2>
      <p>Muito obrigado pelo seu carinho. Você ajuda o Kauê a continuar respirando em segurança. 💙</p>
      <a class="pg-voltar" href="/">Voltar ao início</a>
    </div>`;

  const script = erro ? '' : `<script>
(function(){
  var ID = ${JSON.stringify(idTransacao)};
  var EXPIRA = Date.now() + 3600 * 1000;
  var qrBox = document.getElementById('qrBox');
  if (qrBox && !qrBox.firstChild && window.QRCode) {
    new QRCode(qrBox, { text: document.getElementById('codigoPix').innerText.trim(), width: 206, height: 206, correctLevel: QRCode.CorrectLevel.M });
  }
  var btn = document.getElementById('btnCopiar');
  var codigo = document.getElementById('codigoPix');
  var contador = document.getElementById('contador');
  btn.addEventListener('click', function(){
    var txt = codigo.innerText.trim();
    function feito(){
      btn.classList.add('ok');
      btn.querySelector('span').textContent = 'CÓDIGO COPIADO!';
      setTimeout(function(){ btn.classList.remove('ok'); btn.querySelector('span').textContent = 'COPIAR CÓDIGO PIX'; }, 3000);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt).then(feito);
    } else {
      var ta = document.createElement('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta); feito();
    }
  });
  function tick(){
    if (!EXPIRA) { contador.textContent = '60:00'; return; }
    var s = Math.max(0, Math.floor((EXPIRA - Date.now()) / 1000));
    contador.textContent = String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
  }
  tick(); setInterval(tick, 1000);
  var pago = false;
  function checa(){
    if (pago || !ID) return;
    fetch('/api/status?id=' + encodeURIComponent(ID), {cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (d && d.status === 'SETTLED') {
          pago = true;
          document.getElementById('areaPagamento').style.display = 'none';
          document.getElementById('areaOk').style.display = 'block';
          window.scrollTo({top:0, behavior:'smooth'});
        }
      }).catch(function(){});
  }
  setInterval(checa, 4000);
})();
</script>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Pague com Pix | Causas do Bem</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">
<link rel="stylesheet" href="/assets/pix.css">
</head>
<body>
<div class="pg-top">
  <div class="wrap">
    <img class="pg-banner" src="/imagens/banner1cdb.webp" alt="Campanha do Kauê">
    <h1>Falta pouco para ajudar o Kauê 💙</h1>
    <p>Pague com Pix para concluir sua doação</p>
  </div>
</div>
<div class="wrap">
  <div class="pg-card">
${corpo}
  </div>
</div>
${erro ? '' : '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>'}
${script}
</body>
</html>`;
}
