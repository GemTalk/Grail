"""A small but realistic Flask app, designed to run on Grail -- i.e. Flask
and Werkzeug executing as GemStone Smalltalk.

It manages a collection of *tasks* (a todo list) and exposes them two ways
over the SAME data:

* a **JSON REST API** under ``/api`` (for programs -- see ``client.py``); and
* a server-rendered **HTML UI** under ``/`` with plain HTML forms, so a
  person can create / edit / toggle / delete tasks from a browser during a
  demo.

Both share one in-memory ``TaskStore``.  Because Grail runs inside GemStone
that store is an ordinary GemStone object in the repository's object memory:
committing the GemStone session (``System commit`` on the Smalltalk side)
makes every task persist across process restarts.  In other words GemStone
itself is the database -- no external datastore, ORM, or serialization
layer.  Point a different ``TaskStore`` at a persistent GemStone collection
and nothing above changes.

REST (JSON):

    GET    /api               -> service metadata + link to the collection
    GET    /api/tasks         -> list every task
    POST   /api/tasks         -> create a task            (201 + Location)
    GET    /api/tasks/<id>    -> fetch one task           (404 if missing)
    PUT    /api/tasks/<id>    -> update a task            (404 if missing)
    DELETE /api/tasks/<id>    -> delete a task            (204; 404 if missing)

HTML (forms; HTML forms only do GET/POST, so writes are POSTs):

    GET    /                       -> task list + "new task" form
    POST   /tasks                  -> create from the form, then redirect
    POST   /tasks/<id>/toggle      -> flip done, then redirect
    GET    /tasks/<id>/edit        -> edit form
    POST   /tasks/<id>/edit        -> apply the edit, then redirect
    POST   /tasks/<id>/delete      -> delete, then redirect

Run it::

    from grail_rest_demo.app import main
    main(port=5000)            # serves single-threaded -- see below

then open http://127.0.0.1:5000/ in a browser, or drive ``/api`` with
``client.py`` / curl.

``main()`` configures the dev server for the way Grail runs: SINGLE-THREADED
(``threaded=False``) and ONE REQUEST PER CONNECTION (no keep-alive, via
``CloseAfterResponseHandler``).  Threaded serving doesn't work -- Grail runs
each Jinja template in its own green thread (a generator forked as a
GsProcess) and the threaded server's per-request ``contextvars.ContextVar``
can't span those threads, so a template's ``url_for`` can't see the active
request; a single CPU per gem means threading buys no parallelism anyway.
And a single-threaded server must close after each response: parked reading
a kept-alive connection it can't accept the next one, so a browser opening a
second connection would hang.  See ``CloseAfterResponseHandler`` below.
"""

from flask import (
    Flask,
    abort,
    jsonify,
    redirect,
    render_template_string,
    request,
    url_for,
)
from werkzeug.serving import WSGIRequestHandler


class CloseAfterResponseHandler(WSGIRequestHandler):
    """A dev-server request handler that serves ONE request per connection
    (no keep-alive).

    Werkzeug's default handler speaks HTTP/1.1, so a connection stays open
    after the response and the server loops waiting to read the next
    request on it.  On the single-threaded dev server that's a trap: while
    the server is parked reading a kept-alive connection, it can't accept a
    new one -- so the moment a browser opens a second connection (a second
    tab, a favicon fetch, the next click) everything hangs.  This app has
    no use for persistent connections: once the response is written the
    socket is done.  Forcing ``close_connection`` before running the app
    makes the response advertise ``Connection: close`` and ends the
    handler's read loop, so the server goes straight back to accepting."""

    def handle_one_request(self):
        try:
            self.raw_requestline = self.rfile.readline(65537)
        except OSError:
            self.close_connection = True
            return
        if not self.raw_requestline:
            self.close_connection = True
            return
        if not self.parse_request():
            return
        self.close_connection = True
        self.run_wsgi()


class TaskStore:
    """A minimal in-memory repository for tasks.

    On Grail this object is a GemStone object: the ``_tasks`` dict lives in
    object memory and lasts as long as the session (permanently, once the
    session commits).  Replace this class with one backed by a persistent
    GemStone collection to get durable storage without touching the views."""

    def __init__(self):
        self._tasks = {}
        self._next_id = 1

    def all(self):
        # Stable, predictable ordering: ascending id.
        return [self._tasks[key] for key in sorted(self._tasks)]

    def get(self, task_id):
        return self._tasks.get(task_id)

    def create(self, title, done=False):
        task_id = self._next_id
        self._next_id = task_id + 1
        task = {"id": task_id, "title": title, "done": bool(done)}
        self._tasks[task_id] = task
        return task

    def update(self, task_id, title=None, done=None):
        task = self._tasks.get(task_id)
        if task is None:
            return None
        if title is not None:
            task["title"] = title
        if done is not None:
            task["done"] = bool(done)
        return task

    def delete(self, task_id):
        return self._tasks.pop(task_id, None) is not None


def _describe(err):
    # HTTPException carries a human-readable ``description``; fall back to
    # str() for anything that doesn't.
    detail = getattr(err, "description", None)
    if detail:
        return detail
    return str(err)


def create_app(seed=True):
    """Application factory.  Returns a configured Flask app.

    ``seed`` pre-loads a couple of tasks so a freshly started server has
    something to show.  Pass ``seed=False`` for an empty store (tests that
    assert on exact counts want this)."""

    app = Flask(__name__)
    store = TaskStore()
    if seed:
        store.create("Learn Grail", done=True)
        store.create("Serve a REST API from GemStone")

    # ----------------------------------------------------------------- HTML
    # A browser-friendly UI.  Every write is a POST (HTML forms can't issue
    # PUT/DELETE) that mutates the store and then redirects back -- the
    # classic POST/redirect/GET pattern, so a refresh never re-submits.

    @app.route("/")
    def ui_index():
        return render_template_string(_LIST_TEMPLATE, tasks=store.all())

    @app.route("/tasks", methods=["POST"])
    def ui_create():
        title = request.form.get("title", "").strip()
        if title:
            store.create(title, done=bool(request.form.get("done")))
        return redirect(url_for("ui_index"))

    @app.route("/tasks/<int:task_id>/toggle", methods=["POST"])
    def ui_toggle(task_id):
        task = store.get(task_id)
        if task is not None:
            store.update(task_id, done=not task["done"])
        return redirect(url_for("ui_index"))

    @app.route("/tasks/<int:task_id>/edit", methods=["GET", "POST"])
    def ui_edit(task_id):
        task = store.get(task_id)
        if task is None:
            return redirect(url_for("ui_index"))
        if request.method == "POST":
            title = request.form.get("title", "").strip()
            store.update(
                task_id,
                title=title or task["title"],
                done=bool(request.form.get("done")),
            )
            return redirect(url_for("ui_index"))
        return render_template_string(_EDIT_TEMPLATE, task=task)

    @app.route("/tasks/<int:task_id>/delete", methods=["POST"])
    def ui_delete(task_id):
        store.delete(task_id)
        return redirect(url_for("ui_index"))

    # ------------------------------------------------------------ JSON REST

    @app.route("/api")
    def api_index():
        return jsonify(service="grail-rest-demo", tasks_url=url_for("list_tasks"))

    @app.route("/api/tasks", methods=["GET"])
    def list_tasks():
        return jsonify(tasks=store.all())

    @app.route("/api/tasks", methods=["POST"])
    def create_task():
        data = request.get_json(silent=True)
        if not data or not data.get("title"):
            abort(400, description="'title' is required")
        task = store.create(data["title"], data.get("done", False))
        location = url_for("get_task", task_id=task["id"])
        return jsonify(task), 201, {"Location": location}

    @app.route("/api/tasks/<int:task_id>", methods=["GET"])
    def get_task(task_id):
        task = store.get(task_id)
        if task is None:
            abort(404, description="task %d not found" % task_id)
        return jsonify(task)

    @app.route("/api/tasks/<int:task_id>", methods=["PUT"])
    def update_task(task_id):
        data = request.get_json(silent=True) or {}
        task = store.update(task_id, data.get("title"), data.get("done"))
        if task is None:
            abort(404, description="task %d not found" % task_id)
        return jsonify(task)

    @app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
    def delete_task(task_id):
        if not store.delete(task_id):
            abort(404, description="task %d not found" % task_id)
        return "", 204

    # --------------------------------------------------------- error handlers
    # The API speaks JSON; report its errors as JSON too.  The HTML views
    # never abort() (they redirect on a miss), so they don't reach these.

    @app.errorhandler(404)
    def not_found(err):
        return jsonify(error="not found", detail=_describe(err)), 404

    @app.errorhandler(400)
    def bad_request(err):
        return jsonify(error="bad request", detail=_describe(err)), 400

    return app


def main(host="127.0.0.1", port=5000):
    """Serve the demo on the Werkzeug development server.

    Single-threaded (``threaded=False``) because Grail runs Jinja templates
    in forked green threads whose request context the threaded server can't
    span, and one request per connection
    (``CloseAfterResponseHandler``) so a kept-alive connection can't park
    the single-threaded server.  See the module docstring and the handler."""
    create_app().run(
        host=host,
        port=port,
        threaded=False,
        request_handler=CloseAfterResponseHandler,
    )


# --------------------------------------------------------------------------
# Templates.  Kept inline (rendered with render_template_string) so the demo
# is a single importable file with no template-folder wiring.  Jinja only
# treats ``{{`` / ``{%`` / ``{#`` specially, so the literal ``{`` in the CSS
# below passes through untouched.  Task titles are auto-escaped by Jinja.

_STYLE = """
<style>
  body { font-family: -apple-system, system-ui, Segoe UI, sans-serif;
         max-width: 42rem; margin: 2.5rem auto; padding: 0 1rem; color: #1d1d1f; }
  h1 { font-size: 1.4rem; font-weight: 600; }
  .muted { color: #86868b; font-weight: 400; }
  form.add { display: flex; gap: .5rem; align-items: center; margin: 1.2rem 0; }
  form.add input[type=text] { flex: 1; padding: .45rem .6rem; font-size: 1rem;
         border: 1px solid #d2d2d7; border-radius: 8px; }
  ul.tasks { list-style: none; padding: 0; margin: 0; }
  li.task { display: flex; align-items: center; gap: .6rem;
         padding: .55rem .2rem; border-bottom: 1px solid #ececee; }
  li.task .title { flex: 1; }
  li.task.done .title { text-decoration: line-through; color: #a1a1a6; }
  li.task .id { font-size: .8rem; }
  form.inline { display: inline; margin: 0; }
  button { padding: .35rem .7rem; font-size: .9rem; border: 1px solid #d2d2d7;
         background: #f5f5f7; border-radius: 7px; cursor: pointer; }
  button.toggle { border: none; background: none; font-size: 1.1rem; padding: 0 .2rem; }
  button.danger { color: #c1121f; }
  a { color: #0066cc; text-decoration: none; }
  a:hover { text-decoration: underline; }
  label { font-size: .9rem; color: #515154; }
</style>
"""

_LIST_TEMPLATE = (
    """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Grail Tasks</title>"""
    + _STYLE
    + """</head><body>
<h1>Grail Tasks <span class="muted">&mdash; Flask running on GemStone</span></h1>

<form class="add" method="post" action="{{ url_for('ui_create') }}">
  <input type="text" name="title" placeholder="What needs doing?" required autofocus>
  <label><input type="checkbox" name="done"> done</label>
  <button type="submit">Add</button>
</form>

<ul class="tasks">
{% for t in tasks %}
  <li class="task{% if t.done %} done{% endif %}">
    <form class="inline" method="post" action="{{ url_for('ui_toggle', task_id=t.id) }}">
      <button type="submit" class="toggle" title="toggle done">{% if t.done %}&#9745;{% else %}&#9744;{% endif %}</button>
    </form>
    <span class="title">{{ t.title }}</span>
    <span class="id muted">#{{ t.id }}</span>
    <a href="{{ url_for('ui_edit', task_id=t.id) }}">edit</a>
    <form class="inline" method="post" action="{{ url_for('ui_delete', task_id=t.id) }}"
          onsubmit="return confirm('Delete this task?')">
      <button type="submit" class="danger">delete</button>
    </form>
  </li>
{% else %}
  <li class="muted">No tasks yet &mdash; add one above.</li>
{% endfor %}
</ul>

<p class="muted">{{ tasks|length }} task(s). The same data is available as JSON at
  <a href="{{ url_for('list_tasks') }}">{{ url_for('list_tasks') }}</a>.</p>
</body></html>
"""
)

_EDIT_TEMPLATE = (
    """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Edit task #{{ task.id }}</title>"""
    + _STYLE
    + """</head><body>
<h1>Edit task <span class="muted">#{{ task.id }}</span></h1>

<form method="post" action="{{ url_for('ui_edit', task_id=task.id) }}">
  <p><input type="text" name="title" value="{{ task.title }}" required autofocus
            style="width: 100%; padding: .45rem .6rem; font-size: 1rem;
                   border: 1px solid #d2d2d7; border-radius: 8px;"></p>
  <p><label><input type="checkbox" name="done"{% if task.done %} checked{% endif %}> done</label></p>
  <p><button type="submit">Save</button>
     &nbsp;<a href="{{ url_for('ui_index') }}">cancel</a></p>
</form>
</body></html>
"""
)


if __name__ == "__main__":
    main()
