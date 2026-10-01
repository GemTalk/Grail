"""A Flask view that raises answers 500 and the server keeps serving (#1221).

It used to END THE PROCESS.  Flask's error path logs the exception through
app.logger, whose default handler formats ``%(module)s''; Grail's LogRecord
had no such field, and the missing ``%(key)s'' was an uncatchable Smalltalk
LookupError (#1220).  Past that, werkzeug's InternalServerError took no
keyword arguments, so Flask's ``InternalServerError(original_exception=e)''
raised a second, unrelated TypeError in place of the 500.

Not self-running: CPython's Flask is not installed where the fixture gate runs.
Driven from FlaskViewRaisingTestCase.  Expectations are CPython 3.14 with
Flask 3.1's documented behaviour: a logged traceback, then 500.
"""

import io
import logging

from flask import Flask
from flask.logging import default_handler

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


app = Flask('zz_raising_view')


@app.route('/boom')
def boom():
    return {'x': 1 / 0}


@app.route('/ok')
def ok():
    return 'fine'


# app.logger is created on first access, and that is when Flask decides
# whether to add its default handler: only if nothing up the logger chain
# already handles the level.  So establish "nothing does" for that moment
# rather than assume it -- the root logger is session-wide, and another test
# may have left a handler on it.
_saved_root_handlers = list(logging.getLogger().handlers)
logging.getLogger().handlers[:] = []
try:
    _app_logger = app.logger
finally:
    logging.getLogger().handlers[:] = _saved_root_handlers

captured = io.StringIO()
capture = logging.StreamHandler(captured)
capture.setFormatter(logging.Formatter('%(levelname)s in %(module)s: %(message)s'))
app.logger.addHandler(capture)

response = app.test_client().get('/boom')
check('a_view_that_raises_answers_500', response.status_code, 500)
check('the_exception_is_logged_with_its_traceback',
      ('ERROR in app: Exception on /boom [GET]' in captured.getvalue(),
       'ZeroDivisionError: division by zero' in captured.getvalue()),
      (True, True))
check('the_server_keeps_serving_after_it',
      app.test_client().get('/ok').get_data(as_text=True), 'fine')
check('flask_installs_its_default_handler_when_nothing_handles_the_logger',
      default_handler in app.logger.handlers, True)

# With a handler on the ROOT logger -- what basicConfig installs -- Flask must
# find it by walking .parent and NOT add its own.  The chain used to stop at
# None, so it always did.
_root_handler = logging.StreamHandler(io.StringIO())
logging.getLogger().addHandler(_root_handler)
try:
    second = Flask('zz_raising_view_with_root_handler')
    check('flask_does_not_add_its_handler_when_root_has_one',
          default_handler in second.logger.handlers, False)
finally:
    logging.getLogger().removeHandler(_root_handler)
