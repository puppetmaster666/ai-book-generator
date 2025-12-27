const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$connect()
  .then(() => {
    console.log('Database connection OK');
    return p.$disconnect();
  })
  .catch(e => {
    console.error('Database ERROR:', e.message);
    process.exit(1);
  });
