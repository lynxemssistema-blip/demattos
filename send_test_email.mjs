import nodemailer from 'nodemailer';
import fs from 'fs';

async function sendToUser() {
  const recipient = 'edsonmanoel2012@gmail.com';
  const resetUrl = 'https://demattos.lynxems.com.br/Login?mode=reset&token=DEMATTOS_SEGURANCA_PREMIUM';
  console.log(`Disparando e-mail luxuoso com domínio https://demattos.lynxems.com.br/ para: ${recipient}...`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: 'suporte@lynxems.com.br',
      pass: '10207597Rdv*'
    }
  });

  let html = fs.readFileSync('templates/emails/recuperacao_senha.html', 'utf-8');
  // Substitui qualquer link pelo link de teste com o domínio solicitado
  html = html.replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, resetUrl);

  const info = await transporter.sendMail({
    from: '"Barbearia DeMattos" <suporte@lynxems.com.br>',
    to: recipient,
    subject: 'Recuperação de Senha - Barbearia DeMattos',
    html: html
  });

  console.log('✅ E-MAIL COM NOVO DOMÍNIO ENVIADO COM SUCESSO!');
  console.log('ID da Mensagem:', info.messageId);
  console.log('Link no botão:', resetUrl);
}

sendToUser().catch(console.error);
