
# AUTONOMY

**AUTONOMY** is a full-stack DApp (Decentralized Application) framework designed to facilitate scalable and modular application development. It integrates a modern JavaScript/React frontend, Rust on-chain backend, Node.js off-chain backend, MongoDB database, and includes AWS integration for seamless deployment.

---

## 🚀 Features

- 📦 Modular project architecture for scalability and clarity
- ⚛️ React-based frontend
- 🧠 Express.js backend with REST API support
- ☁️ AWS integration via environment variables
- 🗄️ MongoDB setup for data persistence
- 🧪 Ready for testing and smart contract support

---

## 📁 Project Folder Structure

```

AUTONOMY/
│
├── backend/             \# Node.js backend source
│   ├── .env             \# AWS credentials and config (edit manually)
│   ├── package.json     \# Backend dependencies
│   └── ...              \# Controllers, routes, services, etc.
│
├── frontend/            \# React frontend source
│   ├── public/          \# Static assets
│   ├── src/             \# Components, pages, hooks, etc.
│   ├── package.json     \# Frontend dependencies
│   └── ...
│
├── migrations/          \# Scripts for DB or smart contract migration
│   └── ...
│
├── programs/            \# Smart contracts (e.g., Solana/Anchor)
│   ├── src/
│   ├── Cargo.toml
│   └── ...
│
├── tests/               \# Unit & integration tests
│   └── ...
│
├── Anchor.toml          \# Anchor config for smart contracts
├── README.md            \# You’re reading it!
└── ...

```

---

## 🛠️ Installation & Setup

Follow the steps below to get the application up and running on your local machine.

### 1. Extract the Zip (if downloaded as ZIP)

Extract the contents to your local machine.

---

### 2. Start Frontend

```

cd frontend/
npm install       \# Install frontend dependencies
npm start         \# Start frontend on http://localhost:3000

```

---

### 3. Start MongoDB

Open a separate terminal and run:

```

sudo systemctl start mongod

```

---

### 4. Configure Backend

1. Open `backend/.env`  
2. Add your AWS credentials and other environment variables

Format:

```

AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=your_region

```

---

### 5. Start Backend

```

cd backend/
npm install       \# Install backend dependencies
npm start         \# Starts backend server (usually on http://localhost:5000)

```

---

### 6. Open Application

Visit the frontend in your browser:

👉 [http://localhost:3000](http://localhost:3000)

---

## 🧾 Environment Variables

Make sure to set the following in `backend/.env`:

```

PORT=5000
MONGODB_URI=your_mongo_db_connection_string
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region

```

---

