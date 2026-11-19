# Familienküche v4.2 – ohne Magic-Link-Zwang

**Bestehende Site:** https://familienrezepte.actualflour4.chatgpt.site/

## Warum kein vollständig offener Datenbankzugang?
Die Website-Adresse ist kein Sicherheitsmerkmal. RLS, die privaten Rezepte und die gemeinsame Einkaufsliste bleiben geschützt.

## Was sich geändert hat
- Login ohne Mailversand: `supabase.auth.signInWithPassword` statt Magic-Link.
- Auf Familienhandys wird einmalig das **Familienpasswort** eingegeben; Supabase speichert die Sitzung auf dem Gerät (`persistSession: true`).
- Optional `familyAccessEmail` in `config.js` eintragen, damit die Familienmitglieder ausschließlich das Passwort sehen.
- Separater Admin-Login (E-Mail + Passwort) bleibt erhalten.
- Bestehende SQL-Tabellen, RLS-Regeln, Rezept- und Shopping-Daten unverändert.
- Bildklick-Fix und Navigations-Fix v4.1 bleiben enthalten.

## EINMALIGE Einrichtung in Supabase

1. Supabase → **Authentication → Users** → **Add user → Create new user**. Falls dieser Menüpunkt angezeigt wird, richte ein eigenes **Familienkonto mit E-Mail + starkem Passwort** ein. Stelle sicher, dass der User als bestätigt angelegt wird (Option `Auto Confirm User`, sofern vorhanden). **Nicht den bisherigen owner-Account verwenden.**
2. Wähle ein eigenes, ausreichend langes Familienpasswort (mindestens 12 Zeichen, besser 16+). Dieses nicht in die Website, das ZIP oder den Chat schreiben.
3. Die neue Konto-E-Mail in `supabase/08_shared_family_login.sql` anstelle von `FAMILIENKONTO_EMAIL_HIER_EINTRAGEN` eintragen. Datei im **SQL Editor** von Supabase ausführen. Dadurch bekommt das Familienkonto genau die Rolle `member` und **keine Administratorrechte**.
4. Im Sites-Editor der bestehenden Familienrezepte-Site den **produktiven** `supabaseUrl` und `supabasePublishableKey` beibehalten. Optional `window.FAMILY_CONFIG.familyAccessEmail = '...';` auf die Familienkonto-E-Mail setzen. **Niemals das Passwort in config.js hinterlegen.**
5. `Familienkueche_Sites_ohne_Magic_Link_v4_2.zip` in der **bestehenden** Site importieren und nur die Browser-App-Dateien aktualisieren. Anschließend Vorschau und Veröffentlichung.
6. Auf dem zweiten Gerät die Site öffnen, falls die E-Mail nicht in `config.js` steht, diese einmalig eingeben, Familienpasswort eingeben → anmelden. Beim nächsten Besuch sollte das Gerät angemeldet bleiben.

## Wichtig: Für den Owner/Admin
Das vorhandene Owner-Konto besitzt möglicherweise **noch kein Passwort**, weil es bisher nur Magic-Links verwendet hat. Für den gesonderten Administrator-Login muss dieses Konto ein Passwort haben. Falls auf einem Gerät noch eine aktive Admin-Sitzung läuft, dort zuerst ein Passwort über Supabase Auth setzen (nicht abmelden, bevor das funktioniert) oder über eine vertrauenswürdige Supabase-Admin-Umgebung setzen. Ersetze keinesfalls den Owner-Eintrag in der Mitglieder-Tabelle durch das gemeinsame Konto.

## Einschränkungen des gemeinsamen Kontos
- Auf der Shopping-Liste ist **nicht unterscheidbar**, welches Familienmitglied eine Änderung vorgenommen hat (alle nutzen denselben Auth-Benutzer).
- Wer das Passwort kennt, erhält den Lese-/Schreibzugang wie jedes Familienmitglied. Bei Verlust eines Geräts oder Weitergabe des Passworts Passwort ändern und Sitzungen widerrufen.
- Das Passwort wird nicht im Frontend-Code gespeichert, Supabase speichert die Sitzung im jeweiligen Browser. Das ist bequemer, aber die Sicherheit hängt von Passwort und Geräteschutz ab.
- Kein offener Gastzugriff, keine Freigabe der `anon`-Datenbankrolle, keine Abschaltung von RLS.
- Die Veröffentlichung auf der bestehenden ChatGPT Site muss im Sites-Editor erfolgen. Das ZIP ist vorbereitet, aber nicht live eingespielt.

## Funktionstest
- Supabase `family_members` zeigt Owner als `owner` und das gemeinsame Konto als `member`.
- Anmeldung mit Familienkonto (ohne E-Mail) auf iPhone / zweitem Browser.
- 23 Rezepte werden geladen; Kochmodus und Einkaufsliste funktionieren.
- Admin-Schreibbereich erscheint beim gemeinsamen Familienkonto **nicht**.
- Neues Familiengerät hakt Artikel ab → anderes Gerät bekommt Änderung.
- Ein nicht freigeschalteter Supabase-User erhält keinen Datenzugriff.
