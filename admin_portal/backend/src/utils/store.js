// Minimal file-backed JSON store. No native/binary dependencies, so
// `npm install` works anywhere. Swap this module for a real database
// (Postgres/Mongo) later without touching the route handlers — they only
// use readDb()/writeDb().

const fs = require("fs");
const path = require("path");
const { seedDb } = require("./seed");

const DB_PATH = path.join(__dirname, "..", "..", "data.json");

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    writeDb(seedDb());
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  return db;
}

function nextId(prefix, collection) {
  let n = collection.length + 1;
  const taken = new Set(collection.map((r) => r.id));
  let id = `${prefix}${String(n).padStart(3, "0")}`;
  while (taken.has(id)) {
    n++;
    id = `${prefix}${String(n).padStart(3, "0")}`;
  }
  return id;
}

module.exports = { readDb, writeDb, nextId };
