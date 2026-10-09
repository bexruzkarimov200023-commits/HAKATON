# MoneyMaster UZ

Uzbek-language personal finance dashboard with account-based budgets, savings goals, and an admin panel.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `ADMIN_EMAIL` and an `ADMIN_PASSWORD` of at least 6 characters in `.env.local`. A longer, unique password is safer.
4. Start the frontend and API together with `npm run dev`.

The Vite app is served at `http://127.0.0.1:5173`. New users can register from the sign-in screen. Each user’s transactions, savings goal, and challenge progress are stored in `server/data.json`; passwords are stored as scrypt hashes. Admin accounts are configured through server environment variables and can suspend or restore user accounts. Suspending an account revokes its active sessions but keeps its finance data.

Run `npm run build` and `npm run lint` to verify changes.

## Deployment note

This JSON-file store and in-memory session map are intended for a local hackathon demo, not a public multi-instance deployment. A public launch needs a managed database, persistent session storage, HTTPS, and operational backups.
