# GRAIL wsgiref.util - environ helpers per PEP 3333.

from urllib.parse import quote

__all__ = ["FileWrapper", "guess_scheme", "application_uri", "request_uri",
           "shift_path_info", "setup_testing_defaults"]


class FileWrapper:
    """Iterate a file-like object in blocks (for WSGI responses)."""

    def __init__(self, filelike, blksize=8192):
        self.filelike = filelike
        self.blksize = blksize

    def __iter__(self):
        return self

    def __next__(self):
        data = self.filelike.read(self.blksize)
        if data:
            return data
        raise StopIteration

    def close(self):
        closer = getattr(self.filelike, "close", None)
        if closer is not None:
            closer()
        return None


def guess_scheme(environ):
    """Return 'https' if the environ says so, else 'http'."""
    if environ.get("HTTPS") in ("yes", "on", "1"):
        return "https"
    return "http"


def application_uri(environ):
    """The application's base URI (no PATH_INFO / QUERY_STRING)."""
    url = environ["wsgi.url_scheme"] + "://"
    host = environ.get("HTTP_HOST")
    if host:
        url = url + host
    else:
        url = url + environ["SERVER_NAME"]
        port = environ["SERVER_PORT"]
        if environ["wsgi.url_scheme"] == "https":
            if port != "443":
                url = url + ":" + port
        else:
            if port != "80":
                url = url + ":" + port
    url = url + quote(environ.get("SCRIPT_NAME") or "/", "/%")
    return url


def request_uri(environ, include_query=True):
    """The full request URI, optionally including the query string."""
    url = application_uri(environ)
    path_info = quote(environ.get("PATH_INFO", ""), "/%")
    if not environ.get("SCRIPT_NAME"):
        url = url + path_info[1:]
    else:
        url = url + path_info
    if include_query and environ.get("QUERY_STRING"):
        url = url + "?" + environ["QUERY_STRING"]
    return url


def shift_path_info(environ):
    """Shift one path segment from PATH_INFO to SCRIPT_NAME.  Returns
    the shifted segment, or None when PATH_INFO is empty."""
    path_info = environ.get("PATH_INFO", "")
    if not path_info:
        return None
    path_parts = path_info.split("/")
    # Collapse interior empty segments ('//') but keep leading/trailing.
    cleaned = [path_parts[0]]
    i = 1
    last = len(path_parts) - 1
    while i <= last:
        if path_parts[i] != "" or i == last:
            cleaned.append(path_parts[i])
        i = i + 1
    path_parts = cleaned
    name = path_parts[1]
    del path_parts[1]
    script_name = environ.get("SCRIPT_NAME", "")
    script_name = script_name.rstrip("/")
    if name == ".":
        name = None
    else:
        script_name = script_name + "/" + name
    environ["SCRIPT_NAME"] = script_name
    rest = "/".join(path_parts)
    if rest == "" and name is not None:
        environ["PATH_INFO"] = ""
    else:
        environ["PATH_INFO"] = rest
    return name


def setup_testing_defaults(environ):
    """Fill in the WSGI keys a test environ needs (PEP 3333 defaults)."""
    defaults = {
        "SERVER_NAME": "127.0.0.1",
        "SERVER_PORT": "80",
        "SERVER_PROTOCOL": "HTTP/1.0",
        "HTTP_HOST": "127.0.0.1",
        "REQUEST_METHOD": "GET",
        "SCRIPT_NAME": "",
        "PATH_INFO": "/",
        "wsgi.url_scheme": "http",
        "wsgi.version": (1, 0),
        "wsgi.run_once": False,
        "wsgi.multithread": False,
        "wsgi.multiprocess": False,
    }
    for key in defaults:
        if key not in environ:
            environ[key] = defaults[key]
    return None
