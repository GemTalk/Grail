# sys.audit(event, *args) -- CPython's signature is VARIADIC, and Grail's was a
# zero-argument stub, so every real call was a TypeError:
#
#     TypeError: audit() takes a different number of arguments (4 given)
#
# urllib3's HTTPConnection._new_conn opens with exactly such a call
# (urllib3/connection.py: sys.audit('http.client.connect', self, host, port)),
# which stopped a Kaggle-client acceptance harness dead.
#
# WHAT THESE CHECKS DO AND DO NOT ESTABLISH.  They establish that events are
# ACCEPTED and DISCARDED.  They do not establish that auditing works, because it
# does not: Grail raises no audit events of its own and dispatches none of the
# ones it is handed.  That is not an approximation of CPython -- it is CPython's
# exact behaviour when the audit-hook list is empty, and sys.addaudithook()
# refusing to install one (the documented-limit check at the bottom) is what
# guarantees the list stays empty.  So the OBSERVABLE answers below agree with
# CPython on both runtimes; a caller must not read that as "hooks fire".
#
# The argument-validation checks are the negative control: a stub that swallowed
# anything at all would pass the acceptance checks above them and still be
# wrong, since a caller that misuses sys.audit should hear the same complaint
# on both runtimes.

import sys


def the_urllib3_call_is_accepted():
    """The exact shape urllib3 writes -- an event name and three arguments."""
    return sys.audit('http.client.connect', 'conn', 'example.com', 80) is None


def a_one_argument_call_is_accepted():
    """The event alone is the whole required signature."""
    return sys.audit('grail.test.event') is None


def many_arguments_are_accepted():
    """Variadic means variadic: no arity is special."""
    return (sys.audit('e', 1) is None
            and sys.audit('e', 1, 2) is None
            and sys.audit('e', 1, 2, 3, 4, 5, 6, 7, 8) is None)


def it_answers_none_not_a_marker():
    """CPython's sys.audit has no return value at all.  A stub answering
    something truthy would let a caller branch on "auditing is on"."""
    return sys.audit('e') is None


def it_is_a_first_class_callable():
    """Libraries cache it (``_audit = sys.audit'') rather than looking it up on
    every call, so the NAME has to be a callable value and not only a
    call-site."""
    hook = sys.audit
    return callable(hook) is True and hook('e', 1, 2) is None


def getattr_finds_it():
    """And the defensive spelling, which is how a library that must run on a
    pre-3.8 interpreter reaches it."""
    fn = getattr(sys, 'audit', None)
    return fn is not None and fn('e') is None


def a_non_str_event_is_refused():
    """NEGATIVE CONTROL.  A stub that accepted absolutely anything would pass
    every check above it and still be wrong; CPython type-checks argument 1."""
    try:
        sys.audit(42)
        return False
    except TypeError as e:
        return 'must be str' in str(e)


def keyword_arguments_are_refused():
    """NEGATIVE CONTROL, the other half: CPython's sys.audit takes none."""
    try:
        sys.audit('e', x=1)
        return False
    except TypeError as e:
        return 'keyword' in str(e)


def installing_an_audit_hook_is_refused():
    """DOCUMENTED GRAIL LIMIT -- CPython is expected to disagree here, and
    that disagreement is the point.

    CPython installs the hook and returns None.  Grail has no dispatch to hand
    it to, so accepting it would tell a caller that auditing is on when it is
    off -- the one answer worse than an error.  It refuses instead, which is
    also what makes the no-op sys.audit above exactly right rather than merely
    convenient: the hook list can never be non-empty.
    """
    def hook(event, args):
        pass

    try:
        sys.addaudithook(hook)
        return False
    except RuntimeError as e:
        return 'raises no audit events' in str(e)


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        the_urllib3_call_is_accepted,
        a_one_argument_call_is_accepted,
        many_arguments_are_accepted,
        it_answers_none_not_a_marker,
        it_is_a_first_class_callable,
        getattr_finds_it,
        a_non_str_event_is_refused,
        keyword_arguments_are_refused,
    ]
    grail_only = [
        installing_an_audit_hook_is_refused,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
    # This asserts a Grail LIMITATION, so CPython is expected to disagree.
    # XFAIL is that expected disagreement and is not a failure;  XPASS would
    # mean CPython now refuses an audit hook too, i.e. the check no longer
    # documents a difference.  Run LAST: under CPython it really does install
    # the (do-nothing) hook, and hooks cannot be removed.
    print('--- documented Grail limits: CPython is expected to differ ---')
    for fn in grail_only:
        print('%-5s %s' % ('XPASS' if fn() is True else 'XFAIL', fn.__name__))
