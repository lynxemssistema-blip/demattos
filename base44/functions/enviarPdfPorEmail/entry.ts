import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, produto_nome, arquivo_pdf_url, compra_id } = await req.json();

    if (!email || !produto_nome || !arquivo_pdf_url) {
      return Response.json({ error: 'email, produto_nome e arquivo_pdf_url são obrigatórios' }, { status: 400 });
    }

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Georgia, serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border: 1px solid #D4AF37; }
          .header { background: linear-gradient(135deg, #D4AF37 0%, #B8973D 100%); padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; color: #000000; font-size: 32px; font-weight: bold; }
          .content { padding: 40px 30px; }
          .content h2 { color: #D4AF37; font-size: 24px; margin-top: 0; margin-bottom: 20px; }
          .content p { color: #e0e0e0; line-height: 1.6; margin-bottom: 16px; }
          .button { display: inline-block; background: #D4AF37; color: #000000; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 18px; margin: 20px 0; }
          .produto-box { background: #111111; border: 1px solid #D4AF37; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .produto-box h3 { color: #D4AF37; margin-top: 0; }
          .footer { background: #0a0a0a; border-top: 1px solid #D4AF37; padding: 30px; text-align: center; }
          .footer p { color: #888888; font-size: 14px; margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Barbearia DeMattos</h1>
          </div>
          <div class="content">
            <h2>✅ Pagamento Confirmado!</h2>
            <p>Seu pagamento foi processado com sucesso. Seu produto digital está pronto para download!</p>
            
            <div class="produto-box">
              <h3>📄 ${produto_nome}</h3>
              <p style="color: #aaa; margin-bottom: 20px;">Clique no botão abaixo para baixar seu arquivo PDF</p>
              <div style="text-align: center;">
                <a href="${arquivo_pdf_url}" class="button">⬇️ Baixar PDF Agora</a>
              </div>
            </div>

            <p style="color: #aaa; font-size: 14px;">⚠️ Guarde este email pois ele contém o link do seu produto. Caso precise novamente, entre em contato conosco.</p>
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

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: `📄 Seu produto "${produto_nome}" está pronto para download!`,
      body: emailHTML,
      from_name: 'Barbearia DeMattos'
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar email PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});