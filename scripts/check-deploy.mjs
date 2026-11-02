import { readConfig } from "./config.mjs";
const config = readConfig(new URL("../wrangler.jsonc", import.meta.url));
if (
  config.d1_databases.some(
    (db) => db.database_id === "00000000-0000-0000-0000-000000000000",
  )
) {
  console.error(
    "Implantação interrompida: substitua database_id no wrangler.jsonc pelo ID retornado por wrangler d1 create. Veja docs/DEPLOY.md.",
  );
  process.exit(1);
}
console.log(
  "ID do D1 configurado. Confirme Workers Free, migrações, APP_ACCESS_TOKEN e R2 Standard antes da implantação.",
);
