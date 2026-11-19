# Familienküche – Sites-Import (aktualisiert 06.11.2026)

**Ziel:** Die *bestehende* ChatGPT Site unter https://familienrezepte.actualflour4.chatgpt.site/ aktualisieren. **Keine neue Site erstellen.** Hosting über ChatGPT Sites, gemeinsame Daten über Supabase.

## Aktueller Stand

Du hast das Supabase-Projekt angelegt und `supabase/01_schema.sql` bereits ausgeführt. **Dieses Skript nicht einfach erneut starten.** Die Dateien im Unterordner `supabase/` sind für den Supabase SQL Editor – sie gehören nicht in den Sites-Editor.

**Wichtig: Fehler `localhost:3000` beim Einladungslink**

Vor einem neuen Login bzw. einer neuen Einladung in Supabase unter **Authentication → URL Configuration** einstellen:

- **Site URL:** `https://familienrezepte.actualflour4.chatgpt.site/`
- **Redirect URLs:** `https://familienrezepte.actualflour4.chatgpt.site/` hinzufügen.

Die alte URL `http://localhost:3000` darf nicht die produktive Site URL bleiben. **Bereits ungültige oder verbrauchte Einladungslinks nicht noch einmal öffnen** (`otp_expired`): nach dem Einstellen der URLs einen neuen Link auslösen. Eine erfolgreiche Weiterleitung setzt außerdem voraus, dass die Site die Supabase-App bereits ausliefert und der betreffende Benutzer die nötigen Sites-Zugriffsrechte hat.

## Weiter ab deinem Stand – empfohlene Reihenfolge

1. **Supabase URL Configuration korrigieren** (s.o.).
2. **Authentication → Users:** Prüfen, ob deine E-Mail als Benutzer angelegt ist. Falls nein, Benutzer einladen (idealerweise erst nach funktionierender Site). Die Owner-E-Mail muss in `auth.users` existieren, muss für `02` aber noch nicht erfolgreich eingeloggt sein.
3. `supabase/02_family_bootstrap.sql`: `OWNER_EMAIL_HIER_EINTRAGEN` durch deine E-Mail ersetzen und im **SQL Editor** ausführen. Nur einmal pro Owner, das Skript ist für Wiederholungen des Bootstrap-Schritts vorgesehen.
4. `supabase/03_seed_recipes.sql`: Im SQL Editor ausführen. Es werden **23 Rezepte** übernommen, sofern genau eine Familie angelegt ist; existierende Rezeptbearbeitungen werden nicht überschrieben.
5. `supabase/05_recipe_realtime.sql`: Im SQL Editor ausführen, damit Rezepte bei Änderungen synchronisiert werden.
6. `supabase/06_recipe_media.sql`: **Nur optional**, wenn Rezeptbilder über die App hochgeladen werden sollen. Der Bilder-Bucket ist öffentlich lesbar, also keine persönlichen Fotos verwenden. Die Migration ist nicht für mehrfaches Ausführen ausgelegt.
7. In Supabase **Project Settings / Connect** die **Project URL** und den **Publishable Key** ablesen (nur `sb_publishable_...`, alternativ alter `anon`-Key). **Keinesfalls** Secret-Key, Service-Role-Key oder DB-Passwort ins Paket schreiben.
8. `config.js` mit diesen zwei öffentlichen Werten ausfüllen. Für den Sites-Import empfiehlt sich, das Paket *nach* dem Eintragen als ZIP neu zu erstellen. Bei Verwendung des ChatGPT Sites Editors können die Werte alternativ dort erst bei der Bearbeitung eingetragen werden.
9. In **ChatGPT Sites → bestehende Site 'Familienrezepte' → Bearbeiten** dieses ZIP übergeben. Die Hinweise aus `SITES_AUFTRAG.md` übernehmen. Preview prüfen, erst dann die *vorhandene Site* veröffentlichen. Es ist ein **Source-Import**, kein garantiert direkt deploybares Sites-Format; Sites kann Umwandlungen am App-Code benötigen.
10. Sobald deine Site die Supabase-App korrekt ausliefert: per **neuem** Magic-Link anmelden. Danach Rezepte/Einkaufsliste prüfen; erst anschließend weitere Familienmitglieder anlegen (`04_family_members.sql` pro Person nach Anlegen unter Auth → Users).

## Datenbankprüfung

`supabase/07_status_check.sql` ist **nur lesend**. Es zeigt Tabellenstatus, Rezepteanzahl und angelegte Familienmitglieder an. Erwartet nach Schritten 3 und 4: **1 Familie, 23 Rezepte, mindestens 1 owner**. Es zeigt keine E-Mail-Adressen oder Zugangsschlüssel an.

## Was im Import enthalten ist

- `index.html`, `styles.css`, `app.js`, `cloud.js`, `recipe-admin.js` / `.css` – Website und Rezeptverwaltung
- `images/` – 23 Food-Fotos aus dem Projekt
- `supabase/01_schema.sql` bis `06_recipe_media.sql` – Schema, Familie, Rezepte, Mitglieder, Realtime, optional Bilder
- `config.js` – zwei Platzhalter für öffentlich nutzbare Supabase-Projektdaten
- `manifest.webmanifest`, Icons, `sw.js` – PWA-Bestandteile, soweit vom Sites-Build unterstützt
- `SITES_AUFTRAG.md` – Bearbeitungsauftrag für deine bereits bestehende Site

## Sicherheitscheck vor Familienfreigabe

- RLS bleibt eingeschaltet; keine breiten `anon`-Rechte vergeben.
- Schreibzugriff für Rezeptverwaltung nur für `owner`; gemeinsame Listen für Mitglieder derselben Familie.
- Zugriffsrechte in ChatGPT Sites **und** Supabase sind unabhängig. Beide prüfen.
- Mit einem nicht freigeschalteten Account testen, dass kein Lesen/Schreiben möglich ist.
- Ohne laufende echte Supabase-Instanz kann die bisherige lokale Testumgebung keinen Ende-zu-Ende-Test ersetzen.

Offizielle Hilfeseiten:
- https://supabase.com/docs/guides/auth/redirect-urls
- https://help.openai.com/de-de/articles/20001339-creating-and-using-chatgpt-sites
