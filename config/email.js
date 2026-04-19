const nodemailer = require("nodemailer");

// Configuração do transporter (Gmail ou SMTP genérico)
function criarTransporter() {
  return nodemailer.createTransporter({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS   // Gmail App Password (não a senha normal)
    }
  });
}

const SITE_URL    = process.env.SITE_URL    || "https://tabuadaturbo.com.br";
const EMAIL_FROM  = process.env.EMAIL_FROM  || `"Tabuada Turbo ⚡" <${process.env.EMAIL_USER}>`;

// ── Templates de email ────────────────────────────────────────────────────────

function templateBase(titulo, conteudo) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: Arial, sans-serif; background:#0f0e17; margin:0; padding:20px; }
  .card { background:#1a1a2e; border-radius:16px; max-width:480px; margin:0 auto; padding:32px; }
  .logo { text-align:center; font-size:2rem; margin-bottom:8px; }
  .titulo { color:#ff6b35; text-align:center; font-size:1.4rem; font-weight:bold; margin-bottom:24px; }
  .texto { color:#ccc; font-size:1rem; line-height:1.6; margin-bottom:20px; }
  .btn { display:block; background:linear-gradient(135deg,#ff6b35,#ff3366); color:#fff;
         text-decoration:none; text-align:center; padding:14px 24px; border-radius:10px;
         font-weight:bold; font-size:1rem; margin:24px 0; }
  .codigo { background:#0f0e17; border:2px solid #ff6b35; border-radius:8px;
            text-align:center; font-size:2rem; font-weight:bold; color:#ff6b35;
            letter-spacing:8px; padding:16px; margin:20px 0; }
  .rodape { color:#666; font-size:0.8rem; text-align:center; margin-top:24px; }
  .aviso  { color:#ff3366; font-size:0.85rem; margin-top:12px; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">🏎️</div>
    <div class="titulo">${titulo}</div>
    ${conteudo}
    <div class="rodape">Tabuada Turbo — O jogo mais rápido do Brasil!<br>
    Se não foi você, ignore este email.</div>
  </div>
</body>
</html>`;
}

// ── Enviar confirmação de conta ────────────────────────────────────────────────
async function enviarConfirmacao(email, nome, token) {
  const link = `${SITE_URL}/confirmar?token=${token}`;
  const html = templateBase(
    "Confirme sua conta ✅",
    `<p class="texto">Olá, <strong style="color:#fff">${nome}</strong>! 🎉<br>
    Sua conta no Tabuada Turbo foi criada com sucesso.<br>
    Clique no botão abaixo para confirmar seu e-mail:</p>
    <a href="${link}" class="btn">✅ Confirmar minha conta</a>
    <p class="texto">Ou copie e cole este link no navegador:<br>
    <small style="color:#aaa;word-break:break-all">${link}</small></p>
    <p class="aviso">⏰ Este link expira em 24 horas.</p>`
  );
  await criarTransporter().sendMail({
    from: EMAIL_FROM, to: email,
    subject: "✅ Confirme sua conta — Tabuada Turbo",
    html
  });
  console.log(`[EMAIL] Confirmação enviada para ${email}`);
}

// ── Enviar recuperação de senha ────────────────────────────────────────────────
async function enviarRecuperacao(email, nome, token) {
  const link = `${SITE_URL}/redefinir?token=${token}`;
  const html = templateBase(
    "Redefinir senha 🔑",
    `<p class="texto">Olá, <strong style="color:#fff">${nome}</strong>!<br>
    Recebemos uma solicitação para redefinir a senha da sua conta.</p>
    <a href="${link}" class="btn">🔑 Redefinir minha senha</a>
    <p class="texto">Ou copie e cole este link no navegador:<br>
    <small style="color:#aaa;word-break:break-all">${link}</small></p>
    <p class="aviso">⏰ Este link expira em 1 hora.<br>
    Se não foi você, ignore este email — sua senha não será alterada.</p>`
  );
  await criarTransporter().sendMail({
    from: EMAIL_FROM, to: email,
    subject: "🔑 Redefinir senha — Tabuada Turbo",
    html
  });
  console.log(`[EMAIL] Recuperação enviada para ${email}`);
}

module.exports = { enviarConfirmacao, enviarRecuperacao };
