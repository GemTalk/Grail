"""Local variables of a LIVE Python frame.

Driven by PythonTests>>LiveFrameLocalsTestCase, which does the reading -- this
file only supplies frames with KNOWN locals to be read.  There is no
self-running __main__ block: the checks are about what Grail can see of its own
stack, so there is nothing for CPython to agree or disagree with.

The values are deliberately of distinguishable types, and one of them is
explicitly None.  That last one is load-bearing: an unassigned Smalltalk temp
reads as nil and is omitted from the locals, which is right (CPython's f_locals
holds only bound names) but is only SAFE because Python's None is a distinct
object in Grail and never Smalltalk nil.  ``bound_to_none'' is what proves the
two are not being confused -- omit it and a bug that dropped every None-valued
local would pass.
"""


def inner(first, second):
    computed = first + second
    text = 'hello'
    bound_to_none = None
    declared_later = None
    del declared_later
    raise ValueError('boom')


def outer():
    outer_only = 99
    return inner(1, 2)
