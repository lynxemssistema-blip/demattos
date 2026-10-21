import nodemailer from 'nodemailer';
import fs from 'fs';

async function sendAgendamento() {
  const recipient = 'edsonmanoel2012@gmail.com';
  console.log(`Disparando confirmação de agendamento com domínio https://demattos.amoreja.com.br/ para: ${recipient}...`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: 'suporte@lynxems.com.br',
      pass: '10207597Rdv*'
    }
  });

  let html = fs.readFileSync('templates/emails/confirmacao_agendamento.html', 'utf-8');
  html = html
    .replace(/\{\{\s*cliente_nome\s*\}\}/g, 'Edson Manoel')
    .replace(/\{\{\s*servico_nome\s*\}\}/g, 'Corte Cabelo & Barboterapia Premium')
    .replace(/\{\{\s*profissional_nome\s*\}\}/g, 'Luan DeMattos')
    .replace(/\{\{\s*data_agendamento\s*\}\}/g, '22/10/2026 (Quinta-feira)')
    .replace(/\{\{\s*horario_agendamento\s*\}\}/g, '15:30')
    .replace(/\{\{\s*valor_servico\s*\}\}/g, '85,00')
    .replace(/https:\/\/demattos\.pro/g, 'https://demattos.amoreja.com.br');

  const info = await transporter.sendMail({
    from: '"Barbearia DeMattos" <suporte@lynxems.com.br>',
    to: recipient,
    subject: 'Agendamento Confirmado ✓ - Barbearia DeMattos',
    html: html
  });

  console.log('✅ CONFIRMAÇÃO DE AGENDAMENTO (COM NOVO DOMÍNIO) ENVIADA COM SUCESSO!');
  console.log('ID da Mensagem:', info.messageId);
}

sendAgendamento().catch(console.error);
