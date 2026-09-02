# A closure built inside a METHOD must retain only its free variables, never
# the method's whole frame.
#
# Each top-level binding becomes a module attribute the Smalltalk test reads
# through `@env1:name` (the WeakrefModuleTestCase pattern).  Every probe drops
# the last strong reference to a sentinel and asks whether a weak reference to
# it went dead: True means the frame was released, False means something in the
# generated method still holds it.

import weakref


def _force_collect():
    """Grail's `weakref._collect()`, or `gc.collect()` under CPython -- so this
    fixture is self-running and its expectations are MEASURED against CPython
    rather than written from a Grail session."""
    try:
        weakref._collect()
    except AttributeError:
        import gc

        gc.collect()


class _Sentinel:
    pass


class Watcher:
    """The exact shape the bug lived in: a per-argument callback built by a
    nested ``def`` inside a method, kept alive past the call."""

    def __init__(self):
        self.kept = []

    def watch(self, obj):
        note = [None]

        def on_death(dead_ref):
            return note[0]

        r = weakref.ref(obj, on_death)
        note[0] = r
        self.kept.append(r)
        return r

    def watch_with_default(self, obj, tag=None):
        # Same, but this method compiles through the VARARGS generator (it has
        # a default), which emitted its own copy of the wrapper block.
        note = [None]

        def on_death(dead_ref):
            return note[0]

        r = weakref.ref(obj, on_death)
        note[0] = r
        self.kept.append(r)
        return r

    def watch_with_lambda(self, obj):
        # A lambda captures the frame the same way a nested def does.
        note = [None]
        callback = lambda dead_ref: note[0]
        r = weakref.ref(obj, callback)
        note[0] = r
        self.kept.append(r)
        return r


def watch_from_function(obj, kept):
    """The control: the identical code shape at module scope, which never
    retained the frame -- module-level defs already put their locals in
    Smalltalk method temps rather than in an outer block."""
    note = [None]

    def on_death(dead_ref):
        return note[0]

    r = weakref.ref(obj, on_death)
    note[0] = r
    kept.append(r)
    return r


_watcher = Watcher()
_kept = []


def _released_by(register):
    victim = _Sentinel()
    probe = weakref.ref(victim)
    register(victim)
    del victim
    _force_collect()
    return probe() is None


def _probe_method():
    return _released_by(_watcher.watch)


def _probe_method_with_default():
    return _released_by(_watcher.watch_with_default)


def _probe_method_with_lambda():
    return _released_by(_watcher.watch_with_lambda)


def _probe_function():
    def register(v):
        watch_from_function(v, _kept)

    return _released_by(register)


method_closure_releases_the_argument = _probe_method()
method_with_default_releases_the_argument = _probe_method_with_default()
method_lambda_releases_the_argument = _probe_method_with_lambda()
function_closure_releases_the_argument = _probe_function()

# The callbacks still work: a released frame must not mean a broken closure.
_live = _Sentinel()
_live_ref = _watcher.watch(_live)
callback_closure_still_reads_its_free_variable = (
    _watcher.kept[-1] is _live_ref and _live_ref() is _live
)


def _probe_weak_key_dictionary():
    """End to end, and how this surfaced: WeakKeyDictionary.__setitem__ built
    its per-key remover with a nested def, so the frame held ``key'' and the
    weak key could never be reclaimed."""
    d = weakref.WeakKeyDictionary()
    key = _Sentinel()
    d[key] = 'value'
    before = len(d)
    del key
    _force_collect()
    return before == 1 and len(d) == 0


def _probe_weak_set():
    s = weakref.WeakSet()
    member = _Sentinel()
    s.add(member)
    before = len(s)
    del member
    _force_collect()
    return before == 1 and len(s) == 0


weak_key_dictionary_forgets_a_dead_key = _probe_weak_key_dictionary()
weak_set_forgets_a_dead_member = _probe_weak_set()


CHECKS = (
    'method_closure_releases_the_argument',
    'method_with_default_releases_the_argument',
    'method_lambda_releases_the_argument',
    'function_closure_releases_the_argument',
    'callback_closure_still_reads_its_free_variable',
    'weak_key_dictionary_forgets_a_dead_key',
    'weak_set_forgets_a_dead_member',
)

if __name__ == '__main__':
    for _name in CHECKS:
        print('%-4s %s' % ('OK' if globals()[_name] is True else 'FAIL', _name))
