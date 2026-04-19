const nodemailer = require("nodemailer");

const SITE_URL = process.env.SITE_URL || "https://tabuadaturbo.com.br";

function criarTransporter() {
  // Suporta Gmail e qualquer SMTP genérico
  if (process.env.EMAIL_HOST) {
    // SMTP genérico (Resend, SendGrid, Brevo etc)
    return nodemailer.createTransport({
      host:   process.env.EMAIL_HOST,
      port:   parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  }
  // Gmail App Password
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
}

const EMAIL_FROM = process.env.EMAIL_FROM
  || (process.env.EMAIL_USER ? `Tabuada Turbo <${process.env.EMAIL_USER}>` : null);

async function enviar(to, subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[EMAIL] Variáveis EMAIL_USER/EMAIL_PASS não configuradas — email não enviado.");
    console.warn(`[EMAIL] Destinatário: ${to} | Assunto: ${subject}`);
    return;
  }
  const transporter = criarTransporter();
  await transporter.sendMail({ from: EMAIL_FROM, to, subject, html });
  console.log(`[EMAIL] Enviado para ${to}: ${subject}`);
}

function base(titulo, corpo) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#0f0e17;margin:0;padding:20px}
  .card{background:#1a1a2e;border-radius:16px;max-width:480px;margin:0 auto;padding:32px}
  .logo{text-align:center;font-size:2rem;margin-bottom:4px}
  h1{color:#ff6b35;text-align:center;font-size:1.3rem;margin:0 0 20px}
  p{color:#ccc;font-size:.95rem;line-height:1.6}
  .btn{display:block;background:linear-gradient(135deg,#ff6b35,#ff3366);color:#fff;
       text-decoration:none;text-align:center;padding:14px;border-radius:10px;
       font-weight:bold;font-size:1rem;margin:20px 0}
  .aviso{color:#ff6b35;font-size:.8rem;margin-top:12px}
  .rodape{color:#555;font-size:.75rem;text-align:center;margin-top:24px}
</style></head><body><div class="card">
  <div class="logo">🏎️</div>
  <h1>${titulo}</h1>
  ${corpo}
  <div class="rodape">Tabuada Turbo — Se não foi você, ignore este email.</div>
</div></body></html>`;
}

exports.enviarConfirmacao = async (email, nome, token) => {
  const link = `${SITE_URL}/?confirmar=${token}`;
  await enviar(email, "Confirme sua conta — Tabuada Turbo", base(
    "Confirme sua conta ✅",
    `<p>Ola <strong style="color:#fff">${nome}</strong>! Sua conta foi criada.</p>
     <p>Clique no botao abaixo para confirmar seu e-mail:</p>
     <a href="${link}" class="btn">Confirmar minha conta</a>
     <p class="aviso">Link valido por 24 horas.<br>${link}</p>`
  ));
};

exports.enviarRecuperacao = async (email, nome, token) => {
  const link = `${SITE_URL}/?redefinir=${token}`;
  await enviar(email, "Redefinir senha — Tabuada Turbo", base(
    "Redefinir sua senha",
    `<p>Ola <strong style="color:#fff">${nome}</strong>!</p>
     <p>Clique no botao abaixo para criar uma nova senha:</p>
     <a href="${link}" class="btn">Redefinir minha senha</a>
     <p class="aviso">Link valido por 1 hora.<br>Se nao foi voce, ignore este email.<br>${link}</p>`
  ));
};
