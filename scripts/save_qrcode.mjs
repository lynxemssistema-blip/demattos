import fs from 'fs';
import path from 'path';

const API_URL = 'https://evo.lynxems.com.br';
const API_KEY = 'F10230BCFE78-4B5A-80F3-789AD4E58B79';
const INSTANCE = 'DeMattos';

const ARTIFACT_DIR = 'C:/Users/lynx/.gemini/antigravity-ide/brain/f6df601b-7c04-490f-be87-e72afd7c9f1c';
const PUBLIC_DIR = 'c:/Users/lynx/Documents/barbearia-de-mattos/public';

async function fetchAndSaveQrCode() {
  try {
    console.log(`Solicitando QR Code atualizado para a instância ${INSTANCE}...`);
    const res = await fetch(`${API_URL}/instance/connect/${INSTANCE}`, {
      headers: { 'apikey': API_KEY }
    });

    const data = await res.json();

    if (!data.base64) {
      console.log('Sem base64 retornado. Resposta:', data);
      return data;
    }

    // Limpar prefixo data:image/png;base64,
    const base64Data = data.base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const artifactPath = path.join(ARTIFACT_DIR, 'evolution_qrcode.png');
    const publicPath = path.join(PUBLIC_DIR, 'evolution_qrcode.png');

    fs.writeFileSync(artifactPath, buffer);
    fs.writeFileSync(publicPath, buffer);

    console.log('✅ QR Code salvo com sucesso em:');
    console.log('-', artifactPath);
    console.log('-', publicPath);

    return {
      success: true,
      artifactPath,
      publicPath,
      pairingCode: data.pairingCode
    };
  } catch (e) {
    console.error('Erro:', e.message);
  }
}

fetchAndSaveQrCode();
