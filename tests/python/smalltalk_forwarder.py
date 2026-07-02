"""Fixture for the grail @smalltalk method-forwarder decorator.

A @smalltalk-decorated method has an ellipsis body and, at compile time, is
rewritten into a forwarder that dispatches to a native (env-0) Smalltalk
method on the receiver, mapping a nil result to None.

Widget subclasses GrailForwarderTarget (a plain Smalltalk class registered by
SmalltalkForwarderTestCase) so its instances answer the env-0 methods the
forwarders target: pong, bump:, combine:with:, giveNil.
"""

from grail import smalltalk


class Widget(GrailForwarderTarget):

    # Bare @smalltalk: target selector derived from the method name + arity.
    # 0 args -> unary `pong`.
    @smalltalk
    def pong(self): ...

    # Explicit unary selector (method name differs from the target).
    @smalltalk('pong')
    def greet(self): ...

    # Explicit keyword selector, one argument.
    @smalltalk('bump:')
    def bump(self, n): ...

    # Explicit multi-keyword selector, two arguments.
    @smalltalk('combine:with:')
    def combine(self, a, b): ...

    # Target answers Smalltalk nil, which the forwarder maps to None.
    @smalltalk('giveNil')
    def maybe(self): ...

    # Explicit binary selector, one argument -> Boolean.
    @smalltalk('==')
    def same_as(self, other): ...

    # @classmethod forwarder: the Smalltalk receiver is the class itself.
    @classmethod
    @smalltalk('==')
    def cls_same(cls, other): ...

    # @staticmethod forwarder: no self/cls; dispatches to a class-side
    # env-0 method on the class.  Bare form -> derived selector `beacon`.
    @staticmethod
    @smalltalk
    def beacon(): ...

    # @staticmethod forwarder with an explicit keyword selector + one arg.
    @staticmethod
    @smalltalk('triple:')
    def scale(n): ...


_w1 = Widget()
_w2 = Widget()

# Results captured at module load for the Smalltalk test case to read.
r_derived_unary = _w1.pong()
r_explicit_unary = _w1.greet()
r_keyword_one_arg = _w1.bump(41)
r_keyword_two_args = _w1.combine(20, 22)
r_nil_is_none = _w1.maybe() is None
r_binary_same = _w1.same_as(_w1)
r_binary_diff = _w1.same_as(_w2)
r_classmethod_same = Widget.cls_same(Widget)
r_static_derived = Widget.beacon()
r_static_keyword = Widget.scale(14)
