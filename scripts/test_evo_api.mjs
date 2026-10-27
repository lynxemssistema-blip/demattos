const API_URL = 'https://evo.lynxems.com.br';
const API_KEY = 'F10230BCFE78-4B5A-80F3-789AD4E58B79';
const INSTANCE = 'DeMattos';

async function testEndpoints() {
  console.log('--- TESTANDO ENDPOINTS DA EVOLUTION API ---');

  // 1. Connection State
  try {
    const resState = await fetch(`${API_URL}/instance/connectionState/${INSTANCE}`, {
      headers: { 'apikey': API_KEY }
    });
    console.log('1. connectionState:', resState.status, await resState.json());
  } catch (e) {
    console.error('Erro connectionState:', e.message);
  }

  // 2. Fetch Instance Details
  try {
    const resInst = await fetch(`${API_URL}/instance/fetchInstances?instanceName=${INSTANCE}`, {
      headers: { 'apikey': API_KEY }
    });
    console.log('2. fetchInstances:', resInst.status, await resInst.json());
  } catch (e) {
    console.error('Erro fetchInstances:', e.message);
  }

  // 3. Connect (QR Code)
  try {
    const resConnect = await fetch(`${API_URL}/instance/connect/${INSTANCE}`, {
      headers: { 'apikey': API_KEY }
    });
    const connectData = await resConnect.json();
    console.log('3. connect:', resConnect.status, {
      hasBase64: !!connectData.base64,
      pairingCode: connectData.pairingCode,
      code: connectData.code ? connectData.code.substring(0, 30) + '...' : null
    });
  } catch (e) {
    console.error('Erro connect:', e.message);
  }
}

testEndpoints();
