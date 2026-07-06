# Fixture for DjangoTestCase — a Django hello-world served through the
# full WSGI application entry point (``application(environ,
# start_response)``), the same path ``django.test.Client`` drives.
# Exercises settings.configure + django.setup(), URL routing with a
# path converter, the WSGI handler / middleware chain, the view, and
# HttpResponse / JsonResponse materialisation.
#
# django.setup() is process-global and can only run once, so all
# routes are registered up front and each helper drives one request.

import django
from django.conf import settings

if not settings.configured:
    settings.configure(
        DEBUG=False,
        SECRET_KEY="grail-django-test-key",
        ROOT_URLCONF=__name__,
        ALLOWED_HOSTS=["*"],
        INSTALLED_APPS=[],
        DATABASES={},
        USE_TZ=False,
        USE_I18N=False,
        LOGGING_CONFIG=None,
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


def _drive(path_info):
    """Drive one GET request through the WSGI application; return
    [status, body_text]."""
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
    captured = []

    def start_response(status, headers, exc_info=None):
        captured.append(status)

    chunks = application(environ, start_response)
    body = b"".join(chunks)
    if hasattr(chunks, "close"):
        chunks.close()
    return [captured[0], body.decode("utf-8")]


def hello_index():
    return _drive("/")


def hello_greet():
    return _drive("/greet/World/")


def hello_info():
    return _drive("/info/")


def django_version():
    return django.get_version()
