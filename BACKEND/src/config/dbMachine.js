// src/config/dbMachine.js
const { Pool } = require("pg");

const machineDB = new Pool({
  host: process.env.MACHINE_DB_HOST,
  user: process.env.MACHINE_DB_USER,
  password: process.env.MACHINE_DB_PASSWORD,
  database: process.env.MACHINE_DB_NAME,
  port: process.env.MACHINE_DB_PORT,
});

module.exports = machineDB;