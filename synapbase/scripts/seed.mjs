#!/usr/bin/env node
/** Crea la cuenta demo con datos de ejemplo: `npm run seed` */
import { ensureDemoData, DEMO_EMAIL, DEMO_PASSWORD } from "../src/server/demo-seed.mjs";

const result = ensureDemoData();
if (result.created) {
  console.log("✔ Datos de demo creados");
  console.log(`  Comercio: Café Martina — ${result.customers} clientes, ${result.submissions} registros`);
} else {
  console.log("✔ La cuenta demo ya existía, no se modificó nada");
}
console.log(`  Acceso: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
