# Tabuada Turbo — Backend 🚀

API RESTful para o jogo Tabuada Turbo. Node.js + Express + MongoDB + JWT + Google OAuth.

## URLs
- **Produção:** `https://backend-nept.onrender.com`
- **Health:** `https://backend-nept.onrender.com/api/health`

## Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/health` | — | Status da API |
| POST | `/api/auth/register` | — | Criar conta (email/senha) |
| POST | `/api/auth/login` | — | Login (email/senha) → JWT |
| POST | `/api/auth/google` | — | Login via Google → JWT |
| GET | `/api/auth/perfil` | ✅ JWT | Ver perfil do usuário |
| GET | `/api/ranking/global` | — | Ranking global (público) |
| GET | `/api/ranking/nivel/:n` | — | Ranking por nível 1 ou 2 |
| GET | `/api/ranking/meu` | ✅ JWT | Meu histórico pessoal |
| POST | `/api/ranking/salvar` | Opcional | Salvar resultado de partida |
| POST | `/api/jogador` | — | Criar/atualizar jogador anônimo |

## Variáveis de Ambiente (Render)

```
MONGO_URL        = mongodb+srv://...
JWT_SECRET       = string_longa_e_secreta
GOOGLE_CLIENT_ID = 501612922717-qku41fj547b4u7hlk18l95gfet7rar8r.apps.googleusercontent.com
PORT             = 10000
```

## Stack
- **Runtime:** Node.js 20 (`.node-version`)
- **Framework:** Express 4
- **Banco:** MongoDB 6 (driver nativo)
- **Auth:** bcryptjs + jsonwebtoken + google-auth-library

## Deploy (automático)
Push para `main` → Render faz redeploy em ~2 min.

```bash
npm install   # instalar dependências
npm start     # node server.js
npm run dev   # nodemon (desenvolvimento)
```
