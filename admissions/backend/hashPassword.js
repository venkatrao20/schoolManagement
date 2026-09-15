const bcrypt = require('bcryptjs');

async function run() {
  const hash = await bcrypt.hash('test1234', 10);
  console.log(hash);
}

run();