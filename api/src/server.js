import { ensureAdministrator } from "./bootstrap-admin.js";
import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db/index.js";

await pool.query("select 1");
const administrator = await ensureAdministrator();
console.log(administrator.created ? "Compte administrateur initialisé." : "Compte administrateur déjà initialisé.");
const server = app.listen(config.port, () => {
  console.log(`MediaChest API : ${config.authUrl}`);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
}
