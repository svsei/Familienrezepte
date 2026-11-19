# Supabase: schnelle Fortsetzung

**Bereits erledigt:** Projekt angelegt, `supabase/01_schema.sql` ausgeführt. **Nicht erneut mit einem neuen Projekt anfangen.**

1. **Authentication → URL Configuration:** Site URL und Redirect URL auf `https://familienrezepte.actualflour4.chatgpt.site/` setzen. Altlinks mit `otp_expired` nicht wiederverwenden.
2. **Authentication → Users:** Existenz deines Owner-Users prüfen; bei Bedarf einladen.
3. `02_family_bootstrap.sql`: E-Mail-Platzhalter ersetzen, dann ausführen.
4. `03_seed_recipes.sql`: 23 Rezepte importieren.
5. `05_recipe_realtime.sql`: Rezeptaktualisierung einschalten.
6. `06_recipe_media.sql`: Nur falls eigene Fotos hochgeladen werden sollen (öffentlicher Bucket).
7. `07_status_check.sql`: Kontrollieren, ob eine Familie, 23 Rezepte und ein Owner existieren.
8. `config.js`: Nur URL und Publishable Key setzen, keine Secret Keys.
9. ZIP im Editor **der bestehenden ChatGPT Site** hochladen, Vorschau prüfen, dann veröffentlichen.

Danach erst die Auth-Anmeldung via neuem Link durchtesten und weitere Nutzer mit `04_family_members.sql` ergänzen. Details stehen in `START_HIER.md`.
