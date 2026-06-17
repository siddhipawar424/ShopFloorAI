const { Pool } = require("pg");

const observerDB = new Pool({
  host: process.env.OBSERVER_DB_HOST || "localhost",
  user: process.env.OBSERVER_DB_USER || "postgres",
  password: process.env.OBSERVER_DB_PASSWORD || "eesha12345",
  database: process.env.OBSERVER_DB_NAME || "observer",
  port: process.env.OBSERVER_DB_PORT || 5432,
});

module.exports = observerDB;
