"""Fixture: a method merged from a secondary base behaves as the def it was.

Grail gives a class with several bases its secondary bases' methods by COPYING
them onto the class (the multiple-inheritance merge).  An IR-built method is
copied by regenerating its IR for the new class (plan P2.2), where it used to
be recompiled from a Smalltalk text twin.  ``Built`` takes ``Mixin`` from
ir_mi_merge_base and ``LocalMixin`` from here as secondary bases; the checks
are what CPython's MRO gives.  Run as a script, this file is its own CPython
oracle; ``IRMergeRegenerateTestCase`` runs the same checks under Grail, with
the base module's builders cached and with them rebuilt from source.
"""

from ir_mi_merge_base import Root, Mixin


class LocalMixin:
    def local(self):
        return ('local', self.v)

    def plain(self, x):
        return 'shadowed by Mixin.plain'


class Built(Root, Mixin, LocalMixin):
    pass


def _raises():
    try:
        Built(5).raises()
    except ZeroDivisionError as e:
        tb = e.__traceback__
        while tb.tb_next is not None:
            tb = tb.tb_next
        return (tb.tb_frame.f_code.co_name,
                tb.tb_lineno == Mixin.raises.__code__.co_firstlineno + 1)
    return 'no exception'


def _prop_store():
    b = Built(5)
    b.prop = 9
    return (b.prop, b.v)


CHECKS = [
    ('root', lambda: Built(5).root(), 'root'),
    ('plain', lambda: Built(5).plain(1), 6),
    ('kw', lambda: Built(5).kw(1, 3, 4, z=1), (5, 1, 3, (4,), [('z', 1)])),
    ('calls_self', lambda: Built(5).calls_self(), 105),
    ('classmethod', lambda: Built.cm(3), ('Built', 3)),
    ('staticmethod', lambda: Built.sm(3, 4), 12),
    ('generator', lambda: list(Built(5).gen(3)), [5, 6, 7]),
    ('closure', lambda: Built(5).closure(2), 8),
    ('class_statement', lambda: Built(5).with_class(), 'local'),
    ('traceback', _raises, ('raises', True)),
    ('property', lambda: Built(5).prop, ('get', 5)),
    ('property_store', _prop_store, (('get', 9), 9)),
    ('local_mixin', lambda: Built(5).local(), ('local', 5)),
    ('who', lambda: Built(5).who(), 'Built'),
]


def run_checks():
    """[(name, ok, actual)] for every check."""
    out = []
    for name, fn, expected in CHECKS:
        try:
            actual = fn()
        except Exception as e:
            actual = '%s: %s' % (type(e).__name__, e)
        out.append((name, actual == expected, actual))
    return out


if __name__ == '__main__':
    for name, ok, actual in run_checks():
        print('%-16s %s %r' % (name, 'OK ' if ok else 'DIFF', actual))
