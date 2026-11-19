# Auftrag an ChatGPT Sites – bestehende Familienrezepte-Site aktualisieren

**Wichtig:** Bitte die bereits bestehende Site **https://familienrezepte.actualflour4.chatgpt.site/** bearbeiten. **Keine neue Site erstellen** und **nichts veröffentlichen**, bevor ich die Vorschau freigebe.

## Ziel
Aus dem beigefügten Verzeichnis/ZIP die bestehende **Familienküche Cloud v3** in diese Site übernehmen. Die vorhandenen 23 Rezeptdatensätze, alle 23 Food-Fotos, Rezeptsuche, Favoriten, Mengen-Skalierung, gemeinsame Einkaufsliste, Essensplanung, Schritt-für-Schritt-Kochmodus, Zeitmesser und Rezept-JSON-Import sollen erhalten bleiben.

## Technische Vorgaben
1. Nutze **ChatGPT Sites für Hosting und Deployment** statt Cloudflare Pages. Mache die vorhandenen statischen Dateien für den Sites-Build lauffähig und migriere sie nötigenfalls in dessen empfohlenes Projektschema.
2. **Supabase bleibt vorerst das externe Backend** für Authentifizierung, Familienmitgliedschaft, Postgres-RLS, Rezeptdaten, gemeinsame Einkäufe und Essensplanung. Kein stillschweigender Wechsel zu einer anderen Datenbank, kein offener gemeinsamer Speicher.
3. `config.js` enthält bewusst nur Platzhalter. Bitte frage nach **Supabase Project URL und Publishable Key** (das sind browseröffentliche Werte), wenn sie für Tests vorliegen. **Niemals** Service-Role-/Secret-Keys in Browserdateien ablegen.
4. Sämtliche Inhalte sind erst nach Supabase-Login und verifizierter Familienmitgliedschaft sichtbar. Für anonymisierte Gäste keine Rezepte oder gemeinsame Listen aus der Datenbank ausgeben. Die generierten Food-Fotos dürfen öffentlich sein; kein Familienfoto hochladen.
5. Die im ZIP enthaltenen Dateien `supabase/*.sql` sind Datenbankmigrationen für ein neues Supabase-Projekt und **keine** Migrationen für die Sites-Datenbank. RLS **nicht** abschalten. Migrationen müssen separat im Supabase SQL Editor eingerichtet werden.
6. Prüfe mit zwei freigeschalteten Accounts und einem **nicht freigeschalteten** Account (nach Einrichtung von Supabase) Login, Rezepte, neue Rezepte, Einkaufsänderungen und Rechte. Ungetestete Punkte explizit kennzeichnen.
7. PWA-Manifest und Service Worker nach Möglichkeit erhalten, aber Service Worker nur dann aktivieren, wenn Sites die Einbindung unterstützt. Keine privaten Daten im Cache speichern.
8. Bitte aktualisiere **die vorhandene URL**; verwende deine Editierfunktionen für diese bestehende Site. Zuerst eine **private Vorschau oder gespeicherte Version**, die ich prüfen kann.

## Gewünschte Qualität
Mobile Navigation unten (Rezepte, Einkaufen, Planen, Kochen, Mehr), ansprechende Bilder, gut bedienbare große Schaltflächen, zuverlässiger Hochformat-Betrieb auf dem iPhone, Lade- und Fehlerzustände. In Rezeptverwaltung: JSON-Import prüfen, Änderungsübersicht, dann erst nach Bestätigung speichern. Rezepte lassen sich ohne Code-Deployment über Supabase aktualisieren.

## Nach der Vorschau
Vor Veröffentlichung einen Check der Sites-Freigabe vornehmen. Die Zielgruppe sind **nur eingeladene Familienmitglieder**. Welche Freigabeoptionen im ChatGPT Sites-Konto tatsächlich verfügbar sind, muss der Owner bestätigen. Zusätzlich greift immer die Supabase-RLS.
