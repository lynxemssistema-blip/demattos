const API_URL = 'https://evo.lynxems.com.br';
const API_KEY = 'F10230BCFE78-4B5A-80F3-789AD4E58B79';
const INSTANCE = 'DeMattos';

async function check() {
  const res = await fetch(`${API_URL}/instance/connectionState/${INSTANCE}`, {
    headers: { 'apikey': API_KEY }
  });
  const data = await res.json();
  console.log('Status da Conexão DeMattos:', data);
}

check();
