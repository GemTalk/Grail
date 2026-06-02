# Fixture exercising the grail_rest_demo REST API (src/python/grail_rest_demo).
#
# Drives the full CRUD lifecycle of the demo app through Flask's
# in-process test client and returns a flat dict of observations the
# Smalltalk test asserts on.  This is the end-to-end proof that the demo
# -- and the Flask features it leans on (routing + int converter, JSON
# request/response, tuple (body, status[, headers]) returns, abort()
# with @app.errorhandler, and url_for) -- works on Grail.


def _create_app():
    from src.python.grail_rest_demo.app import create_app

    return create_app


def crud_lifecycle():
    import json

    create_app = _create_app()
    app = create_app(seed=False)
    client = app.test_client()
    out = {}

    # --- create -----------------------------------------------------------
    r = client.post(
        "/api/tasks",
        data=json.dumps({"title": "write demo"}),
        content_type="application/json",
    )
    out["create_status"] = r.status_code
    created = json.loads(r.get_data(as_text=True))
    out["create_id"] = created.get("id")
    out["create_title"] = created.get("title")
    out["create_location"] = r.headers.get("Location")
    tid = created["id"]

    # --- list --------------------------------------------------------------
    r = client.get("/api/tasks")
    out["list_status"] = r.status_code
    out["list_count"] = len(json.loads(r.get_data(as_text=True))["tasks"])

    # --- read one ----------------------------------------------------------
    r = client.get("/api/tasks/%d" % tid)
    out["get_status"] = r.status_code
    out["get_title"] = json.loads(r.get_data(as_text=True))["title"]

    # --- update ------------------------------------------------------------
    r = client.put(
        "/api/tasks/%d" % tid,
        data=json.dumps({"done": True}),
        content_type="application/json",
    )
    out["put_status"] = r.status_code
    out["put_done"] = json.loads(r.get_data(as_text=True))["done"]

    # --- read missing -> JSON 404 (exercises @app.errorhandler) -----------
    r = client.get("/api/tasks/999")
    out["missing_status"] = r.status_code
    out["missing_error"] = json.loads(r.get_data(as_text=True)).get("error")

    # --- bad create -> JSON 400 -------------------------------------------
    r = client.post(
        "/api/tasks", data=json.dumps({}), content_type="application/json"
    )
    out["bad_status"] = r.status_code
    out["bad_error"] = json.loads(r.get_data(as_text=True)).get("error")

    # --- delete, then confirm it's gone -----------------------------------
    r = client.delete("/api/tasks/%d" % tid)
    out["delete_status"] = r.status_code
    r = client.get("/api/tasks/%d" % tid)
    out["after_delete_status"] = r.status_code

    # --- index uses url_for ------------------------------------------------
    r = client.get("/api")
    out["index_tasks_url"] = json.loads(r.get_data(as_text=True)).get("tasks_url")

    return out


def html_ui_flow():
    # Drive the server-rendered HTML UI the way a browser would: GET the
    # list page, then POST plain HTML forms to create / toggle / edit /
    # delete.  Proves the UI shares the SAME store as the REST API (we read
    # results back through /api/tasks) and that Jinja auto-escapes titles.
    import json

    create_app = _create_app()
    app = create_app(seed=False)
    client = app.test_client()
    out = {}

    def api_tasks():
        return json.loads(client.get("/api/tasks").get_data(as_text=True))["tasks"]

    # empty list page renders with the "no tasks" prompt
    r = client.get("/")
    out["empty_status"] = r.status_code
    out["empty_prompt"] = "No tasks yet" in r.get_data(as_text=True)

    # create via form POST -> redirect (POST/redirect/GET)
    r = client.post("/tasks", data={"title": "buy milk"})
    out["create_status"] = r.status_code
    out["create_redirects"] = r.headers.get("Location") is not None

    # the new task shows on the list page
    out["list_shows_task"] = "buy milk" in client.get("/").get_data(as_text=True)

    # a title with HTML metacharacters is escaped, not injected
    client.post("/tasks", data={"title": "<b>x</b>"})
    body = client.get("/").get_data(as_text=True)
    out["title_escaped"] = ("&lt;b&gt;x&lt;/b&gt;" in body) and ("<b>x</b>" not in body)

    # the UI and the API see the same data
    tasks = api_tasks()
    out["api_count"] = len(tasks)
    first_id = tasks[0]["id"]

    # toggle done via form POST
    client.post("/tasks/%d/toggle" % first_id)
    out["toggled_done"] = api_tasks()[0]["done"]

    # edit form (GET) is pre-filled from the store
    r = client.get("/tasks/%d/edit" % first_id)
    out["edit_status"] = r.status_code
    out["edit_prefilled"] = 'value="buy milk"' in r.get_data(as_text=True)

    # edit (POST) updates the title
    client.post(
        "/tasks/%d/edit" % first_id, data={"title": "buy oat milk", "done": "on"}
    )
    out["edited_title"] = api_tasks()[0]["title"]

    # delete via form POST
    client.post("/tasks/%d/delete" % first_id)
    out["after_delete_count"] = len(api_tasks())

    return out


def serving_over_socket():
    # Serve the demo on a REAL TCP socket the way main() does -- the
    # single-threaded dev server with CloseAfterResponseHandler -- and drive
    # the browser path over actual HTTP: GET / renders the multi-line Jinja
    # list page (with url_for), a form POST to /tasks creates a task and
    # redirects, and GET / then shows it.
    #
    # Crucially, the requests are sent WITHOUT "Connection: close" (the way a
    # browser sends HTTP/1.1 keep-alive).  With werkzeug's default handler the
    # single-threaded server would park reading the kept-alive connection and
    # the next request -- on its own fresh connection -- would hang forever.
    # CloseAfterResponseHandler serves one request per connection, so the
    # recv() loop terminating here IS the proof that the connection was
    # closed.  The GET / response must also advertise "Connection: close".
    from src.python.grail_rest_demo.app import CloseAfterResponseHandler
    from werkzeug.serving import make_server
    import socket

    create_app = _create_app()
    app = create_app(seed=False)
    server = make_server(
        "127.0.0.1", 0, app, request_handler=CloseAfterResponseHandler
    )
    port = server.server_port

    def req(raw):
        # Each request is its own connection with NO "Connection: close".
        c = socket.socket()
        c.connect(("127.0.0.1", port))
        c.sendall(raw)
        server.handle_request()
        data = b""
        while True:
            chunk = c.recv(8192)
            if not chunk:
                break
            data += chunk
        c.close()
        return data.decode("latin-1")

    r1 = req(b"GET / HTTP/1.1\r\nHost: x\r\n\r\n")
    form = "title=socktask"
    r2 = req(
        (
            "POST /tasks HTTP/1.1\r\nHost: x\r\n"
            "Content-Type: application/x-www-form-urlencoded\r\nContent-Length: "
            + str(len(form)) + "\r\n\r\n" + form
        ).encode("latin-1")
    )
    r3 = req(b"GET / HTTP/1.1\r\nHost: x\r\n\r\n")
    server.server_close()

    return {
        "get_status": r1.split("\r\n", 1)[0],
        "empty_prompt": "No tasks yet" in r1,
        "closes_connection": "connection: close" in r1.lower(),
        "post_status": r2.split("\r\n", 1)[0],
        "shows_after_post": "socktask" in r3,
    }
