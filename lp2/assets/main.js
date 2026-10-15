const phone='5555997173311';
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
    if(validateStep(currentStep)) showStep(currentStep+1,true);
  });
  backBtn.addEventListener('click',()=>{if(currentStep>0)showStep(currentStep-1,true);});
  form.addEventListener('submit',e=>{
    e.preventDefault();
    // Submitting via Enter on an earlier step advances instead of skipping questions.
    if(!validateStep(currentStep)) return;
    if(currentStep!==steps.length-1){showStep(currentStep+1,true);return;}
    for(let i=0;i<steps.length;i++){
      if(!validateStep(i)){showStep(i,true);return;}
    }
    const value=id=>form.querySelector('#'+id).value.trim();
    const message=`Olá! Gostaria de solicitar uma avaliação com a Blaskowatt.

Nome: ${value('nome')}
WhatsApp: ${value('telefone')}
Endereço do imóvel: ${value('endereco')}
Serviço procurado: ${value('servico')}
Tipo de imóvel: ${value('tipo_imovel')}
Prazo para o projeto: ${value('prazo')}`;
    const url=`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    // No webhook is configured: the visitor confirms sending inside WhatsApp.
    window.open(url,'_blank','noopener,noreferrer');
  });
  showStep(0);
}
