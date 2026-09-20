"""A parameter named after a Smalltalk pseudo-variable, and its default.

Grail compiles a Python parameter whose name is a Smalltalk pseudo-variable
(`self`, `super`, `nil`, `true`, `false`, `thisContext`) into a renamed
"transport" temp `_<name>`, because Smalltalk cannot declare those as
variables. Two places got that rename wrong, and both only showed up when such
a parameter had a DEFAULT -- which is why the family looked fine for years:

  * the def-time temp holding the default was DECLARED under the Python name
    and READ under the transport name, so the method failed to compile
    outright (`___default_self___` vs `___default__self___`);
  * the default EXPRESSION was resolved in the def's own scope rather than the
    enclosing one, so `def h(y, self=self)` emitted the inner def's transport
    temp into the enclosing method, where no such temp exists.

The second is the subtle one and has its own check below: a default is
evaluated at def time, in the scope that CONTAINS the def, so `self=self` must
read the enclosing `self` -- the receiver in a method, the outer transport temp
in a plain function.

This is the idiom CPython's own `ElementTree.XMLParser._setevents` uses to
carry the instance into its handlers, so `iterparse` and `XMLPullParser` were
unreachable until both were fixed.

Every expectation here was measured against CPython 3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


# ------------------------------- one representative name, all three shapes

def plain(self, b=0):
    return self


def with_default(x, self=7):
    return (x, self)


check('a_reserved_name_binds_its_argument', plain(42), 42)

check('a_reserved_name_takes_its_default', with_default(1), (1, 7))

check('an_explicit_argument_beats_the_default', with_default(1, 9), (1, 9))


# --------------------------------------- every reserved name, same shape

def _nil(x, nil=7):
    return (x, nil)


def _true(x, true=7):
    return (x, true)


def _false(x, false=7):
    return (x, false)


def _super(x, super=7):
    return (x, super)


def _this(x, thisContext=7):
    return (x, thisContext)


check('every_reserved_name_takes_its_default',
      [f(1) for f in (with_default, _nil, _true, _false, _super, _this)],
      [(1, 7)] * 6)


# ------------------------------------ the default is the ENCLOSING scope

class Holder:

    def nested_constant_default(self):
        def handler(y, self=7):
            return (y, self)
        return handler(0)

    def nested_argument_wins(self):
        def handler(y, self=7):
            return (y, self)
        return handler(0, 99)

    def nested_no_default(self):
        def handler(self):
            return self
        return handler(42)

    def nested_self_is_the_receiver(self):
        # ElementTree's _setevents idiom: carry the instance in at def time.
        def handler(y, self=self):
            return (y, self)
        return handler(0)[1] is self


check('a_nested_reserved_param_takes_its_default',
      Holder().nested_constant_default(), (0, 7))

check('a_nested_reserved_param_yields_to_an_argument',
      Holder().nested_argument_wins(), (0, 99))

check('a_nested_reserved_param_needs_no_default',
      Holder().nested_no_default(), 42)

check('self_equals_self_reads_the_enclosing_receiver',
      Holder().nested_self_is_the_receiver(), True)


def outer_then_nested(self):
    # The enclosing scope here is a plain function, so ``self=self'' must read
    # the OUTER function's transport temp rather than a receiver.
    def handler(y, self=self):
        return (y, self)
    return handler(0)


check('self_equals_self_reads_an_enclosing_transport_temp',
      outer_then_nested(7), (0, 7))


# ------------------------------------------------- an ordinary name is unchanged

def ordinary(x, value=7):
    return (x, value)


check('an_ordinary_parameter_is_unaffected',
      (ordinary(1), ordinary(1, 9)), ((1, 7), (1, 9)))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
