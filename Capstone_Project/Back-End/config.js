/**
 * App config — port and DB settings from environment.
 * Set these in .env (see .env.example); never commit .env.
 */
module.exports = {
  port: process.env.PORT || 3000,

  db: {
    host: process.env.DB_HOST || 'reservation-capstone-db.czltypivanye.us-east-1.rds.amazonaws.com',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'reservation_db',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  // Optional: full connection URL (overrides host/port/database/user/password if set)
  databaseUrl: process.env.DATABASE_URL,
};
