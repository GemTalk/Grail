# Grail http stdlib package — minimal stub.
#
# CPython's ``http`` package exposes HTTPStatus (IntEnum mapping
# numeric codes to enum members like HTTPStatus.OK, HTTPStatus.NOT_FOUND).
# Werkzeug.wrappers.response uses ``HTTPStatus`` for status-line
# normalization.
#
# Add HTTPStatus members as needed.  Each member behaves like an int
# (numeric value) with attributes for the reason phrase and
# description.


class HTTPStatus:
    """Minimal HTTPStatus shim — provides ``value'' / ``phrase'' /
    ``description'' attributes for the codes Werkzeug touches.  Real
    CPython HTTPStatus is an IntEnum with ~60 members; this stub
    instantiates a few common codes lazily."""

    def __init__(self, value, phrase, description=''):
        self.value = value
        self.phrase = phrase
        self.description = description
        self.name = phrase.upper().replace(' ', '_')

    def __int__(self):
        return self.value

    def __eq__(self, other):
        if isinstance(other, int):
            return self.value == other
        if isinstance(other, HTTPStatus):
            return self.value == other.value
        return NotImplemented

    def __repr__(self):
        return '<HTTPStatus.' + self.name + ': ' + str(self.value) + '>'


# Common codes pre-instantiated as class attributes.  Werkzeug
# references HTTPStatus.OK / HTTPStatus.NOT_FOUND / etc. — extend as
# needed.
HTTPStatus.OK = HTTPStatus(200, 'OK')
HTTPStatus.CREATED = HTTPStatus(201, 'Created')
HTTPStatus.NO_CONTENT = HTTPStatus(204, 'No Content')
HTTPStatus.MOVED_PERMANENTLY = HTTPStatus(301, 'Moved Permanently')
HTTPStatus.FOUND = HTTPStatus(302, 'Found')
HTTPStatus.NOT_MODIFIED = HTTPStatus(304, 'Not Modified')
HTTPStatus.BAD_REQUEST = HTTPStatus(400, 'Bad Request')
HTTPStatus.UNAUTHORIZED = HTTPStatus(401, 'Unauthorized')
HTTPStatus.FORBIDDEN = HTTPStatus(403, 'Forbidden')
HTTPStatus.NOT_FOUND = HTTPStatus(404, 'Not Found')
HTTPStatus.METHOD_NOT_ALLOWED = HTTPStatus(405, 'Method Not Allowed')
HTTPStatus.INTERNAL_SERVER_ERROR = HTTPStatus(500, 'Internal Server Error')
