# Upstream werkzeug __init__.py minus ``run_simple''.
# Grail doesn't ship ``werkzeug.serving'' (the dev-server is
# socket / threading heavy and out of scope for the M7 demo).
# When that lands the missing line is:
#   from .serving import run_simple as run_simple
from .test import Client as Client
from .wrappers import Request as Request
from .wrappers import Response as Response
