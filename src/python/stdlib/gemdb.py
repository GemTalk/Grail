"""GemDB's Python API: a persistent object database with no mapping layer.

Everything reachable from ``gemdb.root`` persists when the session
commits -- plain dicts, lists, sets, and instances of your own classes,
unchanged.  There is no schema, no serializer, and nothing to declare::

    import gemdb

    orders = gemdb.root.setdefault("orders", [])   # find or create
    orders.append(Order("widget", 3))              # your own class, as-is

    with gemdb.transaction():                      # commit on exit
        orders.append(Order("gadget", 1))

Two ways to commit, for two ways of working:

* ``with gemdb.transaction():`` -- for scripts and functions.  The block
  refuses to start while the session already has uncommitted changes
  (:class:`PendingChangesError`), refreshes to the latest committed view,
  and commits on a clean exit.  An exception aborts; a commit conflict
  raises :class:`ConflictError` after aborting.  Blocks do not nest.
* ``gemdb.commit()`` / ``gemdb.abort()`` -- for interactive work (the
  shell, notebooks), where no block can span the cells.  ``commit()``
  raises :class:`ConflictError` on a conflict and leaves your changes in
  place so you decide what to do; ``abort()`` discards them.

``gemdb.refresh()`` shows you other sessions' commits when you have no
pending changes of your own; it refuses (rather than silently discarding)
when you do.

Conflicts carry the actual objects: ``ConflictError.conflicts`` maps the
GemStone conflict categories (e.g. ``"Write-Write"``) to lists of the
live objects fought over.  To retry automatically, use the decorator
form, which replays the whole function on conflict::

    @gemdb.transaction(retries=3)
    def transfer(a, b, amount):
        a.balance -= amount
        b.balance += amount

The module deliberately stays this small.  Administration (backups,
garbage collection, session listings, statistics) will live in separate
submodules (``gemdb.admin``, ``gemdb.sessions``, ...) so that a developer
who only writes Python never meets it.  See docs/GemDB_Module.md for the
design rationale.
"""

# Bind every dependency ONCE, at module-body time, so the bindings are
# committed together with the module.  A function-level ``import`` is not
# a harmless lazy reference here: Grail binds the imported name into this
# module's committed dict on EVERY call, which marks the session as
# needing a commit -- and gemdb's own transaction() entry check would then
# read gemdb's plumbing as the user's pending changes.
import gemstone as _gemstone

_ROOT_KEY = "GemDBRoot"


def _state():
    # Session-local mutable state (the in_transaction flag), a dict in
    # SessionTemps.  A module-level flag would be a write to this
    # committed module's globals -- swept into the next commit and shared
    # across sessions; SessionTemps state is neither.  Called through the
    # primitive directly rather than _grail_session.SessionDict, whose
    # function-level ``import gemstone`` re-binds that committed module's
    # dict on every call and would dirty the session (see the import
    # comment above).
    return _gemstone.sessionDict("gemdb")


class GemDBError(Exception):
    """Base class for gemdb errors."""


class PendingChangesError(GemDBError):
    """The session already holds uncommitted changes.

    Raised when entering ``with gemdb.transaction():`` or calling
    ``gemdb.refresh()`` while ``gemdb.needs_commit()`` is true -- both
    would otherwise silently discard or silently commit work you did
    outside the block.  Call ``gemdb.commit()`` to keep those changes or
    ``gemdb.abort()`` to discard them, then retry.  Note that a cold
    ``import`` can itself leave pending changes (module code is stored in
    the database); committing after your imports is normal.
    """


class ConflictError(GemDBError):
    """A commit failed because another session committed first.

    ``conflicts`` maps GemStone conflict categories (``"Write-Write"``,
    ``"Write-Dependency"``, ...) to lists of the live objects in
    conflict; ``commitResult`` names the failure kind.  ``aborted`` tells
    you what happened next: ``True`` means the failed transaction was
    aborted for you (the ``with`` block does this -- retry by re-running
    the block or use the ``retries=`` decorator form); ``False`` means
    your changes are still in place (explicit ``gemdb.commit()`` does
    this -- ``gemdb.abort()`` discards them when you are done looking).
    """

    def __init__(self, conflicts, aborted):
        self.conflicts = conflicts or {}
        self.aborted = aborted
        parts = []
        for category, objects in self.conflicts.items():
            if isinstance(objects, list) and objects:
                parts.append(category + " (" + str(len(objects)) + " objects)")
        summary = ", ".join(parts) if parts else "no conflicting objects reported"
        tail = ("; the failed transaction was aborted" if aborted
                else "; your uncommitted changes are still in place -- "
                     "gemdb.abort() discards them")
        super().__init__("commit conflict: " + summary + tail)

    @property
    def write_write(self):
        """The objects both sessions wrote, when that was the conflict."""
        objects = self.conflicts.get("Write-Write")
        return objects if isinstance(objects, list) else []


def needs_commit():
    """True when the session holds changes a commit would write."""
    return _gemstone.needs_commit


def commit():
    """Commit the session's changes; on conflict raise ConflictError.

    The failed transaction is NOT aborted: your changes stay in place so
    you can inspect ``ConflictError.conflicts`` and decide -- typically
    ``gemdb.abort()`` and redo.  Inside a ``with gemdb.transaction():``
    block this raises instead: the block commits on exit.
    """
    if _state().get("in_transaction"):
        raise GemDBError("commit() inside a transaction block: "
                         "the block commits when it exits")
    gs = _gemstone
    if not gs.system.commit():
        raise ConflictError(gs.transaction_conflicts, aborted=False)


def abort():
    """Discard the session's uncommitted changes and refresh the view."""
    if _state().get("in_transaction"):
        raise GemDBError("abort() inside a transaction block: "
                         "raise an exception to abandon the block instead")
    _gemstone.system.abort()


def refresh():
    """See other sessions' commits -- only when you have nothing pending.

    Same operation as ``abort()``, but it refuses with
    PendingChangesError when the session holds uncommitted changes, so a
    routine "show me the latest" can never silently discard work.
    """
    if _state().get("in_transaction"):
        raise GemDBError("refresh() inside a transaction block: "
                         "the block already started from a fresh view")
    if needs_commit():
        raise PendingChangesError(
            "refresh() would discard uncommitted changes; "
            "commit() to keep them or abort() to discard them first")
    _gemstone.system.abort()


class _Transaction:
    """The object ``gemdb.transaction()`` returns; see that function."""

    def __init__(self, retries=0):
        if retries < 0:
            raise ValueError("retries must be >= 0")
        self._retries = retries

    def __enter__(self):
        if self._retries:
            raise TypeError(
                "retries= only works in the decorator form -- a with block "
                "cannot be re-run; put the body in a function decorated "
                "with @gemdb.transaction(retries=...)")
        state = _state()
        if state.get("in_transaction"):
            raise GemDBError("transaction blocks do not nest")
        gs = _gemstone
        if gs.needs_commit:
            raise PendingChangesError(
                "the session already has uncommitted changes, which the "
                "transaction block would otherwise sweep into its commit; "
                "gemdb.commit() to keep them or gemdb.abort() to discard "
                "them, then enter the block (imports can leave pending "
                "changes too -- committing after imports is normal)")
        # Entry is clean, so this abort discards nothing: it only
        # refreshes the session to the latest committed view, giving the
        # block snapshot-like semantics.
        gs.system.abort()
        state["in_transaction"] = True
        return self

    def __exit__(self, exc_type, exc, tb):
        _state()["in_transaction"] = False
        gs = _gemstone
        if exc_type is not None:
            gs.system.abort()
            return False
        if not gs.system.commit():
            conflicts = gs.transaction_conflicts
            gs.system.abort()
            raise ConflictError(conflicts, aborted=True)
        return False

    def __call__(self, func):
        # No functools.wraps: reading ``functools.wraps`` caches a
        # BoundMethod on the committed functools module instance, which
        # would dirty the session at decoration time (see the import
        # comment at the top).  The wrapper works without the metadata.
        def wrapper(*args, **kwargs):
            remaining = self._retries
            while True:
                try:
                    with _Transaction():
                        return func(*args, **kwargs)
                except ConflictError:
                    if remaining == 0:
                        raise
                    remaining -= 1
        return wrapper


def transaction(func=None, *, retries=0):
    """A commit boundary: as a ``with`` block or as a decorator.

    ``with gemdb.transaction():`` raises PendingChangesError if the
    session already has uncommitted changes, refreshes to the latest
    committed view, runs the body, and commits on exit.  An exception
    aborts and propagates; a commit conflict aborts and raises
    ConflictError.  Blocks do not nest.

    As a decorator -- ``@gemdb.transaction`` or
    ``@gemdb.transaction(retries=3)`` -- the whole function becomes one
    transaction, and ``retries`` replays it that many extra times when
    the commit conflicts (each attempt starts from a fresh view).
    ``retries`` is decorator-only: a ``with`` block's body cannot be
    re-run.
    """
    if func is not None:
        if not callable(func):
            raise TypeError("transaction() takes no positional arguments; "
                            "use transaction(retries=N)")
        return _Transaction()(func)
    return _Transaction(retries=retries)


class _Root:
    """The persistent namespace behind ``gemdb.root``.

    A dict-like view of one persistent dictionary, stored in the
    database under the name ``GemDBRoot`` (visible under that name to
    Smalltalk tools).  The backing dictionary is created lazily on the
    first WRITE -- never on a read, so browsing an empty database leaves
    nothing to commit.
    """

    def _peek(self):
        # The committed backing dict, or None before the first write.
        try:
            return _gemstone[_ROOT_KEY]
        except KeyError:
            return None

    def _ensure(self):
        gs = _gemstone
        try:
            return gs[_ROOT_KEY]
        except KeyError:
            gs[_ROOT_KEY] = {}
            return gs[_ROOT_KEY]

    def __getitem__(self, key):
        backing = self._peek()
        if backing is None:
            raise KeyError(key)
        return backing[key]

    def __setitem__(self, key, value):
        self._ensure()[key] = value

    def __delitem__(self, key):
        backing = self._peek()
        if backing is None:
            raise KeyError(key)
        del backing[key]

    def __contains__(self, key):
        backing = self._peek()
        return False if backing is None else key in backing

    def __len__(self):
        backing = self._peek()
        return 0 if backing is None else len(backing)

    def __iter__(self):
        backing = self._peek()
        return iter(() if backing is None else backing)

    def get(self, key, default=None):
        backing = self._peek()
        return default if backing is None else backing.get(key, default)

    def setdefault(self, key, default=None):
        """The idiomatic first line of a GemDB program:
        ``orders = gemdb.root.setdefault("orders", [])`` finds the
        committed value or installs (and returns) the default."""
        return self._ensure().setdefault(key, default)

    def pop(self, key, *args):
        backing = self._peek()
        if backing is None:
            if args:
                return args[0]
            raise KeyError(key)
        return backing.pop(key, *args)

    def keys(self):
        backing = self._peek()
        return ({} if backing is None else backing).keys()

    def values(self):
        backing = self._peek()
        return ({} if backing is None else backing).values()

    def items(self):
        backing = self._peek()
        return ({} if backing is None else backing).items()

    def __repr__(self):
        # "What is in this database?" is the first question at the
        # shell -- answer it with the names, not the whole contents.
        return "gemdb.root(" + repr(sorted(self.keys(), key=str)) + ")"


root = _Root()

__all__ = ["root", "transaction", "commit", "abort", "refresh",
           "needs_commit", "GemDBError", "ConflictError",
           "PendingChangesError"]

# Warm the function-attribute caches, here in the module body.  The
# first ATTRIBUTE READ of a module function wraps it as a BoundMethod
# and caches it on the module instance (for CPython's stable function
# identity); on a committed module that cache write would mark the
# session as needing a commit -- and gemdb's own transaction() entry
# check would then blame the user for gemdb's plumbing.  Reading every
# def through the module object now, during the cold import, puts each
# cache entry (including gemstone.sessionDict's, on the gemstone module)
# into the same commit that deploys gemdb, so later sessions only read.
# A bare-name read here would NOT warm them: the module-scope path wraps
# unary defs without caching; only the getattr path caches.
import sys as _sys

_self = _sys.modules["gemdb"]
for _name in ("transaction", "commit", "abort", "refresh", "needs_commit",
              "_state", "root"):
    getattr(_self, _name)
_precached = _gemstone.sessionDict
del _self, _name, _sys
