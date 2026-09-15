"""A shim module whose whole body is a star-import -- the ``decimal`` shape.

CPython's ``decimal`` is six lines that re-export ``_pydecimal``, and Grail's
vendored copy does the same with ``from _pydecimal import *``.  That shape is
what exposed the gap this fixture exists for: a DEPLOYED module's body does not
run, so the star-import never executes, the module it names is never imported,
never appears in sys.modules, and nothing ever calls the canonical restore for
it -- while its classes are reachable the whole time through THIS module's
committed globals.

So the classes below arrive without their owning module ever being bound, which
is precisely the state in which their multiple-inheritance record used to be
missing: ``Both.__mro__`` lost ``Mixin`` and ``issubclass(Both, Mixin)``
answered False, until something happened to touch the defining module.
"""

from grail_module_bind_fixture import *
