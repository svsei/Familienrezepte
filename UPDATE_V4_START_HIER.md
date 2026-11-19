# Familienküche v4 – Update für bestehende ChatGPT Site

Bestehende Site: https://familienrezepte.actualflour4.chatgpt.site/

## Änderungen
- Tipp/Klick auf ein Rezeptfoto öffnet die Rezeptdetails (auch per Tastatur bedienbar).
- In der Detailansicht kann das Foto in voller Größe in einem neuen Tab geöffnet werden.
- Versionskennzeichnung v4, angepasster Offline-Cache und Cache-Busting für App-Dateien.
- Supabase-Datenbank, Einkaufslisten, Rezepte und Familienzugänge bleiben unverändert.

## So installieren
1. In ChatGPT Sites die BESTEHENDE Site öffnen und 'Bearbeiten' wählen.
2. Dieses komplette ZIP hochladen. Keine neue Site erstellen lassen.
3. Anweisung: 'Bitte die bestehende Familienküche-Site mit dieser v4 aktualisieren. Supabase-Konfiguration, Tabellen, Daten und bestehende Authentifizierung unverändert erhalten. Rezeptfotos sollen die Details öffnen. Vorschau erstellen, nicht automatisch veröffentlichen.'
4. In der Vorschau nach Anmeldung ein Bild antippen und den Dialog prüfen.
5. Im Sites-Editor 'Veröffentlichen' bzw. 'Aktuelle Version veröffentlichen' wählen. Eine gespeicherte Version allein aktualisiert die öffentliche Adresse NICHT.
6. Die veröffentlichte Adresse neu öffnen, bei Bedarf Hard Reload (Strg/Cmd + Shift + R) oder im privaten Browserfenster testen. Wenn die Site den alten Service Worker verwendet, kann es helfen, die installierte PWA einmal zu schließen/neu zu öffnen.

WICHTIG: Dieses ZIP enthält `config.js` als Vorlage. Die produktiven Supabase-Werte aus der bestehenden Site müssen beim Update erhalten bleiben; NICHT mit Platzhaltern überschreiben. Niemals `sb_secret_...` oder `service_role` in die Website schreiben.

## Zweiter Benutzer
1. Supabase Dashboard → Authentication → URL Configuration: Site URL und Redirect URLs auf https://familienrezepte.actualflour4.chatgpt.site/ setzen.
2. Authentication → Users → Add user → Send invitation → E-Mail-Adresse eintragen.
3. Nach Entstehen des Users in auth.users Datei `supabase/04_family_members.sql` verwenden und MITGLIED_EMAIL_HIER_EINTRAGEN ersetzen. In Supabase SQL Editor ausführen.
4. Die Person nutzt den NEUESTEN Einladungslink und meldet sich an.
5. Falls die Site selbst auf eingeladene Besucher beschränkt ist, muss dieselbe Person auch über Sites → Teilen freigeschaltet werden.
6. Kontrolle (SQL Editor): `select u.email, fm.role from public.family_members fm join auth.users u on u.id=fm.user_id;`

Ein 'Auth User' allein ist nicht automatisch Familienmitglied. Keine Service-Role-Schlüssel oder persönliche Zugangstokens an andere geben.
