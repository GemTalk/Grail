# Grail http stdlib package.
#
# CPython's ``http`` package exposes ``HTTPStatus``, an ``IntEnum``
# mapping numeric status codes to enum members (``HTTPStatus.OK``,
# ``HTTPStatus.NOT_FOUND``, ...).  Each member is simultaneously an int
# (its numeric value) and carries ``.phrase`` / ``.description`` / ``.name``.
#
# # HTTPStatus is a real int-like number
# GemStone forbids subclassing ``Integer`` (Python ``int``), but
# ``Number`` is subclassable.  Grail's ``AbstractPyInt`` (a ``Number``
# subclass) implements the kernel coercion protocol so it behaves as a
# plain integer by value while carrying per-instance attributes.
# ``HTTPStatus`` subclasses it, so members ARE ints:
# ``isinstance(HTTPStatus.OK, int)`` is True, comparisons/arithmetic/
# hashing all work (inherited), and ``200 == HTTPStatus.OK`` works in
# both operand orders.  See ``src/smalltalk/Python/AbstractPyInt.gs``.
#
# Remaining nuance: ``HTTPStatus(404)`` value-lookup returns an equal
# member but not the *same* object as ``HTTPStatus.NOT_FOUND`` (no
# ``is`` identity), because Grail does not dispatch a user-defined
# ``__new__`` on construction.

__all__ = ['HTTPStatus']

# value -> member registry, populated by the build branch of __init__.
_value_map = {}


class HTTPStatus(AbstractPyInt):
    """An HTTP status code — a real int-like value (subclass of the
    Grail ``AbstractPyInt`` Number base) carrying extra ``.phrase`` /
    ``.description`` / ``.name`` attributes.

    Because it is an ``AbstractPyInt``, ``isinstance(HTTPStatus.OK, int)``
    is True and all comparison/arithmetic/hashing behave like an int
    (inherited from the base; arithmetic coerces to a plain int, so
    ``HTTPStatus.OK + 1`` is ``201``, matching CPython's IntEnum).

    Construct-by-value (``HTTPStatus(404)``) looks the code up in the
    registry; the four-argument form builds and registers a member."""

    def __init__(self, value, phrase=None, description=''):
        if phrase is None:
            # Lookup form: HTTPStatus(code) -> copy of the registered member.
            member = _value_map.get(value)
            if member is None:
                raise ValueError('%s is not a valid HTTPStatus' % value)
            self.value = member.value
            self.phrase = member.phrase
            self.description = member.description
            self.name = member.name
        else:
            # Build form: create + register a new member.  self.value is
            # stored as a dynamic instVar that the AbstractPyInt numeric
            # protocol (truncated/_generality/comparison) reads.
            self.value = value
            self.phrase = phrase
            self.description = description
            self.name = phrase.upper().replace(' ', '_').replace('-', '_').replace("'", '')
            _value_map[value] = self

    def __repr__(self):
        # Overrides AbstractPyInt's value-based repr to show the symbolic
        # name.  (__int__/__index__/__hash__/__str__/comparisons and
        # arithmetic are all inherited from AbstractPyInt.)
        return '<HTTPStatus.' + self.name + ': ' + str(self.value) + '>'


# ---------------------------------------------------------------------------
# The standard status codes (CPython's http.HTTPStatus member set).
# ---------------------------------------------------------------------------

# 1xx informational
HTTPStatus.CONTINUE = HTTPStatus(100, 'Continue', 'Request received, please continue')
HTTPStatus.SWITCHING_PROTOCOLS = HTTPStatus(101, 'Switching Protocols', 'Switching to new protocol; obey Upgrade header')
HTTPStatus.PROCESSING = HTTPStatus(102, 'Processing')
HTTPStatus.EARLY_HINTS = HTTPStatus(103, 'Early Hints')

# 2xx success
HTTPStatus.OK = HTTPStatus(200, 'OK', 'Request fulfilled, document follows')
HTTPStatus.CREATED = HTTPStatus(201, 'Created', 'Document created, URL follows')
HTTPStatus.ACCEPTED = HTTPStatus(202, 'Accepted', 'Request accepted, processing continues off-line')
HTTPStatus.NON_AUTHORITATIVE_INFORMATION = HTTPStatus(203, 'Non-Authoritative Information', 'Request fulfilled from cache')
HTTPStatus.NO_CONTENT = HTTPStatus(204, 'No Content', 'Request fulfilled, nothing follows')
HTTPStatus.RESET_CONTENT = HTTPStatus(205, 'Reset Content', 'Clear input form for further input')
HTTPStatus.PARTIAL_CONTENT = HTTPStatus(206, 'Partial Content', 'Partial content follows')
HTTPStatus.MULTI_STATUS = HTTPStatus(207, 'Multi-Status')
HTTPStatus.ALREADY_REPORTED = HTTPStatus(208, 'Already Reported')
HTTPStatus.IM_USED = HTTPStatus(226, 'IM Used')

# 3xx redirection
HTTPStatus.MULTIPLE_CHOICES = HTTPStatus(300, 'Multiple Choices', 'Object has several resources -- see URI list')
HTTPStatus.MOVED_PERMANENTLY = HTTPStatus(301, 'Moved Permanently', 'Object moved permanently -- see URI list')
HTTPStatus.FOUND = HTTPStatus(302, 'Found', 'Object moved temporarily -- see URI list')
HTTPStatus.SEE_OTHER = HTTPStatus(303, 'See Other', 'Object moved -- see Method and URL list')
HTTPStatus.NOT_MODIFIED = HTTPStatus(304, 'Not Modified', 'Document has not changed since given time')
HTTPStatus.USE_PROXY = HTTPStatus(305, 'Use Proxy', 'You must use proxy specified in Location to access this resource')
HTTPStatus.TEMPORARY_REDIRECT = HTTPStatus(307, 'Temporary Redirect', 'Object moved temporarily -- see URI list')
HTTPStatus.PERMANENT_REDIRECT = HTTPStatus(308, 'Permanent Redirect', 'Object moved permanently -- see URI list')

# 4xx client error
HTTPStatus.BAD_REQUEST = HTTPStatus(400, 'Bad Request', 'Bad request syntax or unsupported method')
HTTPStatus.UNAUTHORIZED = HTTPStatus(401, 'Unauthorized', 'No permission -- see authorization schemes')
HTTPStatus.PAYMENT_REQUIRED = HTTPStatus(402, 'Payment Required', 'No payment -- see charging schemes')
HTTPStatus.FORBIDDEN = HTTPStatus(403, 'Forbidden', 'Request forbidden -- authorization will not help')
HTTPStatus.NOT_FOUND = HTTPStatus(404, 'Not Found', 'Nothing matches the given URI')
HTTPStatus.METHOD_NOT_ALLOWED = HTTPStatus(405, 'Method Not Allowed', 'Specified method is invalid for this resource')
HTTPStatus.NOT_ACCEPTABLE = HTTPStatus(406, 'Not Acceptable', 'URI not available in preferred format')
HTTPStatus.PROXY_AUTHENTICATION_REQUIRED = HTTPStatus(407, 'Proxy Authentication Required', 'You must authenticate with this proxy before proceeding')
HTTPStatus.REQUEST_TIMEOUT = HTTPStatus(408, 'Request Timeout', 'Request timed out; try again later')
HTTPStatus.CONFLICT = HTTPStatus(409, 'Conflict', 'Request conflict')
HTTPStatus.GONE = HTTPStatus(410, 'Gone', 'URI no longer exists and has been permanently removed')
HTTPStatus.LENGTH_REQUIRED = HTTPStatus(411, 'Length Required', 'Client must specify Content-Length')
HTTPStatus.PRECONDITION_FAILED = HTTPStatus(412, 'Precondition Failed', 'Precondition in headers is false')
HTTPStatus.REQUEST_ENTITY_TOO_LARGE = HTTPStatus(413, 'Request Entity Too Large', 'Entity is too large')
HTTPStatus.REQUEST_URI_TOO_LONG = HTTPStatus(414, 'Request-URI Too Long', 'URI is too long')
HTTPStatus.UNSUPPORTED_MEDIA_TYPE = HTTPStatus(415, 'Unsupported Media Type', 'Entity body in unsupported format')
HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE = HTTPStatus(416, 'Requested Range Not Satisfiable', 'Cannot satisfy request range')
HTTPStatus.EXPECTATION_FAILED = HTTPStatus(417, 'Expectation Failed', 'Expect condition could not be satisfied')
HTTPStatus.IM_A_TEAPOT = HTTPStatus(418, "I'm a Teapot", 'Server refuses to brew coffee because it is a teapot.')
HTTPStatus.MISDIRECTED_REQUEST = HTTPStatus(421, 'Misdirected Request', 'Server is not able to produce a response')
HTTPStatus.UNPROCESSABLE_ENTITY = HTTPStatus(422, 'Unprocessable Entity')
HTTPStatus.LOCKED = HTTPStatus(423, 'Locked')
HTTPStatus.FAILED_DEPENDENCY = HTTPStatus(424, 'Failed Dependency')
HTTPStatus.TOO_EARLY = HTTPStatus(425, 'Too Early')
HTTPStatus.UPGRADE_REQUIRED = HTTPStatus(426, 'Upgrade Required')
HTTPStatus.PRECONDITION_REQUIRED = HTTPStatus(428, 'Precondition Required', 'The origin server requires the request to be conditional')
HTTPStatus.TOO_MANY_REQUESTS = HTTPStatus(429, 'Too Many Requests', 'The user has sent too many requests in a given amount of time')
HTTPStatus.REQUEST_HEADER_FIELDS_TOO_LARGE = HTTPStatus(431, 'Request Header Fields Too Large', 'The server is unwilling to process the request')
HTTPStatus.UNAVAILABLE_FOR_LEGAL_REASONS = HTTPStatus(451, 'Unavailable For Legal Reasons', 'The server is denying access to the resource as a consequence of a legal demand')

# 5xx server error
HTTPStatus.INTERNAL_SERVER_ERROR = HTTPStatus(500, 'Internal Server Error', 'Server got itself in trouble')
HTTPStatus.NOT_IMPLEMENTED = HTTPStatus(501, 'Not Implemented', 'Server does not support this operation')
HTTPStatus.BAD_GATEWAY = HTTPStatus(502, 'Bad Gateway', 'Invalid responses from another server/proxy')
HTTPStatus.SERVICE_UNAVAILABLE = HTTPStatus(503, 'Service Unavailable', 'The server cannot process the request due to a high load')
HTTPStatus.GATEWAY_TIMEOUT = HTTPStatus(504, 'Gateway Timeout', 'The gateway server did not receive a timely response')
HTTPStatus.HTTP_VERSION_NOT_SUPPORTED = HTTPStatus(505, 'HTTP Version Not Supported', 'Cannot fulfill request')
HTTPStatus.VARIANT_ALSO_NEGOTIATES = HTTPStatus(506, 'Variant Also Negotiates')
HTTPStatus.INSUFFICIENT_STORAGE = HTTPStatus(507, 'Insufficient Storage')
HTTPStatus.LOOP_DETECTED = HTTPStatus(508, 'Loop Detected')
HTTPStatus.NOT_EXTENDED = HTTPStatus(510, 'Not Extended')
HTTPStatus.NETWORK_AUTHENTICATION_REQUIRED = HTTPStatus(511, 'Network Authentication Required', 'The client needs to authenticate to gain network access')
