const API_URL = 'https://evo.lynxems.com.br';
const API_KEY = 'F10230BCFE78-4B5A-80F3-789AD4E58B79';
const INSTANCE = 'DeMattos';

async function connectInstance() {
  try {
    console.log(`Tentando conectar a instância ${INSTANCE}...`);
    const res = await fetch(`${API_URL}/instance/connect/${INSTANCE}`, {
      headers: { 'apikey': API_KEY }
    });
    console.log('Status HTTP:', res.status);
    const data = await res.json();
    console.log('Resposta connect:');
    if (data.base64) {
      console.log('QRCode base64 retornado! (Tamanho:', data.base64.length, 'chars)');
      console.log('PairingCode:', data.pairingCode);
      console.log('Code:', data.code);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
    return data;
  } catch (e) {
    console.error('Erro:', e.message);
  }
}

connectInstance();
