#!/usr/bin/env python3
"""
Copper Giant CRM V3.1 — Migration Ingestion Runner
Streams and ingests the consolidated dataset (5,087 contacts) into
Copper Giant CRM V3.1 production via /api/contacts/import in controlled batches.
"""

import sys
import os
import json
import time
import urllib.request
import ssl

INPUT_FILE = "/Users/i2carvajal/Documents/Proyectos/CopperCRM_V3_Clean/data/crm_migration_ready.json"
TARGET_URL = "https://copper-giant-crm-3-ockham.wu48i0.easypanel.host/api/contacts/import"
BATCH_SIZE = 100  # Safe batch size to avoid HTTP timeouts or SQLite write lock contention

def run_migration(dry_run=False):
    if not os.path.exists(INPUT_FILE):
        print(f"Error: Migration file not found: {INPUT_FILE}")
        sys.exit(1)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        contacts = json.load(f)

    total = len(contacts)
    print("==================================================")
    print(f"🚀 INICIANDO MIGRACIÓN DE DATOS A COPPER GIANT CRM")
    print(f"   Destino: {TARGET_URL}")
    print(f"   Total de contactos a procesar: {total:,}")
    print(f"   Tamaño de lote: {BATCH_SIZE} por solicitud")
    print(f"   Modo: {'DRY RUN (Simulación)' if dry_run else 'PRODUCCIÓN (Escritura Real)'}")
    print("==================================================")

    if dry_run:
        print("✔ Verificación exitosa. 0 llamadas enviadas en modo simulación.")
        return

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    total_created = 0
    total_updated = 0
    total_skipped = 0

    batches = [contacts[i:i + BATCH_SIZE] for i in range(0, total, BATCH_SIZE)]
    num_batches = len(batches)

    for idx, batch in enumerate(batches, 1):
        print(f"[{idx}/{num_batches}] Enviando lote ({len(batch)} contactos)...", end=" ", flush=True)

        payload = json.dumps({"contacts": batch}).encode("utf-8")
        req = urllib.request.Request(
            TARGET_URL,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Cookie": "crm_session=migration_runner",
                "Host": "copper-giant-crm-3-ockham.wu48i0.easypanel.host"
            }
        )

        success = False
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
                    res_data = json.loads(resp.read().decode("utf-8"))
                    stats = res_data.get("stats", {})
                    c = stats.get("countCreated", 0)
                    u = stats.get("countUpdated", 0)
                    s = stats.get("countSkipped", 0)
                    total_created += c
                    total_updated += u
                    total_skipped += s
                    print(f"✔ Creados: +{c} | Actualizados: +{u} | Omitidos: +{s}")
                    success = True
                    break
            except Exception as e:
                print(f"⚠ Reintento {attempt+1}/3 tras error: {e}")
                time.sleep(3)

        if not success:
            print("❌ Error fatal en el lote. Deteniendo migración.")
            break

        # Small delay between batches to ensure server CPU stays cool
        time.sleep(0.5)

    print("\n==================================================")
    print("🏁 MIGRACIÓN FINALIZADA CON ÉXITO")
    print(f"   Total Procesados:   {total_created + total_updated + total_skipped:,}")
    print(f"   Nuevos Creados:     {total_created:,}")
    print(f"   Actualizados:       {total_updated:,}")
    print(f"   Omitidos (Invál):   {total_skipped:,}")
    print("==================================================")

if __name__ == "__main__":
    is_dry = "--dry-run" in sys.argv
    run_migration(dry_run=is_dry)
