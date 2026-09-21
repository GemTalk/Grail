"""Schema maintenance: see what a class stores, and change it deliberately.

Separate from the gemdb top level on purpose, like ``gemdb.admin``: a
developer who only writes Python never needs any of this.  Editing a
class is enough for almost every change -- adding an attribute, no
longer using one, moving one between a parent and a child -- and none of
those touches a single stored instance.  What lives here are the few
operations that DO write instances, so they are never an import side
effect and always something a person ran by name::

    import gemdb.schema

    gemdb.schema.layout(Account)              # what the class stores, by position
    gemdb.schema.report()                     # every class with unused attributes
    gemdb.schema.drop(Account, "balance")     # delete an attribute's values
    gemdb.schema.rename(Account, "phone", "phones")
    gemdb.schema.compact(Account)             # reclaim the holes a drop left

The model, in one paragraph.  Grail stores an instance's attributes by
POSITION, from a per-class layout that only ever grows, which is why an
edit never has to migrate anything (docs/Schema_Evolution.md).  A name
the class no longer assigns SURVIVES in that layout: old instances keep
their values, and only :func:`drop` removes them.  A drop leaves a
*hole*, one empty position per instance, and :func:`compact` is what
reclaims it.

Every operation but :func:`layout` scans the repository for the instances
it must touch, and a scan aborts the transaction first, so each refuses
(:class:`gemdb.PendingChangesError`) while the session has uncommitted
changes.  They commit themselves.  Commit or abort, then call.

A refusal about the REQUEST -- dropping a name the class still assigns,
naming an attribute that does not exist, a rename that would collide --
is a ``ValueError``, so ordinary ``except`` handling works.
"""

# Module-body imports only -- see the import comment in gemdb/__init__.py:
# a function-level import would re-bind this committed module's dict on
# every call and dirty the session.
import gemdb as _gemdb
import gemstone as _gemstone

_CLEAN = ("%s() scans the repository for the instances it touches, and a scan "
          "discards uncommitted work; this session has changes. gemdb.commit() "
          "to keep them or gemdb.abort() to discard them first")


def _require_clean(what):
    if _gemdb.needs_commit():
        raise _gemdb.PendingChangesError(_CLEAN % what)


def _rows(raw):
    """A Smalltalk report Array as a list of plain Python dicts."""
    return [{"name": str(r[0]), "position": r[1], "kind": str(r[2])} for r in raw]


def layout(cls):
    """What ``cls`` stores, in position order.

    A list of ``{"name", "position", "kind"}``, one per position, where
    ``kind`` is:

    * ``"assigned"`` -- some method of the class or an ancestor assigns
      it (or lists it in ``__slots__``): an ordinary attribute;
    * ``"unassigned"`` -- nothing assigns it any more, but instances that
      have a value still read it.  An edit that stopped using the
      attribute leaves it here, and re-adding the assignment simply makes
      it ``"assigned"`` again.  :func:`drop` is what removes the values;
    * ``"hole"`` -- a position a drop freed.  ``name`` is the name it last
      held, kept for the audit trail; nothing reads it, and only
      :func:`compact` reclaims the space.

    Reads nothing but the class, so it needs no clean transaction::

        >>> gemdb.schema.layout(Account)
        [{'name': 'balance', 'position': 1, 'kind': 'assigned'},
         {'name': 'owner', 'position': 2, 'kind': 'assigned'}]
    """
    return _rows(cls.___grailSlotLayoutReport___())


def report():
    """Every persistent class holding an unassigned attribute or a hole.

    A list of ``{"class", "instances", "attributes"}``, where
    ``attributes`` lists ``{"name", "kind", "holding"}`` and ``holding``
    is how many of that class's own instances still have a value at the
    position.  Empty when every class is tidy.

    This is the number to decide a :func:`drop` on: ``holding`` says how
    much data the attribute is still carrying, so "nobody assigns it and
    nothing holds it" is a free removal, while a large ``holding`` is a
    deletion to think about.  Grail deliberately does not make an unused
    attribute an import error: the rebuild happens in whichever session
    imports the edited source first, which can be production, and a
    refactor should not halt an application.  The record is here instead.

    One repository scan, so it needs a clean transaction.
    """
    _require_clean("report")
    out = []
    for row in _gemstone.repository.schema_report():
        out.append({"class": str(row[0]),
                    "instances": row[1],
                    "attributes": [{"name": str(a[0]), "kind": str(a[1]),
                                    "holding": a[2]} for a in row[2]]})
    return out


def drop(cls, name, batch=1000):
    """Delete attribute ``name`` from every instance of ``cls`` and below.

    The explicit deletion, and the only thing that removes a stored
    value.  It nils the attribute on every instance of ``cls`` and of
    every class under it, then turns the position into a hole, so the
    name becomes unknown to the class: reads raise ``AttributeError``,
    ``vars()`` stops listing it, and assigning it from outside makes an
    ordinary per-object attribute.

    Raises ``ValueError`` while any method of the subtree still assigns
    the name -- the next instance would bring it straight back, so remove
    the assignment (or the ``__slots__`` entry), import that, and then
    drop -- and for a name the class does not have.

    Commits every ``batch`` instances and once at the end, so a class
    with more instances than one transaction should carry is handled.
    Nothing moves, so an interrupted drop is safe to re-run: it finds
    fewer values and finishes.  Returns ``{"classes", "instances"}``.
    """
    _require_clean("drop")
    r = cls.___grailDropSlotBatched___(name, batch)
    return {"classes": r[0], "instances": r[1]}


def rename(cls, old, new):
    """Rename attribute ``old`` to ``new`` across ``cls`` and below.

    Both orders work, and which one you use decides the cost.

    **Rename before deploying the new code** and ``new`` has no position
    yet, so this is a RELABEL: the position keeps its data and simply
    changes its name.  No instance is touched at all, however many there
    are.  Ship the code that assigns ``new`` afterwards and its import
    finds the name already in the layout, holding the values.

    **Deploy first and rename after**, and the import will have appended
    ``new`` as an empty position while ``old`` survives with the data, so
    this MOVES every instance's value across and leaves ``old`` a hole.
    That is a repository scan.  It refuses outright if any instance holds
    a value under both names, because choosing one silently would lose
    the other; the message says how many.

    Either way it raises ``ValueError`` while a method still *assigns*
    ``old``: renaming a name the deployed code still writes would leave
    that code storing into a position the class no longer knows.  The edit that introduces
    the new name is the one that stops assigning the old one, so in
    practice this only bites if you rename with the old source still
    deployed.  Returns ``{"classes", "instances"}``, ``instances`` 0 for
    a relabel.

    A rename that also changes the SHAPE of the value (one phone number
    becoming a list of them) is this plus ordinary Python: relabel, then
    normalise lazily in a property or eagerly in a loop of your own.
    Grail owns the name; the value is yours.
    """
    _require_clean("rename")
    r = cls.___grailRenameSlot___(old, new)
    # Commit it, as drop() and compact() do.  A relabel moves no instance but
    # it does recompile the layouts and accessors of the whole subtree, and
    # leaving those uncommitted would hand the caller a dirty session after an
    # operation that is supposed to have finished.
    _gemdb.commit()
    return {"classes": r[0], "instances": r[1]}


def compact(cls):
    """Reclaim the holes in ``cls`` and every class below it.

    Rewrites the layouts without holes, moves every instance's values to
    their new positions and shrinks each instance.  Unlike :func:`drop`
    this is one atomic switch across the whole subtree -- every instance
    must move together, or a read would find the wrong position -- so it
    cannot be batched, and it is the step to run on a quiet system.

    Optional in every sense: holes cost one empty slot per instance and
    nothing else, and nothing in normal operation depends on reclaiming
    them.  Returns ``{"classes", "instances"}``.

    (A session that built every instance itself -- a test -- can reach the
    in-memory-only variant as ``cls.___grailCompactSlotsSessionOnly___()``.
    It is deliberately not part of this surface: it would silently skip a
    committed instance this session has not touched, leaving it reading the
    wrong positions.)
    """
    _require_clean("compact")
    r = cls.___grailCompactSlots___()
    _gemdb.commit()
    return {"classes": r[0], "instances": r[1]}


__all__ = ["layout", "report", "drop", "rename", "compact"]

# Warm the getattr cache for this module's own names, during the deploy
# commit, for the reason gemdb/__init__.py warms its own: the getattr path
# CACHES the wrapper on the module object, so the first ``gemdb.schema.f()`` in a
# later session would be a WRITE on a committed module -- dirtying a
# transaction the caller believes is clean.
#
# It is not a hygiene nicety here.  Every operation here checks needs_commit() first and
# refuses a dirty session, so an unwarmed module made the very first call
# raise PendingChangesError against a session the caller had just committed.
import sys as _sys

_self = _sys.modules[__name__]
for _name in ("layout", "report", "drop", "rename", "compact", "_require_clean", "_rows"):
    getattr(_self, _name)
del _self, _name, _sys
