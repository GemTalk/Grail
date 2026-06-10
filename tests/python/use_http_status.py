# Fixture for HttpStatusTestCase.
#
# Exercises http.HTTPStatus: member attribute access, int-like
# behavior (int(), forward and reverse comparison), value lookup,
# hashing, repr/str, and the name-derivation edge cases (apostrophe,
# hyphen).  Results are stashed in the module-level dict ``r`` which
# the Smalltalk test case reads back key by key.

# Force a fresh read of http/__init__.py from disk: sys.modules is
# committed, so a prior session may have cached an older ``http``.
# importlib.reload re-executes __file__ in place (unlike evict+import,
# which is broken in Grail).
import importlib
import http
importlib.reload(http)
HTTPStatus = http.HTTPStatus

r = {}

# --- member attributes ----------------------------------------------
r['ok_value'] = HTTPStatus.OK.value
r['ok_phrase'] = HTTPStatus.OK.phrase
r['ok_name'] = HTTPStatus.OK.name
r['nf_value'] = HTTPStatus.NOT_FOUND.value
r['nf_phrase'] = HTTPStatus.NOT_FOUND.phrase
r['nf_desc'] = HTTPStatus.NOT_FOUND.description

# --- int() / coverage of 1xx and 5xx members ------------------------
r['int_nf'] = int(HTTPStatus.NOT_FOUND)
r['continue_value'] = HTTPStatus.CONTINUE.value
r['gateway_timeout'] = HTTPStatus.GATEWAY_TIMEOUT.value

# --- forward comparisons (member on the left) -----------------------
r['eq_int'] = (HTTPStatus.OK == 200)
r['eq_member'] = (HTTPStatus.OK == HTTPStatus.OK)
r['eq_wrong'] = (HTTPStatus.OK == 404)
r['lt'] = (HTTPStatus.OK < HTTPStatus.NOT_FOUND)
r['le'] = (HTTPStatus.OK <= 200)
r['gt'] = (HTTPStatus.NOT_FOUND > HTTPStatus.OK)
r['ge'] = (HTTPStatus.NOT_FOUND >= 404)
r['ne'] = (HTTPStatus.OK != 404)

# --- reverse comparisons (int on the left) --------------------------
# Exercises Grail's Integer dunder __index__ fallback for a non-Number
# right operand.
r['req_eq'] = (200 == HTTPStatus.OK)
r['req_lt'] = (200 < HTTPStatus.NOT_FOUND)
r['req_le'] = (200 <= HTTPStatus.OK)

# --- hash equals the plain int's hash -------------------------------
r['hash_eq'] = (hash(HTTPStatus.OK) == hash(200))

# --- value lookup: HTTPStatus(code) ---------------------------------
r['lookup_phrase'] = HTTPStatus(404).phrase
r['lookup_eq'] = (HTTPStatus(404) == HTTPStatus.NOT_FOUND)
r['lookup_value'] = HTTPStatus(500).value

# --- invalid lookup raises ValueError -------------------------------
try:
    HTTPStatus(999)
    r['invalid_raises'] = False
except ValueError:
    r['invalid_raises'] = True

# --- repr / str -----------------------------------------------------
r['repr'] = repr(HTTPStatus.NOT_FOUND)
r['str'] = str(HTTPStatus.OK)

# --- now a real int (AbstractPyInt subclass) ------------------------
r['is_int'] = isinstance(HTTPStatus.OK, int)
r['plain_is_int'] = isinstance(200, int)        # sanity: real ints still pass
r['str_not_int'] = isinstance('x', int)         # sanity: non-ints still fail
r['plus_one'] = HTTPStatus.OK + 1               # 201 (arithmetic -> plain int)
r['hundred_plus'] = 100 + HTTPStatus.OK         # 300 (reverse operand)

# --- name-derivation edge cases -------------------------------------
r['teapot_value'] = HTTPStatus.IM_A_TEAPOT.value
r['teapot_phrase'] = HTTPStatus.IM_A_TEAPOT.phrase
r['teapot_name'] = HTTPStatus.IM_A_TEAPOT.name
r['hyphen_name'] = HTTPStatus.NON_AUTHORITATIVE_INFORMATION.name
r['multi_status_name'] = HTTPStatus.MULTI_STATUS.name
