// Endpoint para Vercel: recebe o formulário da LP2 e encaminha ao Make pelo servidor.
// O webhook fica fora do HTML e não depende de CORS no navegador.
const MAKE_WEBHOOK_URL = process.env.BLASKOWATT_LP2_WEBHOOK_URL ||
  'https://hook.us1.make.celonis.com/3q5rgkup6g5vcvxic9tyu43wgr1b5xn1';

const SERVICES = new Set([
  'Energia Solar', 'Instalação Elétrica', 'Automação', 'Manutenção',
  'Ampliação de Sistema Solar', 'Baterias / Sistema Híbrido', 'Outro'
]);
const PROPERTY_TYPES = new Set(['Residencial', 'Comercial']);
const TIMELINES = new Set([
  'O quanto antes', 'Nos próximos 30 dias',
  'Nos próximos meses', 'Estou apenas pesquisando'
]);

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  let input = req.body;
  try {
    if (typeof input === 'string') input = JSON.parse(input);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid JSON');
  } catch (_) {
    return res.status(400).json({ ok: false, error: 'Dados inválidos.' });
  }

  // Campo antispam invisível: robôs que o preencham não geram leads.
  if (input.website) return res.status(200).json({ ok: true });

  const clean = (key, max = 300) =>
    typeof input[key] === 'string' ? input[key].trim().slice(0, max) : '';
  const nome = clean('nome', 120);
  const telefone = clean('telefone', 32);
  const endereco = clean('endereco', 280);
  const servico = clean('servico', 100);
  const tipo_imovel = clean('tipo_imovel', 50);
  const prazo = clean('prazo', 70);
  const digits = telefone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (nome.length < 2 || endereco.length < 5 || !/^\d{10,11}$/.test(digits) ||
      !SERVICES.has(servico) || !PROPERTY_TYPES.has(tipo_imovel) || !TIMELINES.has(prazo)) {
    return res.status(400).json({ ok: false, error: 'Verifique os dados do formulário.' });
  }

  const payload = {
    nome, telefone, endereco, servico, tipo_imovel, prazo,
    form_id: 'lead-form',
    form_name: 'Avaliação técnica — Blaskowatt Sistemas Híbridos',
    source: 'blaskowatt_lp2',
    page_url: clean('page_url', 2000),
    page_title: clean('page_title', 300),
    referrer: clean('referrer', 2000),
    submitted_at: clean('submitted_at', 50) || new Date().toISOString(),
    user_agent: clean('user_agent', 500)
  };

  for (const [key, val] of Object.entries(input)) {
    if (/^(utm_[a-z0-9_]+|gclid|gbraid|wbraid|fbclid|msclkid|ttclid)$/i.test(key) &&
        typeof val === 'string' && Object.keys(payload).length < 70) {
      payload[key.toLowerCase()] = val.trim().slice(0, 500);
    }
  }

  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(11000)
    });
    if (!response.ok) {
      console.warn('Make webhook returned HTTP', response.status);
      return res.status(502).json({ ok: false, error: 'Falha no envio.' });
    }
    return res.status(200).json({ ok: true });
  } catch (_) {
    console.warn('Make webhook unavailable for Blaskowatt LP2');
    return res.status(502).json({ ok: false, error: 'Falha no envio.' });
  }
};
