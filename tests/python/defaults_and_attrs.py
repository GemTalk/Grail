# Fixture for DefaultsAndAttrsTestCase — exercises:
#   - default-valued function parameters (with `def f(a, b=2, c=3)`)
#   - `isinstance(x, str)` / `isinstance(x, int)` where the class name is
#     passed by value (codegen wraps these as BoundMethods on builtins,
#     which builtins.isinstance has to unwrap)
#   - dynamic per-instance attribute creation (a Python feature that
#     requires the PythonInstance __dict__ fallback for attributes not
#     pre-discovered by the __init__ scan)


def add(a, b=10, c=100):
    return a + b + c


add_all3 = add(1, 2, 3)
add_two  = add(1, 2)
add_one  = add(1)


def first_or(default='zero', items=None):
    if items is None:
        return default
    return items[0]


first_default = first_or()
first_items   = first_or('skip', (7, 8, 9))


is_str_str  = isinstance('hello', str)
is_int_str  = isinstance(42, str)
is_int_int  = isinstance(42, int)
is_list_int = isinstance([1, 2], int)
# isinstance with a tuple of classes — required by _compiler.compile()
is_either_a = isinstance('hello', (str, int))
is_either_b = isinstance(42, (str, int))
is_either_c = isinstance([1, 2], (str, int))


class Box:
    def __init__(self, x):
        self.x = x


class Pair:
    "A class with a defaulted __init__ argument — exercises the varargs"
    " init-dispatch path (`___init__:kw:` taking positional+keywords)."

    def __init__(self, head, tail=None):
        self.head = head
        self.tail = tail


pair_one = Pair(7)
pair_two = Pair(8, 'rest')


b = Box(7)
# Dynamic attribute — `y` is NOT set in Box.__init__, so the
# PythonInstance __dict__ fallback handles this assignment.
b.y = 'late'
b_x = b.x
b_y = b.y


# Bound-method-via-attribute-load:  obj.method (no call) yields a
# callable handle, even when the method has arguments.  Required by
# Python idioms like `myappend = items.append` (re._parser._parse_sub).
items = []
my_append = items.append
my_append(11)
my_append(22)
items_after = items


# `not` applied to non-Boolean values must apply Python's truthiness
# rules.  Empty container / 0 / empty string / None → True; everything
# else → False.
not_zero       = not 0
not_one        = not 1
not_empty_str  = not ''
not_nonempty   = not 'x'
not_empty_list = not []
not_full_list  = not [1, 2]
not_none       = not None
not_true       = not True
not_false      = not False


# `not in` codegen used to emit `__not__` which isn't a real method on
# Bool/Int.  Now compiled via the truthiness-coerced `not` pattern.
not_in_a       = 'a' not in 'hello'
not_in_b       = 'h' not in 'hello'
not_in_list_a  = 7 not in [1, 2, 3]
not_in_list_b  = 2 not in [1, 2, 3]


# Python `or` / `and` return the first truthy/falsy operand (value
# preserving), not coerced Boolean.  None / 0 / [] are falsy.
or_first_truthy   = 'x' or 'y'
or_skips_none     = None or 'fallback'
or_zero_then_str  = 0 or 'replacement'
or_all_falsy      = None or 0 or ''
and_short_circuit = None and 'never'
and_pass_through  = 1 and 'second'
and_chain         = 1 and 2 and 3


# Iterating an Array (concrete subclass of SequenceableCollection without
# its own iterator) must work — range(...)[::-1] returns a plain Array,
# which then drives `for i in range(N)[::-1]` patterns inside _parser.
reversed_range_sum = 0
for ___i in range(5)[::-1]:
    reversed_range_sum += ___i


# Python chained assignment — `a = b = c = expr` binds the same value to
# every target (evaluated once).  Used in _parser.SubPattern.getwidth as
# `lo = hi = 0`.
chain_a = chain_b = chain_c = 42
# Mixed-target chain — attribute and name share the same value.
class _ChainBox:
    def __init__(self):
        self.x = 0
_chain_box = _ChainBox()
_chain_box.x = chain_d = 99


# min/max 2-arg builtin fast path — Python idiom used by re._compiler.
min_pair = min(3, 7)
max_pair = max(3, 7)


# Cross-module call to a function with defaults compiles to varargs.
# When the call site doesn't know the receiver's class statically (because
# the receiver is bound to a local variable), CallAst emits a positional
# selector like ``parse:_:`` — but the receiver's class only has the
# varargs form ``_parse:kw:``.  Object env-1 DNU must dispatch the keyword
# selector through the varargs method when the base name matches.

def _accepts_defaults(a, b=10, c=100):
    return a + b + c


def _caller_two_args(fn):
    # Calls a passed-in function with 2 positional args; statically the
    # codegen can only emit `fn(...)` which becomes a positional selector
    # on the BoundMethod's underlying receiver class.
    return fn(1, 2)


def _caller_three_args(fn):
    return fn(1, 2, 3)


varargs_dnu_two   = _caller_two_args(_accepts_defaults)
varargs_dnu_three = _caller_three_args(_accepts_defaults)

