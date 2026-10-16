"""TypeError messages for unsupported operands read as CPython's (#1688).

Three wordings differed:

* ``**`` and ``pow()``: CPython names both spellings, ``for ** or pow():``.
* augmented assignment: CPython names the in-place operator, ``for +=:``.
  Grail's binary dunder raised in the binary spelling before the augmented
  helper saw anything, and when both operands declined with NotImplemented,
  NotImplemented was STORED in the target instead of raising.
* sequences: a str, list or tuple on the left of ``+`` says ``can only
  concatenate list (not "int") to list``; a sequence on either side of ``*``
  says ``can't multiply sequence by non-int of type 'float'``.  ``lst += 5``
  is list.extend, so it says ``'int' object is not iterable``.

And ``x = 1; x @= 2`` ended the process with a doesNotUnderstand Python could
not catch.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

from collections import UserList

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def aug(src, **names):
    g = dict(names)
    exec(src, g)
    return g['x']


class F:
    pass


class Declines:
    def __mul__(self, other):
        return NotImplemented


class AlsoDeclines:
    def __rmul__(self, other):
        return NotImplemented


class Radd:
    def __radd__(self, other):
        return ('radd', other)


class MyInt(int):
    pass


class MyList(list):
    pass


class Raises:
    def __iadd__(self, other):
        raise TypeError('mine')


class DeclinesAdd(list):
    def __add__(self, other):
        return NotImplemented


class DeclinesRmul(str):
    def __rmul__(self, other):
        return NotImplemented


# ** and pow()
t('int_pow_obj', lambda: 3 ** F())
t('obj_pow_int', lambda: F() ** 3)
t('pow_builtin', lambda: pow(3, F()))
t('pow_three_args', lambda: pow(3, F(), 5))
t('float_pow_obj', lambda: 1.5 ** F())
t('str_pow_int', lambda: 'a' ** 2)
t('complex_pow_obj', lambda: 1j ** F())

# augmented assignment
t('iadd_obj_int', lambda: aug('x = F()\nx += 1', F=F))
t('iadd_int_obj', lambda: aug('x = 1\nx += F()', F=F))
t('imul_declines', lambda: aug('x = Declines()\nx *= 1', Declines=Declines))
t('imul_both_decline', lambda: aug('x = Declines()\nx *= AlsoDeclines()',
                                   Declines=Declines, AlsoDeclines=AlsoDeclines))
t('ipow', lambda: aug('x = F()\nx **= 2', F=F))
t('ilshift_float', lambda: aug('x = 1\nx <<= 1.5'))
t('imatmul_int', lambda: aug('x = 1\nx @= 2'))
t('imatmul_float', lambda: aug('x = 1.0\nx @= 2.0'))
t('iand_float', lambda: aug('x = 1.0\nx &= 2.0'))
t('iadd_attribute', lambda: aug('class K: pass\nx = K()\nx.v = 1\nx.v += F()', F=F))
t('iadd_subscript', lambda: aug('x = [1]\nx[0] += F()', F=F))
t('iadd_raises_own', lambda: aug('x = Raises()\nx += 1', Raises=Raises))
t('iadd_radd_wins', lambda: aug('x = 1\nx += Radd()', Radd=Radd))
t('iadd_runtime_dunder',
  lambda: aug('class Q: pass\nQ.__add__ = lambda s, o: ("rt", o)\nx = Q()\nx += 5'))
t('iadd_ints', lambda: aug('x = 2\nx += 3'))
t('ipow_floats', lambda: aug('x = 2.0\nx **= 0.5'))

# sequences
t('str_plus_int', lambda: 'a' + 1)
t('int_plus_str', lambda: 1 + 'a')
t('list_plus_int', lambda: [] + 1)
t('list_plus_tuple', lambda: [] + ())
t('tuple_plus_list', lambda: () + [])
t('str_plus_bytes', lambda: 'a' + b'a')
t('bytes_plus_str', lambda: b'a' + 'a')
t('mylist_plus_int', lambda: MyList() + 1)
t('str_times_str', lambda: 'a' * 'b')
t('list_times_float', lambda: [1] * 1.5)
t('float_times_list', lambda: 1.5 * [1])
t('str_plus_radd', lambda: 'a' + Radd())
t('list_subclass_declining_add', lambda: DeclinesAdd() + 1)
t('int_times_declining_rmul', lambda: 3 * DeclinesRmul('b'))
t('list_iadd_int', lambda: aug('x = []\nx += 1'))
t('list_iadd_float', lambda: aug('x = []\nx += 1.5'))
t('list_iadd_myint', lambda: aug('x = []\nx += MyInt(3)', MyInt=MyInt))
t('list_iadd_userlist', lambda: (lambda x: (type(x).__name__, list(x)))(
    aug('x = []\nx += UserList([1])', UserList=UserList)))
t('str_iadd_int', lambda: aug('x = "a"\nx += 1'))
t('str_imul_float', lambda: aug('x = "a"\nx *= 1.5'))


EXPECTED = {
    'bytes_plus_str': "TypeError: can't concat str to bytes",
    'complex_pow_obj': "TypeError: unsupported operand type(s) for ** or pow(): 'complex' and 'F'",
    'float_pow_obj': "TypeError: unsupported operand type(s) for ** or pow(): 'float' and 'F'",
    'float_times_list': "TypeError: can't multiply sequence by non-int of type 'float'",
    'iadd_attribute': "TypeError: unsupported operand type(s) for +=: 'int' and 'F'",
    'iadd_int_obj': "TypeError: unsupported operand type(s) for +=: 'int' and 'F'",
    'iadd_ints': '5',
    'iadd_obj_int': "TypeError: unsupported operand type(s) for +=: 'F' and 'int'",
    'iadd_radd_wins': "('radd', 1)",
    'iadd_raises_own': 'TypeError: mine',
    'iadd_runtime_dunder': "('rt', 5)",
    'iadd_subscript': "TypeError: unsupported operand type(s) for +=: 'int' and 'F'",
    'iand_float': "TypeError: unsupported operand type(s) for &=: 'float' and 'float'",
    'ilshift_float': "TypeError: unsupported operand type(s) for <<=: 'int' and 'float'",
    'imatmul_float': "TypeError: unsupported operand type(s) for @=: 'float' and 'float'",
    'imatmul_int': "TypeError: unsupported operand type(s) for @=: 'int' and 'int'",
    'imul_both_decline': "TypeError: unsupported operand type(s) for *=: 'Declines' and 'AlsoDeclines'",
    'imul_declines': "TypeError: unsupported operand type(s) for *=: 'Declines' and 'int'",
    'int_plus_str': "TypeError: unsupported operand type(s) for +: 'int' and 'str'",
    'int_pow_obj': "TypeError: unsupported operand type(s) for ** or pow(): 'int' and 'F'",
    'int_times_declining_rmul': "TypeError: unsupported operand type(s) for *: 'int' and 'DeclinesRmul'",
    'ipow': "TypeError: unsupported operand type(s) for **=: 'F' and 'int'",
    'ipow_floats': '1.4142135623730951',
    'list_iadd_float': "TypeError: 'float' object is not iterable",
    'list_iadd_int': "TypeError: 'int' object is not iterable",
    'list_iadd_myint': "TypeError: 'MyInt' object is not iterable",
    'list_iadd_userlist': "('UserList', [1])",
    'list_plus_int': 'TypeError: can only concatenate list (not "int") to list',
    'list_plus_tuple': 'TypeError: can only concatenate list (not "tuple") to list',
    'list_subclass_declining_add': "TypeError: unsupported operand type(s) for +: 'DeclinesAdd' and 'int'",
    'list_times_float': "TypeError: can't multiply sequence by non-int of type 'float'",
    'mylist_plus_int': 'TypeError: can only concatenate list (not "int") to list',
    'obj_pow_int': "TypeError: unsupported operand type(s) for ** or pow(): 'F' and 'int'",
    'pow_builtin': "TypeError: unsupported operand type(s) for ** or pow(): 'int' and 'F'",
    'pow_three_args': "TypeError: unsupported operand type(s) for ** or pow(): 'int', 'F', 'int'",
    'str_iadd_int': 'TypeError: can only concatenate str (not "int") to str',
    'str_imul_float': "TypeError: can't multiply sequence by non-int of type 'float'",
    'str_plus_bytes': 'TypeError: can only concatenate str (not "bytes") to str',
    'str_plus_int': 'TypeError: can only concatenate str (not "int") to str',
    'str_plus_radd': "('radd', 'a')",
    'str_pow_int': "TypeError: unsupported operand type(s) for ** or pow(): 'str' and 'int'",
    'str_times_str': "TypeError: can't multiply sequence by non-int of type 'str'",
    'tuple_plus_list': 'TypeError: can only concatenate tuple (not "list") to tuple',
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
