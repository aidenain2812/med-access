# SIH1627 Drug Inventory Prototype — PostgreSQL Edition

This version replaces the hardcoded inventory arrays with PostgreSQL.

## 1. Install PostgreSQL on macOS
If you use Homebrew:

```bash
brew install postgresql@16
brew services start postgresql@16
createdb drug_inventory
```

If PostgreSQL is already installed, just make sure the service is running and create the database:

```bash
createdb drug_inventory
```

## 2. Start the backend

```bash
cd server
cp .env.example .env
npm install
npm start
```

Expected:

`Drug Inventory API running on http://localhost:5001`

The server automatically creates tables and seeds demo facilities/medicines the first time the database is empty.

## 3. Start the frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

## 4. What changed

- PostgreSQL stores facilities, medicines, inventory, delivery requests and transfer requests.
- Public search retrieves phone numbers with SQL JOINs.
- Admin page can add facilities without editing code.
- Admin page can add/update stock without editing code.
- Hospital portal reads network inventory from PostgreSQL.
- Existing delivery requests reduce stock in the database.
- Mock licence verification checks registered facility licences.

## Important
This is a hackathon prototype. It does not connect to real government drug-controller systems or real pharmacy inventory systems.


## Admin dashboard
The React client includes an Admin tab for registering facilities and adding/updating stock. Facilities are initially unverified; use **Verify License** in the Admin tab to mark a facility verified in PostgreSQL. Public search displays the actual verification state from the database.
