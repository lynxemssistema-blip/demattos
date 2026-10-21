import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { nome, email, senha } = await req.json();

    if (!nome || !email || !senha) {
      return Response.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const primeiroNome = nome.split(' ')[0];

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Georgia, serif;
            background-color: #0a0a0a;
            color: #ffffff;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
            border: 1px solid #D4AF37;
          }
          .header {
            background: linear-gradient(135deg, #D4AF37 0%, #B8973D 100%);
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            color: #000000;
            font-size: 32px;
            font-weight: bold;
          }
          .content {
            padding: 40px 30px;
          }
          .content h2 {
            color: #D4AF37;
            font-size: 24px;
            margin-top: 0;
            margin-bottom: 20px;
          }
          .content p {
            color: #e0e0e0;
            line-height: 1.6;
            margin-bottom: 16px;
          }
          .credentials-box {
            background: #1a1a1a;
            border: 2px solid #D4AF37;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
          }
          .credentials-box h3 {
            color: #D4AF37;
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 18px;
          }
          .credential-item {
            margin-bottom: 12px;
          }
          .credential-label {
            color: #D4AF37;
            font-weight: bold;
            display: block;
            margin-bottom: 4px;
          }
          .credential-value {
            color: #ffffff;
            font-size: 16px;
            background: #0a0a0a;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #2a2a2a;
          }
          .footer {
            background: #0a0a0a;
            border-top: 1px solid #D4AF37;
            padding: 30px;
            text-align: center;
          }
          .footer p {
            color: #888888;
            font-size: 14px;
            margin: 5px 0;
          }
          .button {
            display: inline-block;
            background: #D4AF37;
            color: #000000;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Barbearia DeMattos</h1>
          </div>
          
          <div class="content">
            <h2>Bem-vindo, ${primeiroNome}!</h2>
            
            <p>É com grande satisfação que damos as boas-vindas ao seu <strong>Canal DeMattos</strong>!</p>
            
            <p>Você acaba de ganhar acesso a um espaço exclusivo onde poderá:</p>
            
            <ul style="color: #e0e0e0; line-height: 1.8;">
              <li>Gerenciar seus agendamentos</li>
              <li>Consultar nosso assistente de visagismo com IA</li>
              <li>Acessar produtos digitais exclusivos</li>
              <li>Deixar depoimentos sobre sua experiência</li>
              <li>E muito mais!</li>
            </ul>

            <div class="credentials-box">
              <h3>🔐 Seus Dados de Acesso</h3>
              
              <div class="credential-item">
                <span class="credential-label">Email:</span>
                <div class="credential-value">${email}</div>
              </div>
              
              <div class="credential-item">
                <span class="credential-label">Senha:</span>
                <div class="credential-value">${senha}</div>
              </div>
            </div>

            <p style="color: #D4AF37; font-weight: bold;">⚠️ Importante: Guarde essas informações em local seguro!</p>
            
            <p>Você pode acessar seu canal a qualquer momento através do nosso site.</p>

            <div style="text-align: center;">
              <a href="https://seu-site.base44.com" class="button">Acessar Meu Canal</a>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Barbearia DeMattos</strong></p>
            <p>A arte de cuidar do homem moderno</p>
            <p style="margin-top: 15px; color: #666666;">Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: '🎉 Bem-vindo ao seu Canal DeMattos!',
      body: emailHTML,
      from_name: 'Barbearia DeMattos'
    });

    return Response.json({ success: true, message: 'Email enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});