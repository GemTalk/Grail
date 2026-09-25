# Grail contextvars -- PEP 567.
#
# CPython's is C; this is a Python implementation of the same semantics.  It
# replaced a stub that stored ONE value per ContextVar, on the ContextVar
# itself, with a Context class whose ``run`` simply called its argument.  That
# was enough for the one caller it was written for (werkzeug.local uses
# ContextVar purely as proxy-storage indirection, and Grail is one gem per
# session) and it stayed correct for exactly as long as nothing had more than
# one context.
#
# asyncio does.  ``loop.create_task(coro, context=ctx)`` exists so that a task
# runs its steps inside a caller-supplied Context and writes land THERE rather
# than wherever the task happened to be created -- which is how a test shares
# one context across setUp/test/tearDown, and how a server keeps one request's
# state off another's.  Under the stub every write went to the same global slot,
# so ``context=`` had nothing to mean and asyncio did not plumb it at all.
#
# THE MODEL, and the one thing worth understanding before changing this:
# there is a CURRENT context, a Context is a mutable mapping of ContextVar ->
# value, and ContextVar.get/set read and write THE CURRENT ONE.  Context.run
# makes a context current for the duration of a synchronous call and restores
# the previous one afterwards.  A coroutine's step is such a call, so a task
# enters its context on every step and leaves it at every suspension -- which
# is why a Context can accumulate writes across awaits without ever being
# current while the task is parked.
#
# That also bounds what works: ``run'' takes a SYNCHRONOUS callable, as it does
# upstream.  Suspending inside one would leave the wrong context current for
# whoever resumes, because a Grail generator body is a separate call stack while
# the current context is shared.  CPython forbids the same thing for its own
# reasons; do not be tempted to relax it.
#
# WHERE the current context lives is the other thing to understand.  This
# module is committed, so a module global is shared by every gem and persists
# in the repository: the current context used to be one, and every session then
# wrote the same Context._data dict -- a Write-Write on the first ContextVar.set
# two sessions committed, and with decimal (whose context is a ContextVar and
# whose every rounding op mutates its flags) on ordinary arithmetic.  It lives
# in SessionTemps instead, behind _current() / _set_current(), and each session
# makes its own top context on first use (docs/Concurrency.md).

from _grail_session import SessionDict


class _Missing:
    """Distinct from None, which is a perfectly good stored value."""

    def __repr__(self):
        return '<contextvars._MISSING>'


_MISSING = _Missing()


class Token:
    """What ContextVar.set returns, and the only thing reset accepts.

    Carries the value the variable had BEFORE the set -- or Token.MISSING if it
    had none in that context, which is why reset can remove a variable rather
    than only overwrite it.
    """

    MISSING = _MISSING

    def __init__(self, context, var, old_value):
        self._context = context
        self._var = var
        self._old_value = old_value
        self._used = False

    @property
    def var(self):
        return self._var

    @property
    def old_value(self):
        return self._old_value

    def __repr__(self):
        used = ' used' if self._used else ''
        return '<Token%s var=%r at %#x>' % (used, self._var, id(self))


class Context:
    """A mapping of ContextVar -> value, and a scope you can run code in.

    Read-only as a mapping (there is no __setitem__): the only way to write is
    to run something in it and have that code call ContextVar.set, which is
    what keeps a context's contents attributable to the code that ran in it.
    """

    def __init__(self):
        self._data = {}
        self._prev = None
        self._entered = False

    # --- the scope half ---------------------------------------------------

    def run(self, callable_obj, *args, **kwargs):
        """Make this context current, call ``callable_obj``, restore.

        Re-entering a context that is already current is an error upstream and
        an error here: the saved previous-context would be overwritten, and
        exiting the inner run would restore the WRONG one -- a corruption that
        shows up arbitrarily far away rather than at the offending call.
        """
        if self._entered:
            raise RuntimeError(
                'cannot enter context: %r is already entered' % (self,))
        self._prev = _current()
        self._entered = True
        _set_current(self)
        try:
            return callable_obj(*args, **kwargs)
        finally:
            _set_current(self._prev)
            self._prev = None
            self._entered = False

    def copy(self):
        new = Context()
        new._data = dict(self._data)
        return new

    # --- the mapping half -------------------------------------------------

    def __getitem__(self, var):
        value = self._data.get(var, _MISSING)
        if value is _MISSING:
            raise KeyError(var)
        return value

    def get(self, var, default=None):
        value = self._data.get(var, _MISSING)
        if value is _MISSING:
            return default
        return value

    def __contains__(self, var):
        return var in self._data

    def __len__(self):
        return len(self._data)

    def __iter__(self):
        return iter(list(self._data.keys()))

    def keys(self):
        return list(self._data.keys())

    def values(self):
        return list(self._data.values())

    def items(self):
        return list(self._data.items())

    def __repr__(self):
        return '<Context vars=%d>' % (len(self._data),)


class ContextVar:
    """A variable whose value is per-Context rather than global."""

    # ``default'' is KEYWORD-ONLY, as it is upstream.  Grail's stub had it
    # positional-or-keyword, which is looser and so accepts everything CPython
    # does -- but it also accepts ContextVar('name', 5), which CPython rejects,
    # and a spelling that works here and fails there is the kind of divergence
    # that gets written once and found much later.
    def __init__(self, name, *, default=_MISSING):
        self._name = name
        self._default = default

    @property
    def name(self):
        return self._name

    def get(self, *args):
        """get() / get(default).

        Order is deliberate and is CPython's: the current context first, then
        the DEFAULT PASSED HERE, then the default given at construction, then
        LookupError.  An argument beats the constructor default -- a caller
        asking "or this" means this call, not this variable.
        """
        value = _current()._data.get(self, _MISSING)
        if value is not _MISSING:
            return value
        if len(args) > 0:
            return args[0]
        if self._default is not _MISSING:
            return self._default
        raise LookupError(self._name)

    def set(self, value):
        ctx = _current()
        old = ctx._data.get(self, _MISSING)
        ctx._data[self] = value
        return Token(ctx, self, old)

    def reset(self, token):
        """Undo one set, using the token that set returned.

        Tokens are single-use and belong to one variable and one context.  All
        three checks are here because the failure they prevent is a silent one:
        resetting with the wrong token restores a plausible value and the
        divergence surfaces later, somewhere else.
        """
        if token._var is not self:
            raise ValueError(
                'Token was created by a different ContextVar')
        if token._used:
            raise RuntimeError('Token has already been used once')
        ctx = _current()
        if token._context is not ctx:
            raise ValueError('Token was created in a different Context')
        if token._old_value is _MISSING:
            ctx._data.pop(self, None)
        else:
            ctx._data[self] = token._old_value
        token._used = True

    def __repr__(self):
        return '<ContextVar name=%r>' % (self._name,)


# The current context, per session.  When nothing has been entered it is this
# session's TOP context, made on first use -- writes outside any run() land
# there and stay for the life of the session, which is what non-async callers
# (werkzeug's proxy storage) saw from the old single-slot stub.  Nothing here
# is committed, so a fresh session starts with an empty top context.
_state = SessionDict("contextvars")


def _current():
    ctx = _state.get("current")
    if ctx is None:
        ctx = Context()
        _state["current"] = ctx
    return ctx


def _set_current(ctx):
    _state["current"] = ctx


def copy_context():
    """A snapshot of the current context.

    Shallow, and that is the point: the copy holds the same VALUES, so a task
    given the copy starts from what its creator could see, and its own sets go
    to the copy rather than back to the creator's context.
    """
    return _current().copy()


def _get_current_context():
    """Grail-internal: asyncio needs the current context to default to."""
    return _current()
