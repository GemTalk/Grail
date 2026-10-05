"""Deployed modules: which file a module name stands for, and changing it.

A module name stands for ONE module in the repository.  The import cache
is persistent and shared by every program you run, so the first file
imported as ``models`` is the ``models`` from then on.  Editing that file
is an edit: the next import rebuilds it in place, its classes keep their
identity, and the instances stored against them follow.  The same source
found at another path -- another checkout, another host -- is the same
module.

What Grail refuses, with an ``ImportError`` at the import, is a DIFFERENT
file with DIFFERENT source under a deployed name.  Without the refusal two
programs that each have a ``models.py`` would take turns rebuilding one set
of classes, and the objects one program stored would run the other's
methods.  The two ways forward are explicit::

    import gemdb.modules

    gemdb.modules.relocate("models")   # same module, it moved: then import it
    gemdb.modules.forget("models")     # a different module: un-deploy the old one

See docs/Persistent_Modules_and_Classes.md, D10.
"""

# Module-body imports only -- see the import comment in gemdb/__init__.py:
# a function-level import would re-bind this committed module's dict on
# every call and dirty the session.
import gemdb as _gemdb
import gemstone as _gemstone

_CLEAN = ("forget() scans the repository for instances of the module's classes, "
          "and a scan discards uncommitted work; this session has changes. "
          "gemdb.commit() to keep them or gemdb.abort() to discard them first")


def relocate(name):
    """Say that deployed module ``name`` moved to another file, unchanged in identity.

    Lifts the refusal for the next ``import`` of ``name`` in this session,
    which rebuilds it in place from the file it now finds: its classes
    keep their identity and every stored instance keeps working.  Commit
    afterwards to record the new location, as for any import.  Writes
    nothing itself.  Raises ``ValueError`` if nothing is deployed under
    ``name``.
    """
    _gemstone.repository.modules_relocate(str(name))


def forget(name):
    """Un-deploy module ``name`` and its submodules, so the next import builds afresh.

    For a DIFFERENT module that shares a deployed name.  REFUSES, with
    ``ValueError``, while any instance of the forgotten modules' classes
    (or of their subclasses) exists in the repository, and says how many:
    forgetting would leave those objects on classes nothing can name.  The
    count is what the repository HOLDS, so an object you unlinked is still
    counted until ``gemdb.admin.garbage_collect()`` collects it.

    Scans the repository, so it refuses (``gemdb.PendingChangesError``)
    while the session has uncommitted changes, and commits itself.
    Returns ``{"modules", "classes"}``.
    """
    if _gemdb.needs_commit():
        raise _gemdb.PendingChangesError(_CLEAN)
    r = _gemstone.repository.modules_forget(str(name))
    _gemdb.commit()
    return {"modules": r[0], "classes": r[1]}
