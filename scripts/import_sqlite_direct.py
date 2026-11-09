#!/usr/bin/env python3
"""
Direct SQLite Ingestion of 5,087 Contacts into Copper Giant CRM V3
Database: /Users/i2carvajal/Documents/Proyectos/CopperCRM_V3_Clean/data/production.db
Tenant: be078b12-b027-44e3-8d77-144bfbe23279 (Copper Giant)
"""

import json
import sqlite3
import uuid
from datetime import datetime

DB_PATH = "/Users/i2carvajal/Documents/Proyectos/CopperCRM_V3_Clean/data/production.db"
JSON_PATH = "/Users/i2carvajal/Documents/Proyectos/CopperCRM_V3_Clean/data/crm_migration_ready.json"
TENANT_ID = "be078b12-b027-44e3-8d77-144bfbe23279"

def main():
    print("==================================================")
    print("🚀 INICIANDO INGESTIÓN DIRECTA A SQLITE PRODUCTION.DB")
    print(f"   Base de datos: {DB_PATH}")
    print(f"   Tenant: {TENANT_ID}")
    print("==================================================")

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        contacts = json.load(f)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Pre-cargar contactos existentes para deduplicación rápida en memoria
    cursor.execute("SELECT id, LOWER(email), LOWER(name), LOWER(company) FROM Contact WHERE tenantId = ?", (TENANT_ID,))
    existing_rows = cursor.fetchall()

    email_map = {}
    name_comp_map = {}
    for cid, email, name, company in existing_rows:
        if email:
            email_map[email.strip()] = cid
        if name:
            key = f"{(name or '').strip()}|{(company or '').strip()}"
            name_comp_map[key] = cid

    now = datetime.utcnow().isoformat()
    inserted = 0
    updated = 0

    for item in contacts:
        name = (item.get("name") or "").strip()
        if not name:
            continue

        email = (item.get("email") or "").strip() or None
        phone = (item.get("phone") or "").strip() or None
        whatsapp = (item.get("whatsapp") or "").strip() or phone
        company = (item.get("company") or "").strip() or "Empresa Independiente"
        title = (item.get("title") or "").strip() or None
        city = (item.get("city") or "").strip() or None
        country = (item.get("country") or "").strip() or "Canadá"
        location = (item.get("location") or "").strip() or (f"{city}, {country}" if city else country)
        investor_type = (item.get("investorType") or "").strip() or "Institutional Investor"
        interest_level = (item.get("interestLevel") or "Medium").strip()
        stage = (item.get("stage") or "Lead Prospect").strip()
        lead_score = int(item.get("leadScore") or 70)
        source = (item.get("source") or "Ian Harris Master CRM").strip()
        notes = (item.get("notes") or "").strip() or None
        tags = (item.get("tags") or "").strip() or "Ian Harris Network, Master CRM"
        custom_tags = (item.get("customTags") or "").strip() or "Minería"

        # Comprobar si ya existe
        existing_id = None
        if email and email.lower() in email_map:
            existing_id = email_map[email.lower()]
        else:
            name_key = f"{name.lower()}|{company.lower()}"
            if name_key in name_comp_map:
                existing_id = name_comp_map[name_key]

        if existing_id:
            cursor.execute("""
                UPDATE Contact SET
                    company = COALESCE(?, company),
                    title = COALESCE(?, title),
                    phone = COALESCE(?, phone),
                    whatsapp = COALESCE(?, whatsapp),
                    location = COALESCE(?, location),
                    investorType = COALESCE(?, investorType),
                    interestLevel = COALESCE(?, interestLevel),
                    stage = COALESCE(?, stage),
                    leadScore = ?,
                    source = COALESCE(?, source),
                    notes = COALESCE(?, notes),
                    tags = COALESCE(?, tags),
                    customTags = COALESCE(?, customTags),
                    country = COALESCE(?, country),
                    city = COALESCE(?, city),
                    updatedAt = ?
                WHERE id = ?
            """, (
                company, title, phone, whatsapp, location,
                investor_type, interest_level, stage, lead_score,
                source, notes, tags, custom_tags, country, city,
                now, existing_id
            ))
            updated += 1
        else:
            new_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO Contact (
                    id, tenantId, name, email, phone, whatsapp, company, title,
                    city, country, location, investorType, interestLevel, stage,
                    leadScore, source, notes, tags, customTags, createdAt, updatedAt
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?
                )
            """, (
                new_id, TENANT_ID, name, email, phone, whatsapp, company, title,
                city, country, location, investor_type, interest_level, stage,
                lead_score, source, notes, tags, custom_tags, now, now
            ))
            inserted += 1
            if email:
                email_map[email.lower()] = new_id
            name_comp_map[f"{name.lower()}|{company.lower()}"] = new_id

    conn.commit()

    # Verificar conteo final
    cursor.execute("SELECT count(*) FROM Contact WHERE tenantId = ?", (TENANT_ID,))
    final_count = cursor.fetchone()[0]

    conn.close()

    print("==================================================")
    print(f"✔ INGESTIÓN COMPLETADA EXITOSAMENTE:")
    print(f"   • Contactos Nuevos Insertados: {inserted:,}")
    print(f"   • Contactos Actualizados:      {updated:,}")
    print(f"   • Total Contactos en Tenant:   {final_count:,}")
    print("==================================================")

if __name__ == "__main__":
    main()
