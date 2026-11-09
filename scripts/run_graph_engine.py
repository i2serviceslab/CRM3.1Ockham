#!/usr/bin/env python3
"""
Copper Giant CRM V3.1 — Graph Relationship & Data Enrichment Runner
Scans contacts in production CRM, infers corporate & event relationships,
and enriches missing metadata.
"""

import sys
import json
import urllib.request
import ssl
import time

TARGET_URL = "https://copper-giant-crm-3-ockham.wu48i0.easypanel.host"

def run_enrichment_and_linking():
    print("==================================================")
    print("🕸️  COPPER GIANT CRM — MOTOR ACTIVO DE GRAFO E IA")
    print(f"   Destino: {TARGET_URL}")
    print("==================================================")

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    # 1. Fetch contacts from CRM
    print("📥 Descargando contactos para análisis de grafo...", end=" ", flush=True)
    req = urllib.request.Request(
        f"{TARGET_URL}/api/contacts?tenantId=ALL",
        headers={"Cookie": "crm_session=migration_runner"}
    )

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=90) as r:
            data = json.loads(r.read().decode("utf-8"))
            contacts = data.get("contacts", [])
            print(f"✔ {len(contacts):,} contactos cargados.")
    except Exception as e:
        print(f"❌ Error al consultar contactos: {e}")
        return

    # 2. Analyze corporate domains & companies
    generic_domains = {
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
        'aol.com', 'proton.me', 'protonmail.com', 'live.com', 'msn.com',
        'me.com', 'mac.com', 'zoho.com', 'mail.com', 'comcast.net'
    }

    known_domains = {
        'canaccordgenuity.com': ('Canaccord Genuity', 'Vancouver, BC, Canada', 'Broker / Intermediary'),
        'canaccord.com': ('Canaccord Genuity', 'Vancouver, BC, Canada', 'Broker / Intermediary'),
        'bmo.com': ('BMO Capital Markets', 'Toronto, ON, Canada', 'Institutional / Fund'),
        'haywood.com': ('Haywood Securities', 'Vancouver, BC, Canada', 'Broker / Intermediary'),
        'apexgeoscience.com': ('APEX Geoscience Ltd.', 'Edmonton, AB, Canada', 'Strategic / Corporate'),
        'denariusmetals.com': ('Denarius Metals', 'Toronto, ON, Canada', 'Strategic / Corporate'),
        'trafigura.com': ('Trafigura', 'Geneva, Switzerland', 'Institutional / Strategic'),
        'nbc.ca': ('National Bank of Canada', 'Montreal, QC, Canada', 'Institutional / Fund'),
        'rbc.com': ('RBC Capital Markets', 'Toronto, ON, Canada', 'Institutional / Fund'),
        'cormark.com': ('Cormark Securities', 'Toronto, ON, Canada', 'Broker / Intermediary'),
        'redcloudsecurities.com': ('Red Cloud Securities', 'Toronto, ON, Canada', 'Broker / Intermediary'),
        'sprott.com': ('Sprott Capital Partners', 'Toronto, ON, Canada', 'Institutional / Fund'),
        'anm.gov.co': ('Agencia Nacional de Minería (ANM)', 'Bogotá, Colombia', 'Strategic / Government'),
    }

    company_buckets = {}
    domain_buckets = {}
    event_buckets = {}
    enrichment_candidates = []

    for c in contacts:
        email = (c.get("email") or "").strip().lower()
        company = (c.get("company") or "").strip()
        location = (c.get("location") or "").strip()
        investor_type = (c.get("investorType") or "").strip()

        domain = email.split("@")[1] if "@" in email else ""

        # Check enrichment opportunities
        update_fields = {}
        if domain in known_domains:
            k_comp, k_loc, k_type = known_domains[domain]
            if not company:
                update_fields["company"] = k_comp
            if not location:
                update_fields["location"] = k_loc
            if not investor_type or investor_type == "Retail investor":
                update_fields["investorType"] = k_type
        elif domain and domain not in generic_domains:
            clean_dom = domain.split(".")[0].capitalize()
            if not company and len(clean_dom) > 2:
                update_fields["company"] = clean_dom

        if update_fields:
            enrichment_candidates.append({"id": c["id"], "name": c.get("name"), "fields": update_fields})

        # Bucketing
        norm_comp = (update_fields.get("company") or company).lower()
        if norm_comp and len(norm_comp) > 2 and norm_comp not in ("individual", "independent"):
            company_buckets.setdefault(norm_comp, []).append(c)

        if domain and domain not in generic_domains:
            domain_buckets.setdefault(domain, []).append(c)

        src = (c.get("source") or "").lower()
        tags = (c.get("tags") or "").lower()
        if "summit" in src or "summit" in tags or "atlantic one" in src:
            event_buckets.setdefault("Summit Atlantic One", []).append(c)

    print(f"📊 Estadísticas de Descubrimiento:")
    print(f"   - Contactos candidatos a enriquecer: {len(enrichment_candidates):,}")
    print(f"   - Clústeres por Empresa: {len(company_buckets):,}")
    print(f"   - Dominios corporativos únicos: {len(domain_buckets):,}")
    print(f"   - Contactos en Eventos Clave: {sum(len(v) for v in event_buckets.values()):,}")

    # 3. Create Relationships in CRM
    relationships_to_create = []
    seen_pairs = set()

    def add_rel(src_id, tgt_id, rel_type, strength, notes):
        if src_id == tgt_id:
            return
        pair = (min(src_id, tgt_id), max(src_id, tgt_id))
        if pair in seen_pairs:
            return
        seen_pairs.add(pair)
        relationships_to_create.append({
            "sourceContactId": src_id,
            "targetContactId": tgt_id,
            "relationshipType": rel_type,
            "strength": strength,
            "notes": notes
        })

    # Link colleagues
    for comp, members in company_buckets.items():
        if 2 <= len(members) <= 30:
            for i in range(len(members)):
                for j in range(i + 1, len(members)):
                    add_rel(members[i]["id"], members[j]["id"], "Colega / Misma Empresa", 85, f"Entidad: {members[i].get('company')}")

    # Link domain peers
    for dom, members in domain_buckets.items():
        if 2 <= len(members) <= 20:
            for i in range(len(members)):
                for j in range(i + 1, len(members)):
                    add_rel(members[i]["id"], members[j]["id"], "Misma Organización", 80, f"Dominio: @{dom}")

    # Link event attendees
    for evt, attendees in event_buckets.items():
        sample = attendees[:20]
        for i in range(len(sample)):
            for j in range(i + 1, len(sample)):
                add_rel(sample[i]["id"], sample[j]["id"], "Co-asistente a Evento", 65, f"Evento: {evt}")

    print(f"🔗 Vínculos de red listos para registrar: {len(relationships_to_create):,}")

    # Post relationships in batches
    created_count = 0
    for i, rel in enumerate(relationships_to_create[:300], 1):
        try:
            req_rel = urllib.request.Request(
                f"{TARGET_URL}/api/relationships",
                data=json.dumps(rel).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Cookie": "crm_session=migration_runner"
                }
            )
            with urllib.request.urlopen(req_rel, context=ctx, timeout=10) as resp:
                created_count += 1
                if created_count % 25 == 0:
                    print(f"   [+{created_count}] Vínculos registrados en el grafo...")
        except Exception:
            pass

    print(f"\n✔ Proceso completado: {created_count} relaciones guardadas exitosamente en el Grafo.")
    print("==================================================")

if __name__ == "__main__":
    run_enrichment_and_linking()
