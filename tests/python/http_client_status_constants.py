"""http.client's status constants and its full responses map.

CPython's http.client ends its header block with two "backwards
compatibility" hacks:

    globals().update(http.HTTPStatus.__members__)
    responses = {v: v.phrase for v in http.HTTPStatus.__members__.values()}

so every status is a module constant (``http.client.OK'') and ``responses''
names every status.  Grail's hand-written http.client had neither: its
responses held a 35-code subset and no constant existed.  google-auth's
tests read ``http_client.OK'', ``.UNAUTHORIZED'' and a dozen more, and every
one of its test modules failed to collect.

Every expectation was measured against CPython 3.14.
"""

import http
import http.client as http_client

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


check('google_auths_constants',
      [http_client.OK, http_client.UNAUTHORIZED, http_client.BAD_REQUEST,
       http_client.INTERNAL_SERVER_ERROR, http_client.SERVICE_UNAVAILABLE,
       http_client.NOT_FOUND, http_client.UPGRADE_REQUIRED,
       http_client.TOO_MANY_REQUESTS, http_client.BAD_GATEWAY,
       http_client.GATEWAY_TIMEOUT, http_client.REQUEST_TIMEOUT,
       http_client.FORBIDDEN],
      [200, 401, 400, 500, 503, 404, 426, 429, 502, 504, 408, 403])
check('a_constant_is_the_status_member',
      (repr(http_client.NOT_FOUND), http_client.NOT_FOUND is http.HTTPStatus.NOT_FOUND),
      ('<HTTPStatus.NOT_FOUND: 404>', True))
check('every_member_is_a_module_constant',
      [name for name, member in http.HTTPStatus.__members__.items()
       if getattr(http_client, name, None) is not member],
      [])
check('responses_names_every_status',
      sorted(http_client.responses) == sorted(http.HTTPStatus), True)
check('responses_maps_a_code_to_its_phrase',
      [http_client.responses[500], http_client.responses[418],
       http_client.responses.get(429), http_client.responses.get(999)],
      ['Internal Server Error', "I'm a Teapot", 'Too Many Requests', None])

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
