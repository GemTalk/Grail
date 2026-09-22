# ``type(name, bases, ns)'' over a scalar built-in -- four separate defects,
# all of them reachable from one line of test_builtin:
#
#     C = type('C', (B, int), {'spam': lambda self: 'spam%s' % self})
#
# CONSTRUCTION died uncatchably.  Grail's builtin ``__new__:'' classmethods take
# the VALUE and no cls, while the generic path PREPENDS the class as CPython's
# implicit-staticmethod ``cls'' -- and the scalar roots declare no ``__new__:''
# of their own, so it resolved to ``object class >> __new__: cls'', which treats
# its argument as the class to instantiate.  ``type('D', (int,), {})(7)'' became
# ``7 new'', a Smalltalk MessageNotUnderstood no Python except can see.  A class
# STATEMENT never reaches that path, which is why the common spelling worked and
# the dynamic one crashed.
#
# __base__ REPORTED AN INTERNAL CLASS.  It answered the Smalltalk superclass,
# and a Grail subclass of int is rooted at AbstractPyInt (Integer is sealed and
# its instances have no room for instance variables), of str at Unicode32.  So
# ``D.__base__ is int'' was False while its repr read ``<class 'int'>'' -- the
# worst way for a value to be wrong.  __bases__ and __mro__ already launder
# these; __base__ did not, so the three disagreed about the same class.
#
# __dict__ HELD METHODS THE CLASS DOES NOT OWN.  Grail is single-inheritance
# underneath, so a secondary base's methods are COPIED onto the class -- which
# makes them indistinguishable from its own by method dictionary alone.  The
# merge files them under its own category, so the class already records which
# they are.  Grail's own ``___name___'' / ``___qualname___'' leaked too: the
# method walks excluded ``___...___'' and the per-class attribute holder did not.
#
# int.to_bytes ANSWERED A TUPLE.  ``(42).to_bytes(2, 'little')'' gave
# ``(42, 0)'' where CPython gives ``b'*\x00''' -- the same numbers, the wrong
# type, and a wrong type that prints plausibly.  And an int SUBCLASS could not
# reach it at all: the forwarding probe asked for the UNARY selector only, so
# every no-argument method forwarded and every other one raised AttributeError
# for a method sitting right there.
#
# test_builtin's TestType.test_new_type.

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class B:
    def ham(self):
        return 'ham%d' % self


C = type('C', (B, int), {'spam': lambda self: 'spam%s' % self})
D = type('D', (int,), {})


class StatementSub(int):
    pass


class StrSub(str):
    pass


class Plain:
    pass


class PlainSub(Plain):
    pass


# --- construction ---------------------------------------------------------------

r['construct_with_value'] = outcome(lambda: C(42))
r['construct_empty'] = outcome(lambda: C())
r['construct_single_base'] = outcome(lambda: D(7))
r['type_of_instance'] = outcome(lambda: type(C(42)).__name__)
r['equals_its_value'] = outcome(lambda: C(42) == 42)

# --- the methods it inherits -------------------------------------------------------

r['own_method'] = outcome(lambda: C(42).spam())
r['merged_base_method'] = outcome(lambda: C(42).ham())
r['scalar_method'] = outcome(lambda: C(42).bit_length())

# --- __base__ is the SOLID base ------------------------------------------------------

r['base_of_mixin'] = outcome(lambda: C.__base__ is int)
r['base_of_int_subclass'] = outcome(lambda: StatementSub.__base__ is int)
r['base_of_str_subclass'] = outcome(lambda: StrSub.__base__ is str)
r['base_of_plain'] = outcome(lambda: PlainSub.__base__ is Plain)
r['base_of_bare'] = outcome(lambda: type('A', (), {}).__base__ is object)
r['bases_tuple'] = outcome(lambda: C.__bases__ == (B, int))

# --- __dict__ holds only what the class OWNS -------------------------------------------

r['own_name_in_dict'] = outcome(lambda: 'spam' in C.__dict__)
r['merged_name_not_in_dict'] = outcome(lambda: 'ham' in C.__dict__)
r['no_internal_names'] = outcome(
    lambda: sorted(k for k in C.__dict__ if k.startswith('___')))
r['firstlineno_absent'] = outcome(
    lambda: '__firstlineno__' in type('A', (), {}).__dict__)

# --- to_bytes ----------------------------------------------------------------------------

r['to_bytes_plain'] = outcome(lambda: (42).to_bytes(2, 'little'))
r['to_bytes_big'] = outcome(lambda: (258).to_bytes(2, 'big'))
r['to_bytes_on_mixin'] = outcome(lambda: C(42).to_bytes(2, 'little'))
r['to_bytes_on_statement_sub'] = outcome(
    lambda: StatementSub(42).to_bytes(2, 'little'))
r['from_bytes_roundtrip'] = outcome(
    lambda: int.from_bytes((300).to_bytes(2, 'little'), 'little'))

# --- controls -------------------------------------------------------------------------
#
# Every ordinary shape must be untouched: a class STATEMENT subclass, a plain
# class, and the unary methods that already forwarded.

r['statement_subclass_value'] = outcome(lambda: StatementSub(9) + 1)
r['statement_subclass_unary'] = outcome(lambda: StatementSub(8).bit_length())
r['str_subclass_value'] = outcome(lambda: StrSub('ab').upper())
r['plain_class_dict'] = outcome(lambda: 'spam' in PlainSub.__dict__)
r['plain_instance'] = outcome(lambda: type(PlainSub()).__name__)
r['isinstance_of_int'] = outcome(lambda: isinstance(C(42), int))


EXPECTED = {
    'base_of_bare': 'ok -> True',
    'base_of_int_subclass': 'ok -> True',
    'base_of_mixin': 'ok -> True',
    'base_of_plain': 'ok -> True',
    'base_of_str_subclass': 'ok -> True',
    'bases_tuple': 'ok -> True',
    'construct_empty': 'ok -> 0',
    'construct_single_base': 'ok -> 7',
    'construct_with_value': 'ok -> 42',
    'equals_its_value': 'ok -> True',
    'firstlineno_absent': 'ok -> False',
    'from_bytes_roundtrip': 'ok -> 300',
    'isinstance_of_int': 'ok -> True',
    'merged_base_method': "ok -> 'ham42'",
    'merged_name_not_in_dict': 'ok -> False',
    'no_internal_names': 'ok -> []',
    'own_method': "ok -> 'spam42'",
    'own_name_in_dict': 'ok -> True',
    'plain_class_dict': 'ok -> False',
    'plain_instance': "ok -> 'PlainSub'",
    'scalar_method': 'ok -> 6',
    'statement_subclass_unary': 'ok -> 4',
    'statement_subclass_value': 'ok -> 10',
    'str_subclass_value': "ok -> 'AB'",
    'to_bytes_big': "ok -> b'\\x01\\x02'",
    'to_bytes_on_mixin': "ok -> b'*\\x00'",
    'to_bytes_on_statement_sub': "ok -> b'*\\x00'",
    'to_bytes_plain': "ok -> b'*\\x00'",
    'type_of_instance': "ok -> 'C'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-30s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
