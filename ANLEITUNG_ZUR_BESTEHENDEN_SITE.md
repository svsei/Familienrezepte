# Familienküche auf eurer bestehenden ChatGPT Site

Ziel: **https://familienrezepte.actualflour4.chatgpt.site/** (bereits vom Nutzer erstellt).

## 1. Nicht eine neue Site anlegen
Öffne https://chatgpt.com/sites, wähle die bestehende **Familienrezepte**-Site und **Bearbeiten**. Alternativ öffne die veröffentlichte Site (mit Eigentümerkonto eingeloggt) und wähle „Site bearbeiten“, sofern die Schaltfläche angeboten wird. Der Zugriff ist privat; ein öffentlicher Abruf kann HTTP 401 liefern.

## 2. Diesen Import übergeben
Im Bearbeitungsdialog von Sites/Work die Datei `Familienkueche_Sites_Import.zip` hochladen und als Anleitung `SITES_AUFTRAG.md` aus dem ZIP verwenden. Explizit anweisen, **die bestehende Site** zu ändern, **keine neue** zu erstellen und **noch nicht zu veröffentlichen**. Die bestehende URL darf nicht verloren gehen.

## 3. Backend bleibt Supabase
Die App kann den Familienstatus nicht synchronisieren, bevor das Supabase-Projekt eingerichtet ist. In diesem ZIP liegen unter `supabase/` die SQL-Dateien `01_schema.sql` bis `06_recipe_media.sql`; siehe `SUPABASE_KURZANLEITUNG.md`. Supabase-URL und **Publishable Key** müssen in `config.js` eingetragen werden oder im Site-Build sicher als öffentlich zugängliche Frontend-Werte konfiguriert werden. Nur diese zwei öffentlichen Werte in den Browser. **Keine** Server- oder Service-Role-Keys dort ablegen.

## 4. Privater Zugriff
Sites → Teilen → nur die passenden Familienmitglieder. Ob externe private Einladungen für deinen Account verfügbar sind, dort prüfen. Eingeladene benötigen gegebenenfalls ihr ChatGPT-Konto. *Sites*-Leserechte sind nicht automatisch Supabase-Tabellenrechte: die Familienmitglieder müssen separat in Supabase eingeladen und in `family_members` freigeschaltet sein.

## 5. Tests vor Veröffentlichung
Zwei Familienhandys: auf Gerät A Artikel ergänzen, auf B sichtbar? Gerät B hakt ab, auf A sichtbar? Rezept hinzufügen und Rezeptverwaltung nur für Administrator? Ein nicht eingeladenes Supabase-Konto muss wegen RLS den Zugriff verweigert bekommen. Teste Magic-Link nach der Festlegung der endgültigen Site-URL und prüfe `Authentication → URL Configuration` in Supabase.

## 6. Veröffentlichung
In Sites erst Vorschau prüfen, dann vorhandene Site **aktualisieren/veröffentlichen**. Nachher erneut unter **https://familienrezepte.actualflour4.chatgpt.site/** testen. Die Code-Version wird bei jeder Änderung über Sites veröffentlicht, Rezepte/Einkäufe werden anschließend unabhängig davon live aus Supabase geladen.

### Grenzen
Dieses ZIP ist ein **Source-Importpaket für den Sites-Bearbeitungsworkflow**, kein bestätigter direkt lauffähiger Sites-Deploy. ChatGPT Sites kann das Projekt ggf. technisch umwandeln müssen. Hier liegt kein direkter Zugriff auf das private Sites-Bearbeitungsprojekt und kein Supabase-Konto vor. Bis zum erfolgreichen Live-Test ist die Site nicht als fertig migriert zu betrachten.

Offizielle Anleitung: https://help.openai.com/de-de/articles/20001339-creating-and-using-chatgpt-sites


**Aktualisierung nach dem localhost-Fehler:** Lies zuerst `START_HIER.md`. Dort sind die korrekten Supabase-Redirect-Einstellungen und die nächsten SQL-Schritte ab deinem aktuellen Stand beschrieben.
