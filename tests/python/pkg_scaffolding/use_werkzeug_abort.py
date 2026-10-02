# werkzeug.exceptions.abort / Aborter carry their arguments, as upstream.
#
# Both raised ``cls()'' and dropped everything after the status, so
# ``abort(400, "age must be a whole number")'' -- Flask's standard way to
# refuse with a reason -- answered the generic "The browser sent a request
# that this server could not understand." for every code, and a form could
# not tell its user which field was wrong.  The Response form raised
# TypeError.
#
# Each function answers True when the behaviour matches Werkzeug 3.1 / Flask
# 3.1 under CPython 3.14, where these expectations were measured.  Not
# self-running: CPython's Flask is not installed where the fixture gate runs.
# The last check is the guard: abort with no description keeps the generic
# text.


def _raised(call):
    from werkzeug.exceptions import HTTPException
    try:
        call()
    except HTTPException as e:
        return e
    return None


def abort_carries_its_description():
    from werkzeug.exceptions import abort
    e = _raised(lambda: abort(400, 'age must be a whole number'))
    return e is not None and e.code == 400 and e.description == 'age must be a whole number'


def abort_carries_a_keyword_description():
    from werkzeug.exceptions import abort
    e = _raised(lambda: abort(404, description='no such policy'))
    return e is not None and e.code == 404 and e.description == 'no such policy'


def the_description_reaches_the_response_body():
    from werkzeug.exceptions import abort
    e = _raised(lambda: abort(400, 'age must be a whole number'))
    body = e.get_response().get_data(as_text=True)
    return 'age must be a whole number' in body


def an_aborter_carries_its_description():
    from werkzeug.exceptions import Aborter
    e = _raised(lambda: Aborter()(403, 'not yours'))
    return e is not None and e.code == 403 and e.description == 'not yours'


def abort_with_a_response_raises_it_wrapped():
    from werkzeug.exceptions import abort
    from werkzeug.wrappers import Response
    teapot = Response('short and stout', status=418)
    e = _raised(lambda: abort(teapot))
    return e is not None and e.get_response() is teapot


def an_unmapped_status_is_a_lookup_error():
    from werkzeug.exceptions import abort
    try:
        abort(599)
    except LookupError:
        return True
    return False


def method_not_allowed_takes_a_description():
    from werkzeug.exceptions import MethodNotAllowed
    e = MethodNotAllowed(['GET'], 'read-only')
    return e.valid_methods == ['GET'] and e.description == 'read-only'


def flask_abort_in_a_view_answers_with_its_description():
    from flask import Flask, abort
    app = Flask('zz_abort_with_description')

    @app.route('/age')
    def age():
        abort(400, 'age must be a whole number')

    response = app.test_client().get('/age')
    return (response.status_code == 400
            and 'age must be a whole number' in response.get_data(as_text=True))


def without_a_description_the_generic_text_stays():
    from werkzeug.exceptions import BadRequest, abort
    e = _raised(lambda: abort(400))
    return isinstance(e, BadRequest) and e.description == BadRequest.description
