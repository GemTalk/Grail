"""A tiny CPython client for the grail_rest_demo REST API.

Run this under *real* CPython (not Grail) against a Grail-hosted server
to demonstrate cross-runtime interop: the server is Flask executing as
GemStone Smalltalk; the client is ordinary CPython speaking plain HTTP.
Only the standard library is used (``urllib``), so there is nothing to
install.

Start the server on the Grail side, e.g.::

    # in a Grail/Topaz session, or via `flask run`:
    from grail_rest_demo.app import create_app
    create_app().run(host="127.0.0.1", port=5000)

then point this client at it::

    python3 client.py                 # defaults to http://127.0.0.1:5000
    python3 client.py http://host:8000

It walks the same CRUD lifecycle the test suite exercises in-process and
prints each step, so you can watch a CPython program create, read,
update, and delete records that live in a GemStone repository.
"""

import json
import sys
import urllib.error
import urllib.request


class RestClient:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip("/")

    def _request(self, method, path, payload=None):
        url = self.base_url + path
        data = None
        headers = {"Accept": "application/json"}
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                body = resp.read().decode("utf-8")
                status = resp.status
                location = resp.headers.get("Location")
        except urllib.error.HTTPError as err:
            body = err.read().decode("utf-8")
            status = err.code
            location = None
        parsed = json.loads(body) if body else None
        return status, parsed, location

    def list_tasks(self):
        return self._request("GET", "/api/tasks")

    def create_task(self, title, done=False):
        return self._request("POST", "/api/tasks", {"title": title, "done": done})

    def get_task(self, task_id):
        return self._request("GET", "/api/tasks/%d" % task_id)

    def update_task(self, task_id, **fields):
        return self._request("PUT", "/api/tasks/%d" % task_id, fields)

    def delete_task(self, task_id):
        return self._request("DELETE", "/api/tasks/%d" % task_id)


def main(base_url):
    client = RestClient(base_url)
    print("Talking to %s" % client.base_url)

    status, created, location = client.create_task("Try the Grail REST demo")
    print("POST   /api/tasks            -> %s  id=%s  Location=%s"
          % (status, created and created.get("id"), location))
    task_id = created["id"]

    status, listing, _ = client.list_tasks()
    print("GET    /api/tasks            -> %s  count=%s"
          % (status, len(listing["tasks"])))

    status, task, _ = client.get_task(task_id)
    print("GET    /api/tasks/%d         -> %s  %s" % (task_id, status, task))

    status, task, _ = client.update_task(task_id, done=True)
    print("PUT    /api/tasks/%d         -> %s  done=%s"
          % (task_id, status, task and task.get("done")))

    status, missing, _ = client.get_task(99999)
    print("GET    /api/tasks/99999      -> %s  %s" % (status, missing))

    status, _, _ = client.delete_task(task_id)
    print("DELETE /api/tasks/%d         -> %s" % (task_id, status))

    status, gone, _ = client.get_task(task_id)
    print("GET    /api/tasks/%d         -> %s  %s" % (task_id, status, gone))


if __name__ == "__main__":
    base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5000"
    main(base)
