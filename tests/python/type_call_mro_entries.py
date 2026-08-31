"""``type()`` refuses MRO entry resolution; ``types.new_class()`` performs it.

CPython draws a deliberate line: the class STATEMENT resolves PEP 560
bases, and so does ``types.new_class()``, but the low-level three-argument
``type()`` builder does NOT -- it raises

    type() doesn't support MRO entry resolution; use types.new_class()

Grail built the class anyway and then died inside it with an UNCATCHABLE
Smalltalk ``does not understand ___dynInstVars___``, which Python's
``except`` cannot see at all -- strictly worse than the wrong answer it
was covering for.

The other half of the line had to be made real for the refusal to be
honest: ``types.resolve_bases`` was ``return bases`` and ``types.new_class``
passed its bases straight to ``type()``, so the sanctioned path did not
resolve either.  Both now follow CPython, including the ``__orig_bases__``
record new_class writes when resolution changed anything.

Every expectation was checked against CPython 3.14 first.
"""

import types

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


class Replacing:
    def __mro_entries__(self, bases):
        return (Base,)


class Base:
    pass


class Removing:
    def __mro_entries__(self, bases):
        return ()


class NotATuple:
    def __mro_entries__(self, bases):
        return Base


_replacing = Replacing()
_removing = Removing()


# -- type() refuses ----------------------------------------------------

def _type_call(bases):
    try:
        type('Bad', bases, {})
        return 'no raise'
    except TypeError as exc:
        return str(exc)


check('type_call_refuses_resolution',
      _type_call((_replacing,)),
      "type() doesn't support MRO entry resolution; use types.new_class()")

check('type_call_refuses_even_for_an_empty_result',
      _type_call((_removing,)),
      "type() doesn't support MRO entry resolution; use types.new_class()")

# A real class base is untouched -- type() still builds.
_built = type('Fine', (Base,), {'x': 1})
check('type_call_still_builds_from_real_bases', _built.__bases__, (Base,))
check('type_call_namespace_still_applies', _built.x, 1)


# -- types.new_class performs it ---------------------------------------

_made = types.new_class('Made', (_replacing,))
check('new_class_resolves', _made.__bases__, (Base,))
check('new_class_records_orig_bases', _made.__orig_bases__, (_replacing,))

_emptied = types.new_class('Emptied', (_removing,))
check('new_class_empty_result_roots_at_object', _emptied.__bases__, (object,))
check('new_class_empty_result_orig_bases',
      _emptied.__orig_bases__, (_removing,))

_plain = types.new_class('Plain', (Base,))
check('new_class_plain_bases', _plain.__bases__, (Base,))
check('new_class_plain_has_no_orig_bases',
      hasattr(_plain, '__orig_bases__'), False)


def _exec_body(ns):
    ns['marker'] = 'set'


_with_body = types.new_class('WithBody', (Base,), None, _exec_body)
check('new_class_runs_exec_body', _with_body.marker, 'set')


# -- resolve_bases on its own ------------------------------------------

# The SAME tuple object comes back when nothing needed resolving -- that
# identity is what new_class reads to decide whether __orig_bases__ is due,
# so it has to be one object, not an equal copy.
_unchanged = (Base,)
check('resolve_bases_is_identity_when_nothing_changes',
      types.resolve_bases(_unchanged) is _unchanged, True)
check('resolve_bases_substitutes', types.resolve_bases((_replacing,)), (Base,))
check('resolve_bases_removes', types.resolve_bases((_removing,)), ())
check('resolve_bases_keeps_position',
      types.resolve_bases((Base, _replacing, int)), (Base, Base, int))


def _bad_return():
    try:
        types.resolve_bases((NotATuple(),))
        return 'no raise'
    except TypeError as exc:
        return str(exc)


check('resolve_bases_rejects_a_non_tuple',
      _bad_return(), '__mro_entries__ must return a tuple')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
