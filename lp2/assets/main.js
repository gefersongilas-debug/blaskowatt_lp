const phone='5555997173311';
const leadEndpoint='/api/blaskowatt-lp2';
const toggle=document.querySelector('.mobile-toggle');
const menu=document.querySelector('#menu');
if(toggle && menu){
  toggle.addEventListener('click',()=>{
    const open=menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded',String(open));
  });
  document.querySelectorAll('.menu a').forEach(a=>a.addEventListener('click',()=>{
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded','false');
  }));
}

const form=document.querySelector('#lead-form');
if(form){
  const steps=Array.from(form.querySelectorAll('.form-step'));
  const nextBtn=form.querySelector('#form-next');
  const backBtn=form.querySelector('#form-back');
  const submitBtn=form.querySelector('#form-submit');
  const progress=form.querySelector('.form-progress-track');
  const progressFill=form.querySelector('.form-progress-fill');
  const stepLabel=form.querySelector('#form-step-label');
  const stepName=form.querySelector('#form-step-name');
  const stepNames=['Seus dados','Seu projeto','Últimos detalhes'];
  const telephone=form.querySelector('#telefone');
  const status=form.querySelector('#form-status');
  const submitLabel=submitBtn.querySelector('span');
  const submitLabelOriginal=submitLabel.textContent;
  let isSubmitting=false;
  let currentStep=0;

  function normalizePhone(value){
    let digits=value.replace(/\D/g,'');
    if(digits.length>11 && digits.startsWith('55')) digits=digits.slice(2);
    return digits.slice(0,11);
  }
  function formatPhone(value){
    const digits=normalizePhone(value);
    if(digits.length<=2) return digits.length ? `(${digits}` : '';
    if(digits.length<=6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if(digits.length<=10) return `(${digits.slice(0,2)}) ${digits.slice(2,digits.length-4)}-${digits.slice(-4)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  }
  telephone.addEventListener('input',()=>{
    telephone.value=formatPhone(telephone.value);
    telephone.setCustomValidity('');
  });

  function validateStep(index){
    for(const element of steps[index].querySelectorAll('input,select,textarea')){
      if(element===telephone){
        const digits=normalizePhone(element.value);
        element.setCustomValidity(digits.length>0 && digits.length<10 ? 'Informe um WhatsApp com DDD.' : '');
      }
      if(!element.checkValidity()){
        element.reportValidity();
        element.focus();
        return false;
      }
    }
    return true;
  }
  function showStep(index,focus=false){
    currentStep=index;
    steps.forEach((step,i)=>{step.hidden=i!==index;});
    backBtn.hidden=index===0;
    nextBtn.hidden=index===steps.length-1;
    submitBtn.hidden=index!==steps.length-1;
    stepLabel.textContent=`Etapa ${index+1} de ${steps.length}`;
    stepName.textContent=stepNames[index];
    progress.setAttribute('aria-valuenow',String(index+1));
    progressFill.style.width=`${(index+1)/steps.length*100}%`;
    if(focus){
      // Focus the new step heading for a predictable keyboard/screen-reader experience.
      const heading=steps[index].querySelector('legend');
      heading.setAttribute('tabindex','-1');
      heading.focus({preventScroll:true});
    }
  }
  nextBtn.addEventListener('click',()=>{
    if(isSubmitting) return;
    if(validateStep(currentStep)) showStep(currentStep+1,true);
  });
  backBtn.addEventListener('click',()=>{if(!isSubmitting && currentStep>0)showStep(currentStep-1,true);});

  function trackingData(){
    const params=new URLSearchParams(window.location.search);
    const tracking={};
    for(const [key,value] of params){
      if(/^(utm_[a-z0-9_]+|gclid|gbraid|wbraid|fbclid|msclkid|ttclid)$/i.test(key) && value.trim()){
        tracking[key.toLowerCase()]=value.trim().slice(0,500);
      }
    }
    return tracking;
  }

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    // Submitting via Enter on an earlier step advances instead of skipping questions.
    if(!validateStep(currentStep)) return;
    if(currentStep!==steps.length-1){showStep(currentStep+1,true);return;}
    for(let i=0;i<steps.length;i++){
      if(!validateStep(i)){showStep(i,true);return;}
    }
    if(isSubmitting) return;
    const value=id=>form.querySelector('#'+id).value.trim();
    const payload={
      nome:value('nome'),
      telefone:value('telefone'),
      endereco:value('endereco'),
      servico:value('servico'),
      tipo_imovel:value('tipo_imovel'),
      prazo:value('prazo'),
      form_id:'lead-form',
      form_name:'Avaliação técnica — Blaskowatt Sistemas Híbridos',
      source:'blaskowatt_lp2',
      page_url:window.location.href,
      page_title:document.title,
      referrer:document.referrer,
      submitted_at:new Date().toISOString(),
      user_agent:navigator.userAgent,
      ...trackingData(),
      website:form.querySelector('#website')?.value||''
    };
    const message=`Olá! Gostaria de solicitar uma avaliação com a Blaskowatt.

Nome: ${payload.nome}
WhatsApp: ${payload.telefone}
Endereço do imóvel: ${payload.endereco}
Serviço procurado: ${payload.servico}
Tipo de imóvel: ${payload.tipo_imovel}
Prazo para o projeto: ${payload.prazo}`;
    const whatsappUrl=`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    isSubmitting=true;
    submitBtn.disabled=true;
    nextBtn.disabled=true;
    backBtn.disabled=true;
    submitLabel.textContent='Enviando...';
    status.hidden=true;
    status.textContent='';
    status.classList.remove('is-error');

    try{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),15000);
      let response;
      try{
        response=await fetch(leadEndpoint,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(payload),
          signal:controller.signal
        });
      }finally{clearTimeout(timeout);}
      const result=await response.json().catch(()=>null);
      if(!response.ok || !result || result.ok!==true){
        throw new Error('Webhook request was not confirmed');
      }
      // Apenas evento sem dados pessoais para o GTM.
      window.dataLayer=window.dataLayer||[];
      window.dataLayer.push({event:'generate_lead',form_id:'lead-form',form_name:'Blaskowatt LP2',source:'blaskowatt_lp2'});
      status.hidden=false;
      status.textContent='Solicitação recebida! Abrindo o WhatsApp...';
      // O fluxo anterior abria o WhatsApp; agora só redireciona após o Make confirmar.
      window.location.assign(whatsappUrl);
    }catch(error){
      // Sem registros de dados pessoais no console.
      console.warn('Não foi possível confirmar o envio do formulário da LP2.');
      status.hidden=false;
      status.classList.add('is-error');
      status.textContent=error.name==='AbortError'
        ? 'O envio demorou mais que o esperado. Verifique sua conexão e tente novamente.'
        : 'Não foi possível enviar agora. Confira sua conexão e tente novamente. Seus dados continuam preenchidos.';
      submitBtn.disabled=false;
      nextBtn.disabled=false;
      backBtn.disabled=false;
      submitLabel.textContent=submitLabelOriginal;
      isSubmitting=false;
    }
  });
  showStep(0);
}
