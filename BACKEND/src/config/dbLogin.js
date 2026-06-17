const { Pool } = require("pg");

const loginDB = new Pool({
  host: process.env.AUTH_DB_HOST,
  user: process.env.AUTH_DB_USER,
  password: process.env.AUTH_DB_PASSWORD,
  database: process.env.AUTH_DB_NAME,
  port: process.env.AUTH_DB_PORT,
});

module.exports = loginDB;
