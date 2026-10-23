<?php
require __DIR__ . '/config.php';

function esc($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

$valor = isset($_GET['amount']) ? (float) str_replace(',', '.', $_GET['amount']) : 0;
$centavos = (int) round($valor * 100);
$nome = isset($_GET['nome']) ? trim(mb_substr($_GET['nome'], 0, 60)) : '';

$erro = null;
$pix = null;

// Mínimo R$ 1,00 e máximo R$ 7.000,00 + taxa opcional de R$ 4,99
if ($centavos < 100 || $centavos > 700499) {
    $erro = 'Valor inválido. Volte e escolha um valor entre R$ 1,00 e R$ 7.000,00.';
} else {
    $corpo = [
        'amountCents'      => $centavos,
        'reference'        => 'kaue-' . date('YmdHis') . '-' . bin2hex(random_bytes(4)),
        'description'      => 'Doação - Campanha do Kauê',
        'expiresInSeconds' => 3600,
    ];
    if ($nome !== '' && strcasecmp($nome, 'Anonimo') !== 0) $corpo['customerName'] = $nome;

    $mapaUtm = [
        'utm_source' => 'utmSource', 'utm_medium' => 'utmMedium', 'utm_campaign' => 'utmCampaign',
        'utm_content' => 'utmContent', 'utm_term' => 'utmTerm', 'src' => 'utmSrc', 'sck' => 'utmSck',
    ];
    foreach ($mapaUtm as $q => $campo) {
        if (!empty($_GET[$q])) $corpo[$campo] = mb_substr((string) $_GET[$q], 0, 200);
    }

    list($http, $r) = gladepay_request('POST', '/deposito', $corpo);
    if ($http >= 200 && $http < 300 && !empty($r['qrCodeText'])) {
        $pix = $r;
    } else {
        $erro = 'Não foi possível gerar o Pix agora. Tente novamente em instantes.';
        error_log('GladePay erro HTTP ' . $http . ': ' . ($r['error'] ?? 'desconhecido'));
    }
}

$idTransacao = $pix['publicId'] ?? ($pix['txId'] ?? '');
$qrSrc = '';
if ($pix) {
    if (!empty($pix['qrCodeBase64'])) $qrSrc = 'data:image/png;base64,' . $pix['qrCodeBase64'];
    elseif (!empty($pix['qrCodeUrl'])) $qrSrc = $pix['qrCodeUrl'];
}
$expiraEm = $pix['expiresAt'] ?? '';
?><!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Pague com Pix | Causas do Bem</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/style.css">
<style>
body{background:var(--creme)}
.pg-top{background:radial-gradient(ellipse 120% 90% at 50% -10%, #0353d4 0%, var(--azul) 50%, var(--azul-escuro) 100%);color:#fff;text-align:center;padding:1.6rem 0 3.6rem}
.pg-top img{height:50px;margin:0 auto 1rem}
.pg-top h1{font-size:1.45rem;font-weight:800}
.pg-top p{font-size:.88rem;color:rgba(255,255,255,.8);margin-top:.35rem}
.pg-card{margin:-2.4rem auto 2rem;background:#fff;border:1px solid var(--borda);border-radius:var(--raio-lg);box-shadow:var(--sombra);padding:1.4rem 1.3rem 1.5rem;text-align:center}
.pg-valor{font-family:var(--fonte-display);font-size:2rem;font-weight:800;color:var(--azul-escuro)}
.pg-lbl{font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--azul);margin-bottom:4px}
.pg-qr{width:230px;height:230px;margin:1rem auto;padding:10px;border:2px dashed var(--amarelo);border-radius:16px;background:#fff}
.pg-qr img{width:100%;height:100%;object-fit:contain}
.pg-timer{display:inline-flex;gap:6px;align-items:center;background:var(--azul-nevoa);color:var(--azul-escuro);font-weight:700;font-size:.8rem;padding:5px 14px;border-radius:50px;margin-bottom:1rem}
.pg-codigo{background:var(--amarelo-suave);border:2px dashed var(--amarelo);border-radius:14px;padding:.8rem .9rem;font-family:monospace;font-size:.78rem;color:var(--azul-noite);word-break:break-all;max-height:84px;overflow:auto;text-align:left;margin-bottom:.8rem;user-select:all}
.btn-copiar{width:100%;background:var(--amarelo);color:var(--azul-noite);border-radius:14px;padding:1rem;font-size:.95rem;font-weight:800;letter-spacing:.03em;display:flex;align-items:center;justify-content:center;gap:9px;animation:pulse-btn 2s ease-out infinite}
.btn-copiar.ok{background:var(--azul);color:#fff;animation:none}
.passos{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:1.2rem}
.passo{background:var(--azul-nevoa);border-radius:12px;padding:.6rem .4rem}
.passo .num{width:20px;height:20px;margin:0 auto 4px;background:var(--azul);color:#fff;border-radius:50%;font-size:.66rem;font-weight:800;display:flex;align-items:center;justify-content:center}
.passo span{font-size:.64rem;font-weight:600;color:var(--azul-noite);line-height:1.3;display:block}
.pg-status{margin-top:1.1rem;font-size:.8rem;color:var(--tinta-suave);display:flex;align-items:center;justify-content:center;gap:8px}
.pg-status .dot{width:8px;height:8px;border-radius:50%;background:var(--perigo);animation:pulse-dot 1.4s infinite}
.pg-ok{display:none;padding:1.4rem 0 .4rem}
.pg-ok .check{width:68px;height:68px;border-radius:50%;background:var(--azul);color:#fff;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center}
.pg-ok h2{font-size:1.4rem;color:var(--azul-noite);margin-bottom:.4rem}
.pg-ok p{font-size:.92rem;color:var(--tinta-suave)}
.pg-erro{padding:1rem 0}
.pg-voltar{display:inline-block;margin-top:1rem;background:var(--azul);color:#fff;font-weight:800;padding:.9rem 1.6rem;border-radius:14px}
.pg-seguro{font-size:.72rem;color:var(--tinta-suave);margin-top:1rem}
@media (max-width:380px){.pg-qr{width:200px;height:200px}}
</style>
</head>
<body>
<div class="pg-top">
  <div class="wrap">
    <img src="../imagens/logocdb.png" alt="Causas do Bem">
    <h1>Falta pouco para ajudar o Kauê 💙</h1>
    <p>Pague com Pix para concluir sua doação</p>
  </div>
</div>

<div class="wrap">
  <div class="pg-card">
<?php if ($erro): ?>
    <div class="pg-erro">
      <h2 style="color:var(--azul-noite);margin-bottom:.5rem">Ops!</h2>
      <p style="color:var(--tinta-suave)"><?= esc($erro) ?></p>
      <a class="pg-voltar" href="../index.html">Voltar e tentar de novo</a>
    </div>
<?php else: ?>
    <div id="areaPagamento">
      <div class="pg-lbl">Valor da doação</div>
      <div class="pg-valor">R$ <?= number_format($centavos / 100, 2, ',', '.') ?></div>

      <?php if ($qrSrc): ?>
      <div class="pg-qr"><img src="<?= esc($qrSrc) ?>" alt="QR Code Pix"></div>
      <?php endif; ?>

      <div class="pg-timer">⏱ Expira em <span id="contador">--:--</span></div>

      <div class="pg-lbl">Pix copia e cola</div>
      <div class="pg-codigo" id="codigoPix"><?= esc($pix['qrCodeText']) ?></div>
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
      <a class="pg-voltar" href="../index.html">Voltar ao início</a>
    </div>
<?php endif; ?>
  </div>
</div>

<?php if (!$erro): ?>
<script>
(function(){
  var ID = <?= json_encode($idTransacao) ?>;
  var EXPIRA = new Date(<?= json_encode($expiraEm) ?>).getTime();
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
    fetch('status.php?id=' + encodeURIComponent(ID), {cache:'no-store'})
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
</script>
<?php endif; ?>
</body>
</html>
