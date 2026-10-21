/**
 * Templates de E-mail Luxuosos da Barbearia DeMattos
 * Design: Fundo Escuro Nobre (#0a0a0a), Acentos Dourados (#D4AF37), Tipografia Refinada
 */

const baseEmailWrapper = (contentHtml, previewText = '') => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Barbearia DeMattos</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #050505;
      color: #e5e5e5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    .gold-text {
      color: #D4AF37 !important;
    }
    .btn-gold {
      background: linear-gradient(135deg, #D4AF37 0%, #B8973D 100%);
      color: #0a0a0a !important;
      text-decoration: none;
      font-weight: 700;
      padding: 14px 32px;
      border-radius: 6px;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 13px;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #050505;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    ${previewText}
  </div>

  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #050505; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0f0f0f; border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
          
          <!-- Top Accent Gold Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #B8973D, #D4AF37, #B8973D); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding: 40px 20px 20px 20px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border: 1px solid rgba(212, 175, 55, 0.4); border-radius: 50%; width: 54px; height: 54px; background-color: #171717;">
                    <span style="font-family: Georgia, serif; font-size: 24px; font-weight: bold; color: #D4AF37;">DM</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 16px 0 4px 0; font-family: Georgia, serif; font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #ffffff;">
                BARBEARIA <span style="color: #D4AF37;">DEMATTOS</span>
              </h1>
              <p style="margin: 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #a3a3a3;">
                TRADIÇÃO &bull; ESTILO &bull; VISAGISMO
              </p>
            </td>
          </tr>

          <!-- Divisor Fino -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 10px 0 25px 0;">
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; border-top: 1px solid rgba(255, 255, 255, 0.05); padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #d4d4d4; font-weight: 500;">
                Barbearia DeMattos — O Cuidado que Você Merece
              </p>
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #737373; line-height: 18px;">
                Dúvidas ou agendamentos? Fale conosco pelo WhatsApp ou responda a este e-mail.<br>
                E-mail oficial: <a href="mailto:suporte@lynxems.com.br" style="color: #D4AF37; text-decoration: none;">suporte@lynxems.com.br</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #525252;">
                &copy; ${new Date().getFullYear()} Barbearia DeMattos. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * 1. Template: Recuperação de Senha
 */
export function getPasswordResetEmailTemplate({ nome, resetLink }) {
  const content = `
    <h2 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 20px; color: #ffffff; text-align: center;">
      Recuperação de Acesso
    </h2>
    <p style="font-size: 15px; color: #d4d4d4; line-height: 24px; margin: 0 0 16px 0;">
      Olá${nome ? `, <strong>${nome}</strong>` : ''},
    </p>
    <p style="font-size: 14px; color: #a3a3a3; line-height: 22px; margin: 0 0 24px 0;">
      Recebemos uma solicitação para redefinir a senha da sua conta na Barbearia DeMattos. Para criar uma nova senha com segurança, clique no botão abaixo:
    </p>

    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
      <tr>
        <td align="center">
          <a href="${resetLink}" class="btn-gold" style="background: linear-gradient(135deg, #D4AF37 0%, #B8973D 100%); color: #0a0a0a !important; text-decoration: none; font-weight: 700; padding: 14px 36px; border-radius: 6px; display: inline-block; text-transform: uppercase; letter-spacing: 1px; font-size: 13px;">
            Redefinir Minha Senha
          </a>
        </td>
      </tr>
    </table>

    <div style="background-color: #171717; border-left: 3px solid #D4AF37; padding: 14px 18px; border-radius: 4px; margin: 25px 0;">
      <p style="margin: 0; font-size: 12px; color: #a3a3a3; line-height: 18px;">
        <strong style="color: #ffffff;">Atenção:</strong> Por motivos de segurança, este link é válido por 60 minutos. Se você não solicitou a alteração, basta desconsiderar este e-mail.
      </p>
    </div>

    <p style="font-size: 12px; color: #737373; margin: 20px 0 0 0; word-break: break-all;">
      Se o botão acima não funcionar, copie e cole este link no seu navegador:<br>
      <a href="${resetLink}" style="color: #D4AF37; text-decoration: underline;">${resetLink}</a>
    </p>
  `;

  return baseEmailWrapper(content, 'Instruções para redefinir sua senha na Barbearia DeMattos');
}

/**
 * 2. Template: Confirmação de Agendamento
 */
export function getAppointmentConfirmationEmailTemplate({ clienteNome, servico, profissionalNome, data, horario }) {
  const content = `
    <div style="text-align: center; margin-bottom: 25px;">
      <span style="display: inline-block; background-color: rgba(212, 175, 55, 0.15); color: #D4AF37; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(212, 175, 55, 0.3);">
        ✓ Agendamento Confirmado
      </span>
      <h2 style="margin: 15px 0 0 0; font-family: Georgia, serif; font-size: 22px; color: #ffffff;">
        Seu Horário Está Reservado!
      </h2>
    </div>

    <p style="font-size: 15px; color: #d4d4d4; line-height: 24px; margin: 0 0 20px 0;">
      Olá, <strong>${clienteNome}</strong>! Estamos prontos para oferecer a você a melhor experiência em cortes, barba e cuidados masculinos.
    </p>

    <!-- Cartão de Detalhes -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #171717; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; margin: 20px 0; padding: 20px;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #888888;">Serviço:</span><br>
          <strong style="font-size: 15px; color: #ffffff;">${servico}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #888888;">Profissional:</span><br>
          <strong style="font-size: 15px; color: #D4AF37;">${profissionalNome || 'Equipe DeMattos'}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #888888;">Data & Horário:</span><br>
          <strong style="font-size: 16px; color: #ffffff;">${data} às ${horario}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0 0 0;">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #888888;">Local:</span><br>
          <span style="font-size: 14px; color: #e5e5e5;">Barbearia DeMattos — Consulte endereço no site</span>
        </td>
      </tr>
    </table>

    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="https://demattos.lynxems.com.br/CanalCliente" class="btn-gold" style="background: linear-gradient(135deg, #D4AF37 0%, #B8973D 100%); color: #0a0a0a !important; text-decoration: none; font-weight: 700; padding: 14px 32px; border-radius: 6px; display: inline-block; text-transform: uppercase; letter-spacing: 1px; font-size: 13px;">
            Acessar Canal do Cliente
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #737373; text-align: center; margin: 15px 0 0 0;">
      Precisa remarcar? Acesse seu canal ou nos avise com antecedência pelo WhatsApp.
    </p>
  `;

  return baseEmailWrapper(content, `Seu horário para ${servico} foi confirmado para ${data} às ${horario}!`);
}

/**
 * 3. Template: Boas-vindas / Criação de Conta
 */
export function getWelcomeEmailTemplate({ nome }) {
  const content = `
    <h2 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 22px; color: #ffffff; text-align: center;">
      Bem-vindo à Barbearia DeMattos!
    </h2>
    <p style="font-size: 15px; color: #d4d4d4; line-height: 24px; margin: 0 0 16px 0;">
      Olá, <strong>${nome}</strong>! É uma honra ter você conosco.
    </p>
    <p style="font-size: 14px; color: #a3a3a3; line-height: 22px; margin: 0 0 24px 0;">
      Sua conta oficial foi criada com sucesso. Agora você tem acesso exclusivo ao <strong>Canal do Cliente</strong>, onde pode:
    </p>

    <ul style="color: #e5e5e5; font-size: 14px; line-height: 24px; padding-left: 20px; margin-bottom: 30px;">
      <li>Visualizar e gerenciar seus horários agendados</li>
      <li>Conferir seu histórico de atendimentos e cortes</li>
      <li>Acessar seus produtos digitais e e-books comprados</li>
      <li>Utilizar seus créditos de IA com nosso assistente visagista</li>
    </ul>

    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="https://demattos.lynxems.com.br/CanalCliente" class="btn-gold" style="background: linear-gradient(135deg, #D4AF37 0%, #B8973D 100%); color: #0a0a0a !important; text-decoration: none; font-weight: 700; padding: 14px 36px; border-radius: 6px; display: inline-block; text-transform: uppercase; letter-spacing: 1px; font-size: 13px;">
            Acessar Meu Painel
          </a>
        </td>
      </tr>
    </table>
  `;

  return baseEmailWrapper(content, 'Sua conta na Barbearia DeMattos foi criada com sucesso!');
}
