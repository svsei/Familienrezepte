# Rezeptwerkstatt – Integrationsstand

Die bestehende statische Site erhält einen Dialog „Rezeptwerkstatt“. Die fünf Navigationsschaltflächen, Anmeldung, Datenbankkonfiguration und vorhandenen Daten bleiben erhalten.

## Server

`supabase/functions/recipe-chat/index.ts` und `handler.mjs` bilden eine Supabase Edge Function. Die Function prüft bei jedem Aufruf die Sitzung über Supabase Auth und liest `family_members` mit der bestätigten Benutzer-ID, der ausgewählten Familie und dem JWT des Benutzers unter RLS. Sie verwendet keinen Service-Role-Key. Es werden keine Tabellen oder Policies geändert.

Die Function benötigt `OPENAI_API_KEY` als serverseitiges Secret. `SUPABASE_URL` und `SUPABASE_ANON_KEY` sind die Standard-Umgebungsvariablen der Supabase Edge Runtime. Der API-Key gehört niemals in `dist/config.js`, JavaScript im Browser oder Git.

Aufruf: OpenAI Responses API, Modell `gpt-4.1-mini`, strukturiertes Rezept, maximal 5000 Ausgabe-Tokens, `store:false`. Nur Chat-Nachrichten und aktueller Entwurf werden übertragen, keine E-Mail, Benutzer-ID oder gespeicherten Familienrezepte. Die Eingabe ist begrenzt. Die lokale Burst-Sperre (6/min je Benutzer und Isolate) ist kein globales Kostenlimit; ein OpenAI-Projektbudget separat konfigurieren.

## Speichern

Nach der Rezeptvorschau speichert ein bewusster Klick ein neues Rezept über den vorhandenen Supabase-Client. Der vorhandene Parser prüft Zutaten und Kochschritte. Eine zufällige Rezept-ID und INSERT statt UPSERT verhindern versehentliches Überschreiben. Bestehende RLS-Regeln bleiben wirksam; aktuell dürfen nur `owner` Rezepte speichern.

Chat und ungespeicherter Entwurf werden nur im Arbeitsspeicher gehalten, nicht in Local Storage. Beim Abmelden werden sie verworfen. Eine gespeicherte Rezeptfassung kann weiterentwickelt und als neues Rezept gespeichert werden.

## Noch offen vor Veröffentlichung

- Sichere Bereitstellung des OpenAI-API-Schlüssels. Die verbundene Plugin-Schnittstelle kann verschlüsselte Schlüssel erzeugen, aber der dazugehörige lokale Schreibhelfer fehlt aktuell. Es wurde deshalb kein Schlüssel erzeugt.
- Function `recipe-chat` bereitstellen und Secret konfigurieren. Bisher nicht deployed.
- Echten angemeldeten Durchlauf mit OpenAI testen; bisher nur automatisierte Tests mit simulierten Antworten und lokale Browserprüfung.
- Sven ist aktuell `member`. Für direktes Speichern muss ein Familienadministrator die Rolle nach ausdrücklicher Zustimmung auf `owner` setzen; es wurde nichts an Mitgliedschaften geändert.

Tests: `node --test tests/recipe-chat.test.mjs`.
