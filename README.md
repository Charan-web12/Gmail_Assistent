# Intelligent Email Assistant

An AI-assisted email workspace built with Next.js, Express, MongoDB, Google Gmail OAuth 2.0, and Google Gemini.

The application has two authentication layers:

1. A local application account created with a name, email address, and password.
2. An optional Gmail connection authorized through Google OAuth 2.0.

The local account controls access to the application. The Gmail connection grants permission to read, modify, and send email for that application user.

## Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Technology](#technology)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Configuration](#configuration)
- [Google OAuth Setup](#google-oauth-setup)
- [Install and Run](#install-and-run)
- [Application Workflow](#application-workflow)
- [API Reference](#api-reference)
- [Data and Security](#data-and-security)
- [AI Behavior](#ai-behavior)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)
- [Security Notes](#security-notes)

## Features

- Local registration and login with bcrypt password hashing.
- JWT authentication stored in an HTTP-only cookie.
- Gmail connection through Google OAuth 2.0.
- AES-256-GCM encryption for Gmail access and refresh tokens.
- Inbox listing, message details, label changes, deletion, and sending.
- Gmail search and natural-language smart search.
- AI email summaries and reply generation.
- Streaming replies using Server-Sent Events.
- Category and priority classification.
- Phishing and suspicious-message analysis.
- Action-item and deadline extraction.
- Dashboard analytics for unread, priority, category, and phishing counts.
- Saved dark-mode, tone, language, and summarization preferences.
- Demo inbox fallback when Gmail is not connected.

## How It Works

```text
Browser
  |
  v
Next.js frontend :3000
  |
  | /api requests with cookies
  v
Express backend :5000
  |                 \
  v                  v
MongoDB        Google OAuth / Gmail API
  |
  v
Users, Gmail tokens, metadata, AI history

Gemini API is called by the backend for AI operations.
```

### Local authentication

1. A user registers or logs in through the frontend.
2. The backend hashes passwords with bcrypt and signs a JWT.
3. The JWT is returned in an HTTP-only cookie.
4. Frontend requests use `credentials: include` so the cookie is sent automatically.
5. `authMiddleware` validates the JWT and loads the user before protected routes run.

### Gmail OAuth authentication

1. The user logs into the application first.
2. Settings requests `/api/gmail/oauth/url`.
3. The backend creates a Google authorization URL containing the client ID, scopes, callback URI, and application-user ID in `state`.
4. Google displays the consent screen.
5. Google redirects to `GOOGLE_REDIRECT_URI` with an authorization code.
6. The backend exchanges the code for Gmail access and refresh tokens.
7. The backend fetches the Gmail address, encrypts the tokens, and stores them in MongoDB.
8. The user is redirected to the inbox.
9. Gmail tokens are refreshed automatically when necessary.

### Email behavior

When a Gmail token exists, email routes use the Gmail API. If no Gmail token exists, read operations can return demo messages for development. Sending, deleting, and modifying messages require a connected Gmail account.

### AI behavior

Authenticated AI requests are rate-limited and sent to Gemini. The client tries preferred models and falls back to another supported model if a model request fails. Some analysis features have local fallback behavior when Gemini is unavailable, but summaries and generated replies work best with a valid Gemini key.

## Technology

| Layer          | Technology                       | Purpose                                            |
| -------------- | -------------------------------- | -------------------------------------------------- |
| Frontend       | Next.js 14, React 18, TypeScript | App Router pages and client UI                     |
| Styling        | Tailwind CSS                     | Responsive layout and themes                       |
| Icons          | Lucide React                     | Interface icons                                    |
| Backend        | Node.js, Express                 | REST API and OAuth callback                        |
| Authentication | JWT, HTTP-only cookies, bcryptjs | Application accounts                               |
| Gmail          | `googleapis`                     | OAuth and Gmail API calls                          |
| AI             | `@google/generative-ai`          | Summaries, replies, analysis, and search           |
| Database       | MongoDB, Mongoose                | Users, tokens, metadata, and history               |
| Security       | Helmet, CORS, express-rate-limit | HTTP headers, origin control, and abuse protection |

## Project Structure

```text
emailAssisent/
├── .env.example                 # Safe environment template
├── .gitignore                   # Ignores local secrets and generated files
├── package.json                 # Root dependency metadata
├── README.md
├── backend/
│   ├── .env                     # Local backend environment; never commit
│   ├── server.js                # Loads config, MongoDB, Express, and routes
│   ├── package.json
│   ├── controllers/             # HTTP request handlers
│   ├── middleware/              # JWT and shared error handling
│   ├── models/                  # Mongoose schemas
│   ├── routes/                  # REST route definitions
│   ├── services/ai/             # Gemini and local AI services
│   ├── services/gmail/          # OAuth, encryption, and Gmail operations
│   └── test_backend.js          # Encryption and JWT smoke tests
└── frontend/
    ├── app/                     # Next.js pages
    ├── components/              # Reusable UI components
    ├── lib/api.ts               # Typed fetch client
    ├── next.config.js
    └── package.json
```

Important backend modules:

- `server.js`: loads environment files, configures CORS and security headers, mounts routes, connects to MongoDB, and starts port 5000.
- `authController.js`: registration, login, logout, current-user, and preferences operations.
- `gmailController.js`: OAuth URL, OAuth callback, Gmail status, and disconnect operations.
- `emailController.js`: inbox, analytics, message actions, and sending.
- `aiController.js`: summaries, replies, streaming replies, analysis, smart search, and history.
- `gmailAuth.js`: Google OAuth client, callback exchange, and AES-256-GCM token encryption.
- `gmailClient.js`: decrypts stored tokens and refreshes them automatically.
- `gmailSync.js`: Gmail message retrieval, decoding, labels, deletion, and sending.
- `geminiClient.js`: Gemini client creation, model fallback, and configuration checks.

## Requirements

- Node.js 18 or newer.
- npm.
- MongoDB locally or a MongoDB Atlas connection string.
- Google Cloud project with Gmail API enabled for live Gmail access.
- Google AI Studio API key for Gemini features.

The backend attempts the configured MongoDB connection first. In development it can fall back to an in-memory MongoDB instance when the configured database is unavailable. In-memory data disappears when the backend stops.

## Configuration

Copy `.env.example` to `.env` in the project root, or create `backend/.env`. The backend loads `backend/.env` first and then the root `.env`; existing environment variables are not overwritten by the second load.

Use `frontend/.env.local` for frontend-only variables when necessary.

### Environment variables

| Variable                          |                Required | Description                                                                   |
| --------------------------------- | ----------------------: | ----------------------------------------------------------------------------- |
| `PORT`                            |                      No | Backend port. Defaults to `5000`.                                             |
| `NODE_ENV`                        |                      No | Use `development` locally and `production` when deployed.                     |
| `FRONTEND_URL`                    |                     Yes | Frontend origin used by CORS and post-OAuth redirects.                        |
| `MONGO_URI`                       | Yes for persistent data | MongoDB connection string.                                                    |
| `JWT_SECRET`                      |                     Yes | Long random secret used to sign application cookies.                          |
| `JWT_EXPIRES_IN`                  |                      No | JWT lifetime, such as `7d`.                                                   |
| `GOOGLE_CLIENT_ID`                |           Yes for Gmail | OAuth web client ID from Google Cloud.                                        |
| `GOOGLE_CLIENT_SECRET`            |           Yes for Gmail | OAuth web client secret from Google Cloud.                                    |
| `GOOGLE_REDIRECT_URI`             |           Yes for Gmail | Exact backend callback URL registered in Google Cloud.                        |
| `GMAIL_SCOPES`                    |                      No | Comma-separated additional Gmail scopes. Core scopes are always included.     |
| `TOKEN_ENCRYPTION_KEY`            |                     Yes | A 64-character hex key or another secret normalized to 32 bytes.              |
| `GEMINI_API_KEY`                  |       No for basic demo | Google AI Studio key for AI operations.                                       |
| `NEXT_PUBLIC_API_BASE_URL`        |        Yes for frontend | Backend API URL, normally `http://localhost:5000/api`.                        |
| `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` |                      No | URI shown in frontend OAuth error guidance. Keep it equal to the backend URI. |

Example local configuration:

```dotenv
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
MONGO_URI=mongodb://localhost:27017/emailAssistant
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=replace_with_your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=replace_with_your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/gmail/oauth/callback
GMAIL_SCOPES=https://www.googleapis.com/auth/gmail.modify,https://www.googleapis.com/auth/gmail.send

TOKEN_ENCRYPTION_KEY=replace_with_64_hex_characters
GEMINI_API_KEY=replace_with_your_gemini_key
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:5000/api/gmail/oauth/callback
```

Generate an encryption key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Never use example values in production. Never expose `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, or `GEMINI_API_KEY` in frontend code.

## Google OAuth Setup

### Create and configure the Google project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Open **APIs & Services > Library**.
4. Enable **Gmail API**.

### Configure the OAuth consent screen

1. Open **APIs & Services > OAuth consent screen**.
2. Choose **External** for personal Gmail testing, or the correct internal option for Workspace.
3. Fill in the app name, support email, and developer contact email.
4. Add these scopes when requested:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
5. For an External app in testing mode, add every testing Gmail account under **Test users**.

### Create the OAuth client

1. Open **APIs & Services > Credentials**.
2. Select **Create Credentials > OAuth client ID**.
3. Choose **Web application**.
4. Add this exact development redirect URI:

```text
http://localhost:5000/api/gmail/oauth/callback
```

5. For production, add the deployed HTTPS callback separately, for example:

```text
https://api.example.com/api/gmail/oauth/callback
```

6. Copy the client ID and secret to the backend environment.

The redirect URI must match exactly, including protocol, hostname, port, path, and trailing slash behavior. A mismatch causes `redirect_uri_mismatch`.

## Install and Run

Install dependencies separately because backend and frontend are independent npm projects:

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

Start the backend in one terminal:

```powershell
cd backend
npm run dev
```

Start the frontend in another terminal:

```powershell
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Backend commands:

```powershell
cd backend
npm start       # Start with node
npm run dev     # Start with nodemon
node test_backend.js
```

Frontend commands:

```powershell
cd frontend
npm run dev
npm run build
npm start
npm run lint
```

There is no root-level `npm test` script. Run backend smoke tests from `backend`.

## Application Workflow

### Register and log in

Use `/register` to create an account and `/login` to authenticate. The backend stores only a password hash. Login sets the JWT cookie. The frontend API client sends that cookie automatically.

### Connect Gmail

1. Log in to the application.
2. Open **Settings**.
3. Choose **Connect Gmail**.
4. Approve the Google permissions.
5. After the callback succeeds, the app redirects to the inbox with a connection status message.

Local application login and Gmail connection are separate states.

### Read and manage email

The inbox asks the backend for messages. The Gmail sync service lists message IDs, retrieves details, decodes Gmail base64url content, and maps headers and body data into the frontend format. The email view can request AI analysis and perform message actions.

### Compose and send

The compose page sends recipient, subject, body, and optional thread data to the backend. The Gmail service creates a MIME message, encodes it as base64url, and calls Gmail `users.messages.send`. A connected Gmail account is required.

### Analyze a message

The email detail page can request combined analysis: summary, category, priority score, phishing result, action items, and deadlines. Results may be cached in `EmailMeta`, while AI operations can be recorded in `AIHistory`.

### Save preferences

Settings saves dark mode, default tone, default language, and automatic summarization to the authenticated user document.

## API Reference

All paths are relative to `http://localhost:5000/api` in development. Protected endpoints require the JWT cookie.

### Health

| Method | Path      | Auth | Purpose                                                          |
| ------ | --------- | ---: | ---------------------------------------------------------------- |
| `GET`  | `/health` |   No | Reports backend status and Google/Gemini configuration presence. |

### Authentication

| Method | Path                | Auth | Body                                                   |
| ------ | ------------------- | ---: | ------------------------------------------------------ |
| `POST` | `/auth/register`    |   No | `{ "name": "...", "email": "...", "password": "..." }` |
| `POST` | `/auth/login`       |   No | `{ "email": "...", "password": "..." }`                |
| `POST` | `/auth/logout`      |   No | None                                                   |
| `GET`  | `/auth/me`          |  Yes | None                                                   |
| `PUT`  | `/auth/preferences` |  Yes | Preference fields                                      |

Registration and login are rate-limited to help prevent brute-force attempts.

### Gmail integration

| Method | Path                    | Auth | Purpose                                         |
| ------ | ----------------------- | ---: | ----------------------------------------------- |
| `GET`  | `/gmail/oauth/url`      |  Yes | Creates the Google consent URL.                 |
| `GET`  | `/gmail/oauth/callback` |   No | Receives Google's authorization response.       |
| `GET`  | `/gmail/status`         |  Yes | Returns connection state and connected address. |
| `POST` | `/gmail/disconnect`     |  Yes | Deletes the stored Gmail token record.          |

### Email management

| Method   | Path                 | Auth | Purpose                                                               |
| -------- | -------------------- | ---: | --------------------------------------------------------------------- |
| `GET`    | `/emails`            |  Yes | Lists messages. Supports `q`, `label`, `maxResults`, and `pageToken`. |
| `GET`    | `/emails/analytics`  |  Yes | Returns dashboard counts and category data.                           |
| `GET`    | `/emails/:id`        |  Yes | Gets one message.                                                     |
| `PATCH`  | `/emails/:id/modify` |  Yes | Adds or removes Gmail labels.                                         |
| `DELETE` | `/emails/:id`        |  Yes | Deletes a message.                                                    |
| `POST`   | `/emails/send`       |  Yes | Sends `{ to, cc?, bcc?, subject, body, threadId? }`.                  |

### AI

All AI endpoints require authentication and share a limit of 30 requests per minute.

| Method | Path                   | Purpose                                            |
| ------ | ---------------------- | -------------------------------------------------- |
| `POST` | `/ai/summarize`        | Creates a concise summary.                         |
| `POST` | `/ai/reply`            | Generates a reply draft.                           |
| `POST` | `/ai/reply/stream`     | Streams reply chunks as Server-Sent Events.        |
| `POST` | `/ai/analyze/:id`      | Runs combined email analysis.                      |
| `POST` | `/ai/smart-search`     | Converts natural language into Gmail query syntax. |
| `GET`  | `/ai/history?limit=30` | Returns recent AI history.                         |

Successful responses generally include `success: true`. Errors include `success: false` and `message`. Common statuses are `400` for invalid input, `401` for authentication, `429` for rate limits, and `503` for unavailable configuration.

## Data and Security

### MongoDB documents

- `User`: name, email, password hash, preferences, and account metadata.
- `GmailToken`: encrypted access and refresh tokens, IVs, authentication tags, expiry, scopes, and connected email.
- `EmailMeta`: cached email analysis and message metadata.
- `AIHistory`: AI operations and results for a user.

### Token encryption

Gmail tokens are encrypted with AES-256-GCM before storage. Each token has its own IV and authentication tag. Changing `TOKEN_ENCRYPTION_KEY` makes previously stored tokens undecryptable; users must reconnect Gmail after such a change.

### HTTP authentication

The JWT is stored in an HTTP-only cookie so browser JavaScript cannot read it. Production deployments must use HTTPS so secure cross-origin cookie settings work correctly.

### Request protection

- Helmet adds security headers.
- CORS permits configured frontend origins and local development origins.
- Authentication and AI routes use rate limits.
- Gmail routes require the local account except for the public OAuth callback.

## AI Behavior

The Gemini client reads `GEMINI_API_KEY` lazily, allowing the backend to start without it. When configured, it tries preferred Gemini models and falls back to another candidate if a request fails.

Service responsibilities:

- `summarize.js`: concise email summaries.
- `generateReply.js`: standard and streaming reply generation.
- `classify.js`: category and priority classification.
- `detectPhishing.js`: suspicious patterns, warnings, and risk score.
- `extractActionItems.js`: tasks, assignees, deadlines, and completion state.
- `smartSearch.js`: natural language to Gmail query conversion.
- `geminiClient.js`: API setup, model selection, and fallback behavior.

Always review generated replies, classifications, phishing warnings, and extracted deadlines before acting on them.

## Testing

Run backend smoke tests:

```powershell
cd backend
node test_backend.js
```

This verifies AES-256-GCM encryption/decryption and JWT signing/verification.

Check backend syntax:

```powershell
cd backend
node --check server.js
node --check services/gmail/gmailAuth.js
node --check controllers/gmailController.js
```

Build and type-check the frontend:

```powershell
cd frontend
npm run build
```

Verify OAuth configuration without printing secrets:

```powershell
cd backend
node -e "require('./server'); const {createOAuth2Client,getAuthUrl}=require('./services/gmail/gmailAuth'); const client=createOAuth2Client(); const url=getAuthUrl('test-user'); console.log({redirectUri: client.redirectUri, validAuthorizationUrl: url.startsWith('https://accounts.google.com/o/oauth2/v2/auth')}); process.exit(0);"
```

## Troubleshooting

### Google OAuth is not configured

Check that the backend process can see `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Put them in `backend/.env` or root `.env`, then restart the backend. A running Node process does not reload environment changes.

### `redirect_uri_mismatch`

Compare `GOOGLE_REDIRECT_URI` with the Authorized redirect URI in Google Cloud. They must match exactly:

```text
http://localhost:5000/api/gmail/oauth/callback
```

Do not use the frontend URL as the OAuth callback. Google calls the backend, and the backend then redirects to `FRONTEND_URL`.

### `access_denied` or app not verified

For an External OAuth app in testing mode, add the account as a Test user. Confirm the Gmail scopes are configured. Production use of sensitive or restricted Gmail scopes may require Google verification.

### Gmail connects but messages fail later

Check that `TOKEN_ENCRYPTION_KEY` has not changed, MongoDB contains the user's `GmailToken`, a refresh token exists, and Gmail API is enabled in the same Google Cloud project. Disconnect and reconnect if necessary.

### `Gmail account not connected`

Connect Gmail from Settings while logged in. Local application login and Gmail authorization are separate.

### Frontend cannot reach backend

Confirm the backend is running on port 5000 and that this value is correct:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

Also confirm `FRONTEND_URL=http://localhost:3000` on the backend.

### Frontend build reports an `EINVAL` error in `.next`

Stop running Next processes, remove generated output, and rebuild:

```powershell
cd frontend
Remove-Item .next -Recurse -Force
npm run build
```

### MongoDB is unavailable

Use MongoDB locally or set `MONGO_URI` to a reachable Atlas cluster. Development may start an in-memory fallback, but that data disappears when the server stops.

## Production Deployment

### MongoDB Atlas

1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user.
3. Configure network access for the backend host.
4. Set `MONGO_URI` to the Atlas connection string.

Limit network access to the backend host where possible.

### Backend host

Deploy `backend/` to Render, Railway, Fly.io, or another Node host:

- Root directory: `backend`
- Install command: `npm install`
- Start command: `npm start`
- Set backend environment variables in the host dashboard.
- Set `NODE_ENV=production`.
- Use an HTTPS `GOOGLE_REDIRECT_URI`.
- Add the exact HTTPS URI to the Google OAuth client.

### Frontend host

Deploy `frontend/` to Vercel or another Next.js host:

- Root directory: `frontend`
- Build command: `npm run build`
- Start command on a Node host: `npm start`
- Set `NEXT_PUBLIC_API_BASE_URL` to the public backend API URL.
- Set `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` to the callback URI shown in error guidance.

Update backend CORS and `FRONTEND_URL` to the deployed frontend origin. Do not leave localhost as the only production origin.

## Security Notes

- `.env` and `backend/.env` contain secrets and are ignored by `.gitignore`.
- Rotate any credential pasted into chat, committed to source control, or shared publicly.
- Never commit Google secrets, Gemini keys, JWT secrets, encryption keys, database passwords, or refresh tokens.
- Use separate Google OAuth credentials and API keys for development and production.
- Keep `TOKEN_ENCRYPTION_KEY` stable for stored Gmail tokens. Rotate it only with a migration plan or by reconnecting all accounts.
- Limit MongoDB network access and use a strong database password.
- Review AI-generated content before sending email or acting on security warnings.

## License

No license has been specified for this project yet.
#   G m a i l _ A s s i s t e n t  
 #   G m a i l _ A s s i s t e n t  
 #   s a m p l e  
 