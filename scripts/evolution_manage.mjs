const API_URL = 'https://evo.lynxems.com.br';
const API_KEY = 'F10230BCFE78-4B5A-80F3-789AD4E58B79';
const INSTANCE = 'DeMattos';

async function testEvo() {
  try {
    console.log('1. Verificando instâncias existentes...');
    const res = await fetch(`${API_URL}/instance/fetchInstances`, {
      headers: { 'apikey': API_KEY }
    });
    console.log('Status fetchInstances:', res.status);
    const data = await res.json();
    console.log('Instâncias:', JSON.stringify(data, null, 2));

    console.log('\n2. Verificando estado da conexão de', INSTANCE);
    const resState = await fetch(`${API_URL}/instance/connectionState/${INSTANCE}`, {
      headers: { 'apikey': API_KEY }
    });
    console.log('Status connectionState:', resState.status);
    const dataState = await resState.json();
    console.log('State:', JSON.stringify(dataState, null, 2));
  } catch (e) {
    console.error('Erro ao conectar na Evolution API:', e.message);
  }
}

testEvo();
