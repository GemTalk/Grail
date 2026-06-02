# grail_rest_demo

A small but realistic **Flask app** running on [Grail](../../..) — that
is, Flask and Werkzeug executing as GemStone Smalltalk. It manages a
collection of *tasks* (a todo list) and exposes them two ways over the
**same data**:

* a **JSON REST API** under `/api` (for programs — see `client.py`); and
* a server-rendered **HTML UI** under `/` with plain HTML forms, so a
  person can create / edit / toggle / delete tasks from a browser during
  a demo.

The point of the demo is twofold:

1. Show that a non-trivial Flask application — application factory,
   multiple routes with converters, JSON request/response, status codes,
   `Location` headers, `abort()` + `@app.errorhandler`, `url_for()`,
   `request.form`, and multi-line Jinja templates
   (`render_template_string` with auto-escaping) — runs on Grail
   unmodified.
2. Show **GemStone as the database**. The data lives in an in-memory
   `TaskStore`, which on Grail is just an ordinary GemStone object in the
   repository's object memory. Commit the GemStone session and every task
   persists across process restarts — no external datastore, ORM, or
   serialization layer. Swap `TaskStore` for one backed by a persistent
   GemStone collection and the HTTP layer is unchanged.

## HTML UI

Open <http://127.0.0.1:5000/> in a browser: a task list with a "new
task" form, plus per-task toggle / edit / delete controls. Every write is
a `POST` (HTML forms can't issue `PUT`/`DELETE`) that mutates the store
and redirects back — the classic POST/redirect/GET pattern. It reads and
writes the very same tasks the REST API serves, so you can edit in the
browser and `curl /api/tasks` to see the change (or vice-versa).

## REST API

| Method | Path                | Behaviour                              |
|--------|---------------------|----------------------------------------|
| GET    | `/api`              | service metadata + link to collection  |
| GET    | `/api/tasks`        | list every task                        |
| POST   | `/api/tasks`        | create a task (`201` + `Location`)     |
| GET    | `/api/tasks/<id>`   | fetch one task (`404` if missing)      |
| PUT    | `/api/tasks/<id>`   | update a task (`404` if missing)       |
| DELETE | `/api/tasks/<id>`   | delete a task (`204`; `404` if missing)|

The browser UI lives at `/` (`GET`), with form `POST`s to `/tasks`,
`/tasks/<id>/toggle`, `/tasks/<id>/edit`, and `/tasks/<id>/delete`.

A task is `{"id": int, "title": str, "done": bool}`. Errors come back as
JSON (`{"error": ..., "detail": ...}`) so the service speaks one content
type from end to end.

## Running it

On the Grail side (Topaz session or `flask run`):

```python
from src.python.grail_rest_demo.app import main
main(port=5000)
```

Use `main()` — it configures the dev server for the way Grail runs:

* **single-threaded** (`threaded=False`). Flask's `app.run` defaults to
  `threaded=True`, but Grail runs each Jinja template in its own green
  thread (a generator forked as a GsProcess) and the threaded dev server's
  per-request context — a `contextvars.ContextVar` — can't span those
  threads, so a template's `url_for` can't see the active request. One CPU
  per gem means threading buys no parallelism here anyway.
* **one request per connection** (`CloseAfterResponseHandler`, no
  keep-alive). A single-threaded server must not park reading a kept-alive
  connection waiting for a follow-up request — while it does, it can't
  accept a new connection, so the next thing the browser opens (a tab, a
  favicon fetch, the next click) hangs. This app has no use for persistent
  connections; once the response is written the socket is done. (Real-time
  push — WebSockets — is a separate feature that *would* need concurrent
  connections; it's not part of this demo.)

Then drive it however you like:

```console
$ curl -s http://127.0.0.1:5000/api/tasks
{"tasks": [...]}

$ curl -s -X POST http://127.0.0.1:5000/api/tasks \
       -H 'Content-Type: application/json' \
       -d '{"title": "write docs"}'
{"id": 3, "title": "write docs", "done": false}
```

## CPython client

[`client.py`](client.py) is a standard-library-only client meant to run
under **real CPython** against a Grail-hosted server, demonstrating
cross-runtime interop (CPython client ↔ GemStone/Smalltalk server, plain
HTTP between them):

```console
$ python3 client.py http://127.0.0.1:5000
Talking to http://127.0.0.1:5000
POST   /api/tasks            -> 201  id=3  Location=/api/tasks/3
GET    /api/tasks            -> 200  count=3
GET    /api/tasks/3          -> 200  {'id': 3, 'title': 'Try the Grail REST demo', 'done': False}
PUT    /api/tasks/3          -> 200  done=True
GET    /api/tasks/99999      -> 404  {'error': 'not found', 'detail': 'task 99999 not found'}
DELETE /api/tasks/3          -> 204
GET    /api/tasks/3          -> 404  {'error': 'not found', 'detail': 'task 3 not found'}
```

## In-process testing

The Grail test suite drives the whole lifecycle through Flask's
in-process test client; see
`tests/python/pkg_scaffolding/use_rest_demo.py` and the
`testRestDemo*` cases in `FlaskScaffoldingTestCase`.
