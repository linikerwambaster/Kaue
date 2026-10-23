var selectedDonationAmount = null;
var TAXA_PIX = 4.99;

function formatCurrency(amount){
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(amount);
}

function openDonationModal(){
  document.getElementById('donationModal').classList.add('active');
  document.body.style.overflow='hidden';
  goToStep1();
}
function closeDonationModal(){
  document.getElementById('donationModal').classList.remove('active');
  document.body.style.overflow='';
  selectedDonationAmount=null;
  document.querySelectorAll('.pill-btn').forEach(function(b){b.classList.remove('selected')});
  var ca=document.getElementById('customAmount'); if(ca) ca.value='';
  resetDonationForm();
  hideDonationLoading();
}

function showStep(id){
  document.querySelectorAll('.donation-step').forEach(function(s){s.classList.remove('active');s.style.display='';});
  var t=document.getElementById(id); if(t) t.classList.add('active');
}
function goToStep1(){
  showStep('donationStep1');
  hideDonationLoading();
}
function goToStep2(){
  var customInput=document.getElementById('customAmount');
  var customVal=customInput?parseFloat(customInput.value):0;
  var amount=selectedDonationAmount;
  if(customVal && customVal>0) amount=customVal;

  if(!amount || amount<=0){alert('Por favor, selecione um valor ou digite um valor personalizado.');return;}
  if(amount<1){alert('O valor mínimo para doação é de R$ 1,00.');return;}
  if(amount>7000){alert('O valor máximo para doação é de R$ 7.000,00.');return;}

  selectedDonationAmount=Math.round(amount*100)/100;
  updateAmountDisplay();
  showStep('donationStep2Unica');
}
function goBackToStep1(){goToStep1()}

function selectDonationAmount(amount,btn){
  selectedDonationAmount=amount;
  document.querySelectorAll('.pill-btn').forEach(function(b){b.classList.remove('selected')});
  if(btn) btn.classList.add('selected');
  var ca=document.getElementById('customAmount'); if(ca) ca.value='';
}
function handleCustomAmount(){
  var ca=document.getElementById('customAmount');
  var val=ca?parseFloat(ca.value):0;
  if(val>0){
    selectedDonationAmount=null;
    document.querySelectorAll('.pill-btn').forEach(function(b){b.classList.remove('selected')});
  }
}

function toggleTurbine(){
  var cb=document.getElementById('addAdministrativeFee');
  var card=document.getElementById('turbineCard');
  cb.checked=!cb.checked;
  card.classList.toggle('ativo',cb.checked);
  updateAmountDisplay();
}
function updateAmountDisplay(){
  var cb=document.getElementById('addAdministrativeFee');
  var display=document.getElementById('selectedAmountDisplay');
  if(!display || !selectedDonationAmount) return;
  var total=selectedDonationAmount+(cb && cb.checked ? TAXA_PIX : 0);
  display.textContent=formatCurrency(total);
}

function resetDonationForm(){
  ['donorName','donorPhone'].forEach(function(id){
    var el=document.getElementById(id); if(el){el.value='';el.disabled=false;}
  });
  var turbCb=document.getElementById('addAdministrativeFee'); if(turbCb) turbCb.checked=false;
  var turbCard=document.getElementById('turbineCard'); if(turbCard) turbCard.classList.remove('ativo');
}

function showDonationLoading(){
  document.querySelectorAll('.donation-step').forEach(function(s){s.classList.remove('active');s.style.display='none';});
  document.getElementById('donationLoading').style.display='flex';
}
function hideDonationLoading(){
  document.getElementById('donationLoading').style.display='none';
}

function generateContribution(){
  var nomeEl=document.getElementById('donorName');
  var telEl=document.getElementById('donorPhone');

  var rawNome=nomeEl?nomeEl.value.trim():'';
  var nome=rawNome.length>0 ? rawNome : 'Anonimo';

  var rawPhone=telEl?telEl.value.replace(/\D/g,''):'';
  var telefone=rawPhone.length>=10 ? '+55'+rawPhone : '+5511000000000';

  if(!selectedDonationAmount || selectedDonationAmount<=0){alert('Por favor, selecione um valor válido.');return;}
  var finalAmount=selectedDonationAmount;
  var feeCb=document.getElementById('addAdministrativeFee');
  if(feeCb && feeCb.checked) finalAmount+=TAXA_PIX;
  finalAmount=Math.round(finalAmount*100)/100;

  showDonationLoading();

  var urlParams=new URLSearchParams(window.location.search);
  var utmKeys=['utm_source','utm_campaign','utm_medium','utm_content','utm_term','src','sck'];
  var utmString='';
  utmKeys.forEach(function(key){
    var val=urlParams.get(key);
    if(val) utmString+='&'+key+'='+encodeURIComponent(val);
  });

  var pixUrl='/api/gerarpix'
    +'?amount='+finalAmount.toFixed(2)
    +'&nome='+encodeURIComponent(nome)
    +'&telefone='+encodeURIComponent(telefone)
    +utmString;

  setTimeout(function(){window.location.href=pixUrl;},500);
}

document.getElementById('donationModal').addEventListener('click',function(e){
  if(e.target===this) closeDonationModal();
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape') closeDonationModal();
});
document.querySelectorAll('.js-open-modal').forEach(function(btn){
  btn.addEventListener('click',function(e){e.preventDefault();openDonationModal();});
});

(function(){
  var ph=document.getElementById('donorPhone');
  if(ph){
    ph.addEventListener('input',function(){
      var v=this.value.replace(/\D/g,'').slice(0,11);
      if(v.length>6) v='('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7);
      else if(v.length>2) v='('+v.slice(0,2)+') '+v.slice(2);
      else if(v.length>0) v='('+v;
      this.value=v;
    });
  }
})();

(function(){
  var META_OBJETIVO = 200000;
  var META_ATUAL    = 16420;

  var pct = Math.min(100, Math.round((META_ATUAL/META_OBJETIVO)*100));
  var fill = document.getElementById('metaFill');
  var pctEl = document.getElementById('metaPct');
  var arrEl = document.getElementById('metaArrecadado');
  var objEl = document.getElementById('metaObjetivoTexto');
  objEl.textContent = 'R$ ' + META_OBJETIVO.toLocaleString('pt-BR');
  var animou = false;

  function animaMeta(){
    if(animou) return; animou = true;
    fill.style.width = pct + '%';
    var dur = 1600, start = null;
    function frame(ts){
      if(!start) start = ts;
      var p = Math.min(1,(ts-start)/dur);
      var ease = 1 - Math.pow(1-p, 3);
      pctEl.textContent = Math.round(pct*ease) + '%';
      arrEl.textContent = 'R$ ' + Math.round(META_ATUAL*ease).toLocaleString('pt-BR');
      if(p<1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var metaCard = document.querySelector('.meta-mini');
  if(metaCard && 'IntersectionObserver' in window){
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ animaMeta(); obs.disconnect(); } });
    },{threshold:.35});
    obs.observe(metaCard);
  } else { animaMeta(); }
})();

document.querySelectorAll('.faq-q').forEach(function(q){
  q.addEventListener('click',function(){
    var item=this.parentElement;
    var resposta=item.querySelector('.faq-a');
    var aberto=item.classList.contains('aberto');
    document.querySelectorAll('.faq-item.aberto').forEach(function(i){
      i.classList.remove('aberto');
      i.querySelector('.faq-a').style.maxHeight='0';
    });
    if(!aberto){
      item.classList.add('aberto');
      resposta.style.maxHeight=resposta.scrollHeight+'px';
    }
  });
});

(function(){
  var flutuante=document.getElementById('doarFlutuante');
  var heroBtn=document.getElementById('btnHeroDoar');
  var modal=document.getElementById('donationModal');
  function checa(){
    var passouHero = heroBtn.getBoundingClientRect().bottom < 0;
    var modalAberto = modal.classList.contains('active');
    flutuante.classList.toggle('visivel', passouHero && !modalAberto);
  }
  window.addEventListener('scroll',checa,{passive:true});
  new MutationObserver(checa).observe(modal,{attributes:true,attributeFilter:['class']});
  checa();
})();
