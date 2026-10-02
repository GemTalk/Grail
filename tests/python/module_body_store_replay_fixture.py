"""A module-level store to the module's own class survives deployment.

    class A: ...
    A.later = ...                 # a name the class body did not define
    A.declared = ...              # a name it did
    setattr(A, 'via_setattr', 1)

These run in the module BODY, after the class statement, so they are stores to
an already-registered class.  Once the module was deployed, a fresh session
warm-binds it WITHOUT running the body, and the first and third stores were
gone -- Jinja2's ``Environment.template_class = Template`` made every
render_template_string fail outside the deploying gem, and ipaddress's
``IPv4Address._constants = _IPv4Constants`` made is_private raise (#1242).

Driven from tests/scripts/runModuleBodyStoreReplayTest.gs.  Running this file
directly checks the values under real CPython.
"""


class A:
    declared = "body"


A.later = "module-level"
A.declared = "reassigned at module level"
setattr(A, "via_setattr", 1)


def values():
    return (A.later, A.declared, A.via_setattr)


RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


if __name__ == '__main__':
    check('every_module_body_store_took',
          values(), ('module-level', 'reassigned at module level', 1))
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
