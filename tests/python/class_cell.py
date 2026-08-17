"""Fixture: ``__classcell__`` is injected, handed to the metaclass, and filled.

CPython's compiler puts a ``__classcell__`` entry into the class namespace at
the end of a class body -- but ONLY when a method needs it, meaning the body
referenced ``__class__`` by name or used a zero-arg ``super()``.  The entry is
an empty cell; ``type.__new__`` fills it with the finished class as the class
comes into being.  A metaclass sits in between and is trusted to hand the
namespace on, which is the whole reason the protocol is visible at all.

Grail resolves ``__class__`` LEXICALLY -- codegen emits the defining class
directly -- so the cell is not what makes ``__class__`` work here.  What the
cell has to be right about is everything a metaclass can observe and do: that
it is present exactly when CPython says, that it arrives empty, that it holds
the class afterwards, and that dropping or re-pointing it is refused.
"""

r = {}


class Watcher(type):
    def __new__(mcls, name, bases, ns):
        r.setdefault('seen', {})[name] = '__classcell__' in ns
        return super().__new__(mcls, name, bases, ns)


# --- present exactly when a method needs it ---------------------------------

class NoRef(metaclass=Watcher):
    x = 1


class ByName(metaclass=Watcher):
    def f(self):
        return __class__


class ByZeroArgSuper(metaclass=Watcher):
    def f(self):
        return super()


class ByExplicitSuper(metaclass=Watcher):
    def f(self):
        return super(ByExplicitSuper, self)


r['omitted_when_unused'] = r['seen']['NoRef']
r['present_for_name'] = r['seen']['ByName']
r['present_for_zero_arg_super'] = r['seen']['ByZeroArgSuper']
# An EXPLICIT super(C, self) gets one TOO: CPython's symbol table creates the
# implicit __class__ cell for any method that references the NAME ``super``,
# without waiting to see the zero-argument form.  Measured, not assumed -- this
# fixture originally predicted False here and CPython said otherwise.
r['present_for_explicit_super'] = r['seen']['ByExplicitSuper']


# --- empty on arrival, filled with the class afterwards ---------------------

class Filler(type):
    def __new__(mcls, name, bases, ns):
        cell = ns['__classcell__']
        try:
            cell.cell_contents
            r['empty_on_arrival'] = 'HAD VALUE'
        except ValueError:
            r['empty_on_arrival'] = 'ValueError'
        cls = super().__new__(mcls, name, bases, ns)
        r['filled_with_class'] = cell.cell_contents is cls
        return cls


class Filled(metaclass=Filler):
    def f(self):
        return __class__


# It is protocol, not a class attribute: CPython consumes it.
r['not_a_class_attr'] = hasattr(Filled, '__classcell__')
# And `__class__` still resolves, which is the point of the whole exercise.
r['class_still_resolves'] = Filled().f() is Filled


# --- dropping it is a RuntimeError ------------------------------------------

class Dropper(type):
    def __new__(mcls, name, bases, ns):
        ns.pop('__classcell__', None)
        return super().__new__(mcls, name, bases, ns)


try:
    class Dropped(metaclass=Dropper):
        def f(self):
            return __class__
    r['drop_rejected'] = 'NOT RAISED'
except RuntimeError:
    r['drop_rejected'] = 'RuntimeError'
except Exception as exc:
    r['drop_rejected'] = type(exc).__name__

# A class that never asked for a cell is untouched by the same metaclass.
try:
    class DroppedNoRef(metaclass=Dropper):
        x = 5
    r['drop_harmless_without_ref'] = DroppedNoRef.x
except Exception as exc:
    r['drop_harmless_without_ref'] = type(exc).__name__


# --- replacing it is a TypeError --------------------------------------------

class Replacer(type):
    def __new__(mcls, name, bases, ns):
        ns['__classcell__'] = 'not a cell'
        return super().__new__(mcls, name, bases, ns)


try:
    class Replaced(metaclass=Replacer):
        def f(self):
            return __class__
    r['replace_rejected'] = 'NOT RAISED'
except TypeError:
    r['replace_rejected'] = 'TypeError'
except Exception as exc:
    r['replace_rejected'] = type(exc).__name__


# --- pointing a filled cell at a SECOND class is a TypeError ----------------
# The metaclass builds another class from the same namespace, whose cell is by
# then filled with the first.  Re-pointing it would leave the first class's
# methods reading the second.

class SecondBuilder(type):
    def __new__(mcls, name, bases, ns):
        cls = super().__new__(mcls, name, bases, ns)
        type('Other', (), ns)
        return cls


try:
    class Reused(metaclass=SecondBuilder):
        def f(self):
            return __class__
    r['second_class_rejected'] = 'NOT RAISED'
except TypeError:
    r['second_class_rejected'] = 'TypeError'
except Exception as exc:
    r['second_class_rejected'] = type(exc).__name__


EXPECTED = {
    'omitted_when_unused': False,
    'present_for_name': True,
    'present_for_zero_arg_super': True,
    'present_for_explicit_super': True,
    'empty_on_arrival': 'ValueError',
    'filled_with_class': True,
    'not_a_class_attr': False,
    'class_still_resolves': True,
    'drop_rejected': 'RuntimeError',
    'drop_harmless_without_ref': 5,
    'replace_rejected': 'TypeError',
    'second_class_rejected': 'TypeError',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED) - {'seen'}):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
