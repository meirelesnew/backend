# Tabuada Turbo — Backend API v4.0

API REST — **Express.js + Firebase Firestore + Firebase Auth + Socket.io**

## Stack

| Tecnologia | Uso |
|---|---|
| Node.js 20 + Express | Servidor HTTP |
| Firebase Admin SDK | Autenticacao + Firestore |
| Firebase Auth | Login email/senha e Google |
| Firestore | Banco de dados |
| Socket.io | Batalhas em tempo real |
| Render.com | Hospedagem |

## Endpoints

| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| POST | /api/auth/register | — | Criar conta |
| POST | /api/auth/login | — | Login |
| POST | /api/auth/google | — | Login Google |
| POST | /api/auth/recuperar-senha | — | Reset senha |
| GET | /api/auth/perfil | ✅ | Perfil |
| GET | /api/ranking/global | — | Ranking |
| POST | /api/ranking/salvar | — | Salvar resultado |
| POST | /api/jogador | — | Salvar jogador |
| GET | /api/jogador/:id | — | Buscar jogador |
| GET | /api/health | — | Status |

## Variaveis de ambiente (Render)

```
FIREBASE_SERVICE_ACCOUNT=base64_do_serviceAccountKey.json
FIREBASE_API_KEY=sua_api_key
SITE_URL=https://tabuadaturbo.com.br
PORT=10000
```

## Firestore — Colecoes

- `usuarios` — perfis dos jogadores
- `ranking` — resultados das partidas  
- `jogadores` — progresso e recordes
