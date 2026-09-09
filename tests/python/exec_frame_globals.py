"""A frame built by ``exec`` knows its globals.

``PyFrame.f_globals`` is DERIVED in Grail, not captured: it takes a
frame's ``co_filename`` and finds the one module in ``sys.modules`` whose
``__file__`` matches.  A function built by ``exec`` has no file, so no
module matched and ``f_globals`` was None.

That broke every ``stacklevel`` walk written the way CPython's own
stdlib writes them -- reading ``f_globals`` to decide how far to climb:

    frame = sys._getframe(1)
    stacklevel = 2
    while frame is not None and frame.f_back is not None:
        if frame.f_globals.get('__name__') != __name__:
            break
        stacklevel += 1
        frame = frame.f_back
    warnings.warn(msg, DeprecationWarning, stacklevel)

``gettext._as_int2`` is exactly that, and its caller is a plural function
``c2py`` builds with ``exec``.  CPython's walk climbs past it -- the exec
namespace carries ``__name__`` -- and blames the user's line; Grail's
stopped there and blamed the generated code.  Nine of test_gettext's
failures were this one frame.

The doit's namespace is now recorded when it is compiled and handed to
the frame when it is built.  It is the same object the generated code
calls ``___pyGlobals___`` and the same view ``globals()`` answers inside
the exec'd body, so all three agree.

Every expectation was checked against CPython 3.14 first.
"""

import sys
import warnings

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# -- an exec-built function's frame reports its globals -----------------

def _report():
    f = sys._getframe(1)
    g = f.f_globals
    return None if g is None else g.get('marker')


NS = {'_report': _report, 'marker': 'from-the-exec-namespace'}
exec('''if True:
    def built(n):
        return _report()
''', NS)
BUILT = NS['built']


def _exec_frame_has_globals():
    return BUILT(1)


def _a_normal_frame_still_does():
    return _report()


check('exec_frame_has_globals', _exec_frame_has_globals(),
      'from-the-exec-namespace')
check('a_normal_frame_still_does', _a_normal_frame_still_does(), None)


# -- and the three views agree ------------------------------------------
#
# globals() inside the exec'd body, the frame's f_globals, and the
# namespace the caller passed are all the same mapping.

AGREE_NS = {'_getframe': sys._getframe, 'tag': 'shared'}
exec('''if True:
    def views():
        f = _getframe(0)
        return (globals().get('tag'), f.f_globals.get('tag'),
                globals() is f.f_globals)
''', AGREE_NS)


def _views_agree():
    return AGREE_NS['views']()


check('views_agree', _views_agree(), ('shared', 'shared', True))


# -- the stacklevel idiom reaches the caller ----------------------------
#
# This is the shape gettext uses, reduced: a warning raised inside an
# exec-built function, with the stacklevel computed by walking f_globals,
# must be attributed to whoever called it.

WARN_NS = {'_getframe': sys._getframe, 'warnings': warnings,
           '__name__': 'the_exec_module'}
exec('''if True:
    def emit():
        frame = _getframe(1)
        stacklevel = 2
        while frame is not None and frame.f_back is not None:
            g = frame.f_globals
            if g is None or g.get("__name__") != __name__:
                break
            stacklevel += 1
            frame = frame.f_back
        warnings.warn("deprecated", DeprecationWarning, stacklevel)

    def middle():
        emit()
''', WARN_NS)


def _caller_of_the_exec_chain():
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('always')
        WARN_NS['middle']()
        return [(rec.filename.split('/')[-1], rec.lineno) for rec in w]


CALLER_LINE = _caller_of_the_exec_chain.__code__.co_firstlineno + 3


check('stacklevel_walk_reaches_the_caller',
      _caller_of_the_exec_chain(),
      [('exec_frame_globals.py', CALLER_LINE)])


# -- a binding the exec'd code makes is visible through the frame -------
#
# NOT tested: whether a write to the dict passed to exec() is visible
# afterwards.  CPython's exec globals IS that dict; Grail copies it into
# a scope and reflects back when the body finishes, so a later write to
# the original is not seen.  That is pre-existing exec() semantics and
# has nothing to do with which object a FRAME reports -- pinning it here
# would be testing exec(), and failing.

LIVE_NS = {'_getframe': sys._getframe}
exec('''if True:
    def peek(key):
        return _getframe(0).f_globals.get(key)

    def bind():
        global added_by_body
        added_by_body = 42
''', LIVE_NS)


def _a_binding_from_the_body_is_visible():
    before = LIVE_NS['peek']('added_by_body')
    LIVE_NS['bind']()
    after = LIVE_NS['peek']('added_by_body')
    return (before, after)


check('a_binding_from_the_body_is_visible',
      _a_binding_from_the_body_is_visible(), (None, 42))


# -- and an ordinary module frame is untouched --------------------------

def _module_frames_unchanged():
    f = sys._getframe(0)
    g = f.f_globals
    return (g is not None, g.get('__name__') == __name__,
            'RESULTS' in g)


check('module_frames_unchanged', _module_frames_unchanged(),
      (True, True, True))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
