const express = require('express');
const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:enterprise_store.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

app.use(express.json());

async function initDb() {
  await db.execute(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT, name TEXT, category TEXT, price REAL, stock INTEGER)`);