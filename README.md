# Familienküche

Quellstand der Familienrezepte-App, Sites-Version 34.

## Inhalt

- `dist/`: Web-App und Bilder (HTML, CSS, JavaScript)
- `supabase/`: SQL-Einrichtungsskripte und Edge Functions
- `tests/`: automatisierte Tests
- `docs/`: ergänzende Dokumentation

## Lokal starten

```sh
python3 -m http.server 8080 --directory dist
```

Tests mit Node.js:

```sh
node --test tests/*.test.mjs
```

Die App benötigt Supabase. `dist/config.js` enthält die öffentliche Projekt-URL und den Publishable Key; geheime Schlüssel gehören ausschließlich in serverseitige Secrets.

Die SQL-Dateien sind historische Einrichtungsskripte. Nicht ungeprüft erneut auf einer produktiven Datenbank ausführen. Aktuelle Benutzer, Familien-, Einkaufs- und Planungsdaten sowie spätere Rezeptänderungen liegen in Supabase und sind kein Bestandteil dieser Quellcodesicherung.

Quelle: Sites-Commit `9b99f4d14df26550decf1bbbed45af62baa6f506`.

Dies ist eine Momentaufnahme. Es ist keine automatische Synchronisierung oder GitHub-basierte Veröffentlichung eingerichtet.
