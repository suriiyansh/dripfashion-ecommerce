# Drip — Fashion E-Commerce Site

A full-stack e-commerce platform for fashion retail, featuring product browsing, cart & wishlist management, user authentication, and order processing. Built with a Node.js/Express backend and Supabase for auth, database, and storage.

## Features

- 🔐 User authentication (sign up, login, session handling)
- 🛍️ Product catalog with categories
- 🛒 Cart and wishlist management
- 📦 Order creation and tracking
- ✅ Request validation on all endpoints
- 🚦 Rate limiting and centralized error handling
- 🌱 Database seeding script for quick local setup

## Tech stack

**Backend:** Node.js · Express.js · Supabase (Auth, Postgres, Storage)
**Frontend:** HTML, CSS, JavaScript
**Validation:** Custom validators per resource (auth, cart, orders, products, wishlist)

## Project structure

```
dripfashion-ecommerce/
├── backend project1 step1/
│   ├── scripts/
│   │   └── seed.js               # Seeds the database with sample data
│   ├── src/
│   │   ├── lib/
│   │   │   └── supabase.js       # Supabase client setup
│   │   ├── middleware/
│   │   │   ├── auth.js           # Auth guard middleware
│   │   │   ├── errorHandler.js   # Centralized error handling
│   │   │   ├── rateLimiter.js    # Request rate limiting
│   │   │   └── validate.js       # Request body validation
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── cart.js
│   │   │   ├── categories.js
│   │   │   ├── orders.js
│   │   │   ├── products.js
│   │   │   └── wishlist.js
│   │   ├── validators/
│   │   │   ├── auth.js
│   │   │   ├── cart.js
│   │   │   ├── orders.js
│   │   │   ├── products.js
│   │   │   └── wishlist.js
│   │   └── server.js             # App entry point
│   ├── schema.sql                # Database schema
│   ├── schema_patch_01_is_deal.sql
│   ├── .env.example              # Environment variable template
│   └── package.json
└── frontend project1.html        # Frontend UI
```

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/suriiyansh/dripfashion-ecommerce.git
cd dripfashion-ecommerce
```

### 2. Backend setup
```bash
cd "backend project1 step1"
npm install
```

Copy `.env.example` to `.env` and fill in your own Supabase credentials:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=5000
```

### 3. Set up the database
In your Supabase project's SQL editor, run:
1. `schema.sql` — creates the core tables
2. `schema_patch_01_is_deal.sql` — applies the deals/discount patch

### 4. Seed the database (optional)
```bash
node scripts/seed.js
```

### 5. Start the backend server
```bash
npm start
```

### 6. Open the frontend
Simply open `frontend project1.html` in your browser, or serve it with a local server (e.g. VS Code Live Server) for the best experience.

## API overview

| Route | Description |
|---|---|
| `/api/auth` | Sign up, login, session management |
| `/api/products` | Browse and search products |
| `/api/categories` | Product categories |
| `/api/cart` | Add/remove/update cart items |
| `/api/wishlist` | Manage wishlist items |
| `/api/orders` | Create and view orders |

## Notes

- All secrets are kept out of version control via `.gitignore` — never commit your real `.env` file.
- Rate limiting and validation are applied globally to protect against abuse and malformed requests.

## License

This project is for personal/educational use.
