// src/db/connection.js
const { initDb } = require("./init");

let _db = null;

function getDb() {
  if (!_db) {
    _db = initDb();
  }
  return _db;
}

function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

module.exports = { getDb, closeDb };