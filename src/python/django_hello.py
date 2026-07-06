# Minimal Django hello-world: no database, no installed apps.
# Reference: runs unmodified on CPython 3.14 and (goal) on Grail.

import django
from django.conf import settings

if not settings.configured:
    settings.configure(
        DEBUG=True,
        SECRET_KEY="grail-demo-key",
        ROOT_URLCONF=__name__,
        ALLOWED_HOSTS=["*"],
        INSTALLED_APPS=[],
        DATABASES={},
        USE_TZ=False,
        USE_I18N=False,
    )
    django.setup()

from django.http import HttpResponse, JsonResponse
from django.urls import path


def index(request):
    return HttpResponse("Hello from Django on Grail!")


def greet(request, name):
    return HttpResponse("Hello, %s!" % name)


def info(request):
    return JsonResponse({"framework": "django", "version": django.get_version()})


urlpatterns = [
    path("", index),
    path("greet/<name>/", greet),
    path("info/", info),
]


def run_wsgi(path_info="/"):
    """Drive one request through the full WSGI handler; return (status, headers, body)."""
    from django.core.wsgi import get_wsgi_application
    from io import BytesIO

    application = get_wsgi_application()
    environ = {
        "REQUEST_METHOD": "GET",
        "PATH_INFO": path_info,
        "SERVER_NAME": "localhost",
        "SERVER_PORT": "8000",
        "SERVER_PROTOCOL": "HTTP/1.1",
        "wsgi.version": (1, 0),
        "wsgi.url_scheme": "http",
        "wsgi.input": BytesIO(b""),
        "wsgi.errors": BytesIO(),
        "wsgi.multithread": False,
        "wsgi.multiprocess": False,
        "wsgi.run_once": True,
    }
    captured = {}

    def start_response(status, headers, exc_info=None):
        captured["status"] = status
        captured["headers"] = headers

    chunks = application(environ, start_response)
    body = b"".join(chunks)
    if hasattr(chunks, "close"):
        chunks.close()
    return captured["status"], captured["headers"], body


if __name__ == "__main__":
    status, headers, body = run_wsgi("/")
    print(status)
    print(body)
    status, headers, body = run_wsgi("/greet/World/")
    print(status)
    print(body)
    status, headers, body = run_wsgi("/info/")
    print(status)
    print(body)
