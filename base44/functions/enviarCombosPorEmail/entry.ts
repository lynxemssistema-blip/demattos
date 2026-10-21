import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, combo_nome, pdfs } = await req.json();

    if (!email || !combo_nome || !pdfs || pdfs.length === 0) {
      return Response.json({ error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
    }

    const pdfLinks = pdfs.map(pdf => `
      <div class="produto-box">
        <h3>📄 ${pdf.nome}</h3>
        <div style="text-align: center; margin-top: 12px;">
          <a href="${pdf.url}" class="button">⬇️ Baixar PDF</a>
        </div>
      </div>
    `).join('');

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
          .button { display: inline-block; background: #D4AF37; color: #000000; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; }
          .produto-box { background: #111111; border: 1px solid #D4AF37; border-radius: 8px; padding: 20px; margin: 16px 0; }
          .produto-box h3 { color: #D4AF37; margin: 0 0 8px 0; font-size: 16px; }
          .combo-badge { display: inline-block; background: #D4AF37; color: #000; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
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
            <span class="combo-badge">📦 COMBO: ${combo_nome}</span>
            <p>Seu combo foi processado com sucesso! Abaixo estão todos os PDFs incluídos:</p>
            
            ${pdfLinks}

            <p style="color: #aaa; font-size: 13px; margin-top: 24px;">
              ⚠️ Guarde este email pois ele contém os links dos seus produtos. Caso precise novamente, entre em contato conosco.
            </p>
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
      subject: `📦 Seu Combo "${combo_nome}" — ${pdfs.length} PDFs prontos para download!`,
      body: emailHTML,
      from_name: 'Barbearia DeMattos'
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar email do combo:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});