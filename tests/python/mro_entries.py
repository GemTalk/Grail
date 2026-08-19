"""PEP 560: a non-class base is replaced by its __mro_entries__.

    class C:
        def __mro_entries__(self, bases):
            return (SomeClass,)
    c = C()
    class D(A, c, B): ...        # D's bases are (A, SomeClass, B)

The hook is handed the WHOLE original bases tuple, not just itself, because a
base may want to know what it is sitting among.  Its answer is spliced in at
that position, and an EMPTY tuple removes the base entirely.

``__orig_bases__'' preserves what was written, and is set ONLY when the hook
actually fired -- an ordinary class does not have the attribute at all, which
is worth pinning because "always set it" is the easier thing to implement and
is wrong.

Grail never called the hook: the non-class object stayed in __bases__, and a
class definition only succeeded at all because Grail happens to pick a
class-shaped base to inherit from.  A SOLE non-class base failed outright.

Every expectation below was checked against CPython 3.14.
"""

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


class A:
    pass


class B:
    pass


class Replacement:
    pass


class Entry:
    """Replaced by Replacement wherever it is used as a base."""

    def __mro_entries__(self, bases):
        return (Replacement,)


class Vanishing:
    """Contributes no base at all."""

    def __mro_entries__(self, bases):
        return ()


entry = Entry()
vanishing = Vanishing()


# --------------------------------------------------- splicing in place

class Middle(A, entry, B):
    pass


check('non_class_base_is_replaced',
      lambda: tuple(Middle.__bases__), (A, Replacement, B))
check('replacement_is_a_real_base',
      lambda: issubclass(Middle, Replacement), True)
check('other_bases_survive',
      lambda: (issubclass(Middle, A), issubclass(Middle, B)), (True, True))


class Sole(entry.__class__()):
    pass


check('a_sole_non_class_base_works',
      lambda: issubclass(Sole, Replacement), True)


# ------------------------------------------------- an empty answer

class Removed(A, vanishing):
    pass


check('an_empty_answer_removes_the_base',
      lambda: tuple(Removed.__bases__), (A,))


# --------------------------------------------- what the hook receives

RECEIVED = []


class Recorder:
    def __mro_entries__(self, bases):
        RECEIVED.append(bases)
        return (Replacement,)


recorder = Recorder()


class Watched(A, recorder, B):
    pass


check('hook_receives_the_whole_original_bases_tuple',
      lambda: RECEIVED[-1], (A, recorder, B))
check('hook_receives_a_tuple',
      lambda: isinstance(RECEIVED[-1], tuple), True)


# ------------------------------------------------------ __orig_bases__

check('orig_bases_preserves_what_was_written',
      lambda: tuple(Middle.__orig_bases__), (A, entry, B))


class Ordinary(A):
    pass


# Set ONLY when the hook fired: an ordinary class has no such attribute.
check('an_ordinary_class_has_no_orig_bases',
      lambda: hasattr(Ordinary, '__orig_bases__'), False)


# ---------------------------------------------------- still unchanged

class Plain:
    pass


class Sub(Plain):
    pass


check('ordinary_single_inheritance', lambda: issubclass(Sub, Plain), True)
check('ordinary_multiple_inheritance',
      lambda: (lambda c: (issubclass(c, A), issubclass(c, B)))(
          type('M', (A, B), {})),
      (True, True))
check('instances_still_build', lambda: isinstance(Sub(), Plain), True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
