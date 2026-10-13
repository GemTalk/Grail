"""``warnings.catch_warnings'' as a CLASS, the way CPython defines it (#1459).

Grail's warnings module is written in Smalltalk, and catch_warnings used to be
one of its methods, answering a Smalltalk CatchWarnings object.  That worked
for ``with warnings.catch_warnings(record=True) as log:'' and for nothing that
treats catch_warnings as the class it is in CPython: ``class
W(warnings.catch_warnings)'' raised ``cannot subclass a non-class base'', and
pytest's WarningsRecorder -- the machinery under pytest.warns and the recwarn
fixture -- is exactly such a subclass, so ``import pytest'' failed.

This is CPython's class, with the same constructor, ``_entered'' flag, repr
and reentry errors that subclasses read.  The snapshot-and-restore itself is
still the Smalltalk object, reached through the module's private
``_catch_warnings_impl'' and made afresh on every __enter__: CPython re-snaps
on each entry, and pytest's recorder relies on that, resetting ``_entered''
after __exit__ so the same recorder can be entered again.
"""

import sys

# The native module this class belongs to, captured at import.  A caller can
# point catch_warnings at another module (``module=''), and test_warnings swaps
# sys.modules['warnings'] between implementations, so the module the snapshot
# is taken from is decided per instance -- this is only the fallback.
_native = sys.modules.get('warnings')


class catch_warnings(object):
    """A context manager that copies and restores the warnings filter upon
    exiting the context.

    The 'record' argument specifies whether warnings should be captured by a
    custom implementation of warnings.showwarning() and be appended to a list
    returned by the context manager. Otherwise None is returned by the context
    manager. The objects appended to the list are arguments whose attributes
    mirror the arguments to showwarning().

    The 'module' argument is to specify an alternative module to the module
    named 'warnings' and imported under that name. This argument is only useful
    when testing the warnings module itself.

    If the 'action' argument is not None, the remaining arguments are passed
    to warnings.simplefilter() as if it were called immediately on entering the
    context.
    """

    def __init__(self, *, record=False, module=None,
                 action=None, category=Warning, lineno=0, append=False):
        self._record = record
        self._module = sys.modules['warnings'] if module is None else module
        self._entered = False
        if action is None:
            self._filter = None
        else:
            self._filter = (action, category, lineno, append)
        self._impl = None

    def __repr__(self):
        args = []
        if self._record:
            args.append("record=True")
        if self._module is not sys.modules['warnings']:
            args.append("module=%r" % self._module)
        name = type(self).__name__
        return "%s(%s)" % (name, ", ".join(args))

    def __enter__(self):
        if self._entered:
            raise RuntimeError("Cannot enter %r twice" % self)
        self._entered = True
        kwargs = {'record': self._record}
        if self._filter is not None:
            action, category, lineno, append = self._filter
            kwargs.update(action=action, category=category, lineno=lineno,
                          append=append)
        make = getattr(self._module, '_catch_warnings_impl', None)
        if make is None:
            make = _native._catch_warnings_impl
        self._impl = make(**kwargs)
        return self._impl.__enter__()

    def __exit__(self, *exc_info):
        if not self._entered:
            raise RuntimeError("Cannot exit %r without entering first" % self)
        self._impl.__exit__(*exc_info)
