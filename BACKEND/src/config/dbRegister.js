const { Pool } = require("pg");

const registerDB = new Pool({
  host: process.env.AUTH_REG_DB_HOST,
  user: process.env.AUTH_REG_DB_USER,
  password: process.env.AUTH_REG_DB_PASSWORD,
  database: process.env.AUTH_REG_DB_NAME,
  port: process.env.AUTH_REG_DB_PORT,
});

module.exports = registerDB;
