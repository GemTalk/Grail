"""Repository administration: size, backups, garbage collection.

Separate from the gemdb top level on purpose: a developer who only
writes Python never needs any of this, and should never see it.  The
operations wrap env-1 methods on the kernel Repository class
(src/smalltalk/Python/Repository.gs), reached through
``gemstone.repository``::

    import gemdb.admin

    gemdb.admin.size()                       # {"bytes": ..., "free_bytes": ...}
    gemdb.admin.backup("/backups/mon.gz")    # .gz -> compressed, else plain
    gemdb.admin.garbage_collect()            # mark-for-collection; returns its report

``backup`` and ``garbage_collect`` refuse (:class:`gemdb.PendingChangesError`)
while the session holds uncommitted changes: a backup writes only
committed state, so pending work would silently not be in it, and the
collector likewise walks the committed object graph.  Commit or abort
first, so what the operation covers is exactly what you think it does.

Failures inside the kernel (a bad directory, a missing privilege) come
back as ordinary Python exceptions -- ``OSError`` from ``backup``,
``RuntimeError`` from ``garbage_collect``.  All three operations require
GemStone privileges (FileControl, GarbageCollection); GemDB's own user
has them.
"""

# Module-body imports only -- see the import comment in gemdb/__init__.py:
# a function-level import would re-bind this committed module's dict on
# every call and dirty the session.
import gemdb as _gemdb
import gemstone as _gemstone


def size():
    """The repository's size: ``{"bytes": total, "free_bytes": free}``.

    ``bytes`` is the extent file total (what the database occupies on
    disk); ``free_bytes`` is the space inside it not currently holding
    objects.
    """
    repo = _gemstone.repository
    return {"bytes": repo.file_size(), "free_bytes": repo.free_space()}


def backup(path):
    """Write a full backup of the committed repository to ``path``.

    A path ending in ``.gz`` gets a compressed backup, anything else a
    plain one.  Long-running on a large repository.  Raises
    ``gemdb.PendingChangesError`` if the session has uncommitted changes
    (they would not be in the backup), ``OSError`` if the kernel cannot
    write it.
    """
    if _gemdb.needs_commit():
        raise _gemdb.PendingChangesError(
            "backup() writes only committed state, and this session has "
            "uncommitted changes that would not be in it; gemdb.commit() "
            "to include them or gemdb.abort() to discard them first")
    _gemstone.repository.full_backup(path)


def garbage_collect():
    """Scan for unreferenced objects (mark-for-collection).

    Returns the collector's report string.  Long-running on a large
    repository; the space is reclaimed in the background afterwards.
    Raises ``gemdb.PendingChangesError`` if the session has uncommitted
    changes, ``RuntimeError`` if the kernel refuses.
    """
    if _gemdb.needs_commit():
        raise _gemdb.PendingChangesError(
            "garbage_collect() walks the committed object graph, and this "
            "session has uncommitted changes; gemdb.commit() to keep them "
            "or gemdb.abort() to discard them first")
    return _gemstone.repository.mark_for_collection()


__all__ = ["size", "backup", "garbage_collect"]

# Warm the function-attribute caches during the cold import, so they are
# committed with the module -- same mechanism and reasoning as the block
# at the end of gemdb/__init__.py.
import sys as _sys

_self = _sys.modules["gemdb.admin"]
for _name in ("size", "backup", "garbage_collect"):
    getattr(_self, _name)
del _self, _name, _sys
