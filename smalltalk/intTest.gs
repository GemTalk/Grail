! ------------------- Remove existing behavior from intTest
removeallmethods intTest
removeallclassmethods intTest
! ------------------- Class methods for intTest
! ------------------- Instance methods for intTest
category: 'done'
method: intTest
test__abs__

   self
		assert: (self int: 3) __abs__ ___value equals: 3;
        assert: (self int: -3) __abs__ ___value equals: 3;
		yourself.
%
category: 'done'
method: intTest
test__add__

   self
        assert: ((self int:  3) __add__: (self int: 1)) ___value equals: 4;
        assert: ((self int: -3) __add__: (self int: 1)) ___value equals: -2;
		yourself.
%
category: 'done'
method: intTest
test__and__

	| x |

	self
		assert: ((self int:  3) __and__: (self int: 1)) ___value equals: 1;
        assert: ((self int: -3) __and__: (self int: 1)) ___value equals: 1;
        assert: ((self int:  3) __and__: (self int: 2)) ___value equals: 2;
        assert: ((self int: -3) __and__: (self int: 2)) ___value equals: 0;
		yourself.

	self
		assert: (((self int: 1) __lt__: (x := self int: 2)) __and__: [(x __lt__: (x := self int: 3)) __and__: [x __lt__: (x := self int: 4)]]) equals: (self bool: true);
		assert: (((self int: 1) __lt__: (x := self int: 2)) __and__: [(x __lt__: (x := self int: 3)) __and__: [x __lt__: (x := self int: 2)]]) equals: (self bool: false);
		yourself.
%
category: 'done'
method: intTest
test__bool__

	self
		assert: (self int:  3) __bool__;
        assert: (self int: -3) __bool__;
        assert: (self int: -1) __bool__;
        assert: (self int:  1) __bool__;
        deny:   (self int:  0) __bool__;
		yourself
%
category: 'done'
method: intTest
test__ceil__

   self
		assert: (self int:  3) __ceil__ ___value equals: 3;
        assert: (self int: -3) __ceil__ ___value equals: -3;
		yourself.
%
category: 'done'
method: intTest
test__divmod__

	| result |
	result := (self int: 3) __divmod__: (self int: 4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(0 3).
	result := (self int: 3) __divmod__: (self int: -4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-1 -1).
	result := (self int: -3) __divmod__: (self int: -4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(0 -3).
	result := (self int: 4) __divmod__: (self int: 3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(1 1).
	result := (self int: 4) __divmod__: (self int: -3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-2 -2).
	result := (self int: -4) __divmod__: (self int: -3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(1 -1).
	result := (self int: -4) __divmod__: (self int: 3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-2 2).
%
category: 'done'
method: intTest
test__doc__
	"int.__doc__ should return a str"

	| doc |
	doc := (self int: 42) __doc__.
	self assert: (doc isKindOf: str).
%
category: 'done'
method: intTest
test__eq__

	| a b |
	a := self int: 1.
	b := self int: 2.
	self
		assert: (a __eq__: a);
		assert: (a __eq__: (self int: 1));
		assert: (b __eq__: b);
		assert: (b __eq__: (self int: 2));
		deny: (a __eq__: b);
		deny: (b __eq__: a);
		yourself.
%
category: 'done'
method: intTest
test__float__

   self
		assert: (self int:  3) __float__ __class__ equals: float;
		assert: (self int:  3) __float__ ___value equals: 3;
        assert: (self int: -3) __float__ ___value equals: -3;
		yourself.
%
category: 'done'
method: intTest
test__floor__

   self
		assert: (self int:  3) __floor__ ___value equals: 3;
        assert: (self int: -3) __floor__ ___value equals: -3;
		yourself.
%
category: 'done'
method: intTest
test__floordiv__

	self
		assert: ((self int: 3) __floordiv__: (self int: 4)) ___value equals: 0;
		assert: ((self int: 3) __floordiv__: (self int: 2)) ___value equals: 1;
		assert: ((self int: 4) __floordiv__: (self int: 2)) ___value equals: 2;
		yourself
%
category: 'done'
method: intTest
test__ge__

	self
		deny:   ((self int: 2) __ge__: (self int: 3));
		assert: ((self int: 3) __ge__: (self int: 3));
		assert: ((self int: 4) __ge__: (self int: 3));
		yourself
%
category: 'done'
method: intTest
test__getnewargs__

	| result |
	result := (self int: 5) __getnewargs__.
	self
		assert: result class equals: tuple;
		assert: result ___value size equals: 1;
		assert: (result ___value first) ___value equals: 5.

	result := (self int: -3) __getnewargs__.
	self assert: (result ___value first) ___value equals: -3.
%
category: 'done'
method: intTest
test__gt__

	self
		deny:   ((self int: 2) __gt__: (self int: 3));
		deny:   ((self int: 3) __gt__: (self int: 3));
		assert: ((self int: 4) __gt__: (self int: 3));
		yourself
%
category: 'done'
method: intTest
test__index__

   self
		assert: (self int:  3) __index__ ___value equals: 3;
        assert: (self int: -3) __index__ ___value equals: -3;
		yourself
%
category: 'done'
method: intTest
test__init__

   self assert: int new __init__ ___value equals: nil.

	[
		int new __init__: 1.
		self assert: false.
	] on: TypeError do: [:ex |
		self assert: ex messageText equals: 'object.__init__() takes exactly one argument (the instance to initialize)'
	]
%
category: 'done'
method: intTest
test__int__

   self
		assert: (self int: 3) __int__ ___value equals: 3;
        assert: (self int: -3) __int__ ___value equals: -3;
		yourself.
%
category: 'done'
method: intTest
test__invert__

   self
		assert: (self int:  3) __invert__ ___value equals: -4;
        assert: (self int: -3) __invert__ ___value equals:  2;
        assert: (self int:  0) __invert__ ___value equals: -1;
        assert: (self int:  1) __invert__ ___value equals: -2;
		yourself.
%
category: 'done'
method: intTest
test__le__

	self
		assert: ((self int: 2) __le__: (self int: 3));
		assert: ((self int: 3) __le__: (self int: 3));
		deny:   ((self int: 4) __le__: (self int: 3));
		yourself
%
category: 'done'
method: intTest
test__lshift__

	self
		assert: ((self int:  3) __lshift__: (self int: 1)) ___value equals: 6;
        assert: ((self int:  3) __lshift__: (self int: 2)) ___value equals: 12;
        assert: ((self int: -3) __lshift__: (self int: 1)) ___value equals: -6;
		assert: ((self int: -3) __lshift__: (self int: 2)) ___value equals: -12;
		yourself
%
category: 'done'
method: intTest
test__lt__

	self
		assert: ((self int: 2) __lt__: (self int: 3));
		deny:   ((self int: 3) __lt__: (self int: 3));
		deny:   ((self int: 4) __lt__: (self int: 3));
		yourself
%
category: 'done'
method: intTest
test__mod__

	self
		assert: ((self int: 3) __mod__: (self int: 4)) ___value equals: 3;
		assert: ((self int: 3) __mod__: (self int: 2)) ___value equals: 1;
		assert: ((self int: 4) __mod__: (self int: 2)) ___value equals: 0;
		yourself
%
category: 'done'
method: intTest
test__mul__

   self
        assert: ((self int:  3) __mul__: (self int: 2)) ___value equals: 6;
        assert: ((self int: -3) __mul__: (self int: 2)) ___value equals: -6;
		yourself.
%
category: 'done'
method: intTest
test__ne__

	| a b |
	a := self int: 1.
	b := self int: 2.
	self
		deny: (a __ne__: a);
		deny: (b __ne__: b);
		assert: (a __ne__: b);
		assert: (b __ne__: a);
		yourself.
%
category: 'done'
method: intTest
test__neg__

   self
		assert: (self int: 3) __neg__ ___value equals: -3;
        assert: (self int: -3) __neg__ ___value equals: 3;
		yourself.
%
category: 'done'
method: intTest
test__new__onString

	self
		assert: (int __call__: (self str: '1'))	__repr__ equals: (self str: '1');
		assert: (int __call__: (self str: '+1'))	__repr__ equals: (self str: '1');
	   	assert: (int __call__: (self str: '0'))	__repr__ equals: (self str: '0');
		assert: (int __call__: (self str: '-1'))	__repr__ equals: (self str: '-1');
		assert: (int __call__: (self str: '33'))	__repr__ equals: (self str: '33');
		yourself.
	[
		int __call__: (self str: 'j').
		self assert: false.
	] on: ValueError do: [:ex |
		self assert: ex messageText equals: 'int() arg is a malformed string'.
	].
%
category: 'done'
method: intTest
test__or__

	self
		assert: ((self int:  3) __or__: (self int: 1)) ___value equals: 3;
        assert: ((self int: -3) __or__: (self int: 1)) ___value equals: -3;
        assert: ((self int:  3) __or__: (self int: 2)) ___value equals: 3;
        assert: ((self int: -3) __or__: (self int: 2)) ___value equals: -1;
		yourself.
%
category: 'done'
method: intTest
test__pos__

	self
		assert: (self int: 3) __pos__ ___value equals: 3;
		assert: (self int: -3) __pos__ ___value equals: -3;
		yourself.
%
category: 'done'
method: intTest
test__pow__

	| powHolder |
	self
		assert: ((self int: 3) __pow__: (self int: 2)) ___value equals: 9;
		assert: ((self int: 4) __pow__: (self int: 3)) ___value equals: 64;
		yourself.
	self assert: (((self int: 3) __pow__: (self int: -2)) ___value - (1/9)) abs < 0.0000001.
	self assert: (((self int: 4) __pow__: (self int: -3)) ___value - (1/64)) abs < 0.0000001.
	self
		assert: ((self int: -1) __pow__: (self float: 0.5)) equals: (complex ___real: 0 imaginary: 1);
		yourself.

	powHolder := (self int: 2) __pow__: (complex ___real: 0 imaginary: 1).
	self
		assert: (powHolder real ___value roundTo: 0.000001) equals: 0.769239;
		assert: (powHolder imag ___value roundTo: 0.000001) equals: 0.638961;
		yourself.
%
category: 'done'
method: intTest
test__radd__

   self
        assert: ((self int:  3) __radd__: (self int: 1)) ___value equals: 4;
        assert: ((self int: -3) __radd__: (self int: 1)) ___value equals: -2;
		yourself.
%
category: 'done'
method: intTest
test__rand__

	self
		assert: ((self int:  3) __rand__: (self int: 1)) ___value equals: 1;
        assert: ((self int: -3) __rand__: (self int: 1)) ___value equals: 1;
        assert: ((self int:  3) __rand__: (self int: 2)) ___value equals: 2;
        assert: ((self int: -3) __rand__: (self int: 2)) ___value equals: 0;
		yourself.
%
category: 'done'
method: intTest
test__rdivmod__

	| result |
	result := (self int: 4) __rdivmod__: (self int: 3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(0 3).
	result := (self int: -4) __rdivmod__: (self int: 3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-1 -1).
	result := (self int: -4) __rdivmod__: (self int: -3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(0 -3).
	result := (self int: 3) __rdivmod__: (self int: 4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(1 1).
	result := (self int: -3) __rdivmod__: (self int: 4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-2 -2).
	result := (self int: -3) __rdivmod__: (self int: -4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(1 -1).
	result := (self int: 3) __rdivmod__: (self int: -4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-2 2).
%
category: 'done'
method: intTest
test__rfloordiv__

	self
		assert: ((self int: 4) __rfloordiv__: (self int: 3)) ___value equals: 0;
		assert: ((self int: 2) __rfloordiv__: (self int: 3)) ___value equals: 1;
		assert: ((self int: 2) __rfloordiv__: (self int: 4)) ___value equals: 2;
		yourself
%
category: 'done'
method: intTest
test__rlshift__

	self
		assert: ((self int: 1) __rlshift__:  (self int: 3)) ___value equals:  6;
        assert: ((self int: 2) __rlshift__:  (self int: 3)) ___value equals: 12;
        assert: ((self int: 1) __rlshift__: (self int: -3)) ___value equals: -6;
		assert: ((self int: 2) __rlshift__: (self int: -3)) ___value equals: -12;
		yourself.
%
category: 'done'
method: intTest
test__rmod__

	self
		assert: ((self int: 4) __rmod__: (self int: 3)) ___value equals: 3;
		assert: ((self int: 2) __rmod__: (self int: 3)) ___value equals: 1;
		assert: ((self int: 2) __rmod__: (self int: 4)) ___value equals: 0;
		yourself
%
category: 'done'
method: intTest
test__rmul__

	self
        assert: ((self int:  3) __rmul__: (self int: 2)) ___value equals: 6;
        assert: ((self int: -3) __rmul__: (self int: 2)) ___value equals: -6;
		yourself.
%
category: 'done'
method: intTest
test__ror__
	"Test reverse or: (self int: 3) __ror__: x returns x __or__: (self int: 3)"

	self
		assert: ((self int: 3) __ror__: (self int: 1)) ___value equals: 3;
		assert: ((self int: -3) __ror__: (self int: 1)) ___value equals: -3;
		assert: ((self int: 3) __ror__: (self int: 2)) ___value equals: 3;
		assert: ((self int: -3) __ror__: (self int: 2)) ___value equals: -1;
		yourself.
%
category: 'done'
method: intTest
test__round__

   self
		assert: (self int:  3) __round__ ___value equals: 3;
        assert: (self int: -3) __round__ ___value equals: -3;
		yourself.
%
category: 'done'
method: intTest
test__rpow__

	self
		assert: ((self int: 2) __rpow__: (self int: 3)) ___value equals: 9;
		assert: ((self int: 3) __rpow__: (self int: 4)) ___value equals: 64;
		yourself.
%
category: 'done'
method: intTest
test__rrshift__

	self
		assert: ((self int: 1) __rrshift__: (self int:  3)) ___value equals: 1;
        assert: ((self int: 2) __rrshift__: (self int:  3)) ___value equals:  0;
        assert: ((self int: 1) __rrshift__: (self int: -3)) ___value equals: -2;
		assert: ((self int: 2) __rrshift__: (self int: -3)) ___value equals: -1;
		yourself.
%
category: 'done'
method: intTest
test__rshift__

	self
		assert: ((self int:  3) __rshift__: (self int: 1)) ___value equals: 1;
        assert: ((self int:  3) __rshift__: (self int: 2)) ___value equals: 0;
        assert: ((self int: -3) __rshift__: (self int: 1)) ___value equals: -2;
		assert: ((self int: -3) __rshift__: (self int: 2)) ___value equals: -1;
		yourself.
%
category: 'done'
method: intTest
test__rsub__

	self
        assert: ((self int:  3) __rsub__: (self int: 1)) ___value equals: -2;
        assert: ((self int: -3) __rsub__: (self int: 1)) ___value equals:  4;
		yourself.
%
category: 'done'
method: intTest
test__rtruediv__

	self
		assert: ((self int: 1) __rtruediv__: (self int: 3)) __class__ equals: float;
    	assert: ((self int: 1) __rtruediv__: (self int: 3)) ___value equals: 3;
        assert: ((self int: 2) __rtruediv__: (self int: -4)) ___value equals: -2;
		yourself.
%
category: 'done'
method: intTest
test__rxor__

   self
		assert: ((self int:  3) __rxor__: (self int: 1)) ___value equals: 2;
        assert: ((self int: -3) __rxor__: (self int: 1)) ___value equals: -4;
        assert: ((self int:  3) __rxor__: (self int: 2)) ___value equals: 1;
        assert: ((self int: -3) __rxor__: (self int: 2)) ___value equals: -1;
		yourself.
%
category: 'done'
method: intTest
test__sub__

   self
        assert: ((self int:  3) __sub__: (self int: 1)) ___value equals: 2;
        assert: ((self int: -3) __sub__: (self int: 1)) ___value equals: -4;
		yourself
%
category: 'done'
method: intTest
test__truediv__

	self
		assert: ((self int:  3) __truediv__: (self int: 1)) __class__ equals: float;
    	assert: ((self int:  3) __truediv__: (self int: 1)) ___value equals: 3;
        assert: ((self int: -4) __truediv__: (self int: 2)) ___value equals: -2;

		assert: ((self int:  3) __truediv__: (self float: 1)) __class__ equals: float;
    	assert: ((self int:  3) __truediv__: (self float: 1)) ___value equals: 3;
        assert: ((self int: -4) __truediv__: (self float: 2)) ___value equals: -2;

		assert: ((self int:  1) __truediv__: (complex ___real: 1 imaginary:1)) __class__ equals: complex;
    	assert: ((self int:  1) __truediv__: (complex ___real: 1 imaginary:1)) equals: (complex ___real: 0.5 imaginary:-0.5);
		yourself.
%
category: 'done'
method: intTest
test__trunc__

	self
		assert: (self int:  3) __trunc__ ___value equals: 3;
        assert: (self int: -3) __trunc__ ___value equals: -3;
		yourself.
%
category: 'done'
method: intTest
test__xor__

	self
		assert: ((self int:  3) __xor__: (self int: 1)) ___value equals: 2;
        assert: ((self int: -3) __xor__: (self int: 1)) ___value equals: -4;
        assert: ((self int:  3) __xor__: (self int: 2)) ___value equals: 1;
        assert: ((self int: -3) __xor__: (self int: 2)) ___value equals: -1;
		yourself.
%
category: 'done'
method: intTest
test_as_integer_ratio

	| result |
	result := (self int: 3) as_integer_ratio.
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(3 1).
	result := (self int: -3) as_integer_ratio.
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-3 1).
	result := (self int: 0) as_integer_ratio.
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(0 1).
%
category: 'done'
method: intTest
test_bit_count

	self
		assert: (self int:  7) bit_count ___value equals: 3;   "binary 111"
		assert: (self int:  4) bit_count ___value equals: 1;   "binary 100"
		assert: (self int:  3) bit_count ___value equals: 2;   "binary 11"
		assert: (self int: -3) bit_count ___value equals: 2;   "abs value"
		assert: (self int: 255) bit_count ___value equals: 8;  "binary 11111111"
		assert: (self int:  0) bit_count ___value equals: 0;
		yourself.
%
category: 'done'
method: intTest
test_bit_length

	self
		assert: (self int:  7) bit_length ___value equals: 3;
        assert: (self int:  4) bit_length ___value equals: 3;
        assert: (self int:  3) bit_length ___value equals: 2;
        assert: (self int: -3) bit_length ___value equals: 2;
        assert: (self int: -1) bit_length ___value equals: 1;
        assert: (self int:  1) bit_length ___value equals: 1;
        assert: (self int:  0) bit_length ___value equals: 0;
		yourself.
%
category: 'done'
method: intTest
test_conjugate

	self
		assert: (self int:  3) conjugate ___value equals: 3;
        assert: (self int: -3) conjugate ___value equals: -3;
		yourself.
%
category: 'done'
method: intTest
test_denominator

	self
		assert: (self int:  3) denominator ___value equals: 1;
        assert: (self int: -3) denominator ___value equals: 1;
		yourself
%
category: 'done'
method: intTest
test_from_bytes

	"Test big-endian"
	self assert: (int from_bytes: (bytes ___value: #[0 16]) _: (str ___value: 'big')) ___value equals: 16.
	self assert: (int from_bytes: (bytes ___value: #[1 0]) _: (str ___value: 'big')) ___value equals: 256.

	"Test little-endian"
	self assert: (int from_bytes: (bytes ___value: #[0 16]) _: (str ___value: 'little')) ___value equals: 4096.
	self assert: (int from_bytes: (bytes ___value: #[1 0]) _: (str ___value: 'little')) ___value equals: 1.

	"Test signed - positive"
	self assert: (int from_bytes: (bytes ___value: #[127]) _: (str ___value: 'big') _: False) ___value equals: 127.
	self assert: (int from_bytes: (bytes ___value: #[127]) _: (str ___value: 'big') _: True) ___value equals: 127.

	"Test signed - negative"
	self assert: (int from_bytes: (bytes ___value: #[255]) _: (str ___value: 'big') _: False) ___value equals: 255.
	self assert: (int from_bytes: (bytes ___value: #[255]) _: (str ___value: 'big') _: True) ___value equals: -1.
	self assert: (int from_bytes: (bytes ___value: #[255 255]) _: (str ___value: 'big') _: True) ___value equals: -1.
%
category: 'done'
method: intTest
test_imag

	self
		assert: (self int: 3) imag  ___value equals: 0;
        assert: (self int: -3) imag ___value equals: 0;
		yourself.
%
category: 'done'
method: intTest
test_is_integer

	self
		assert: (self int: 0) is_integer == True;
		assert: (self int: 3) is_integer == True;
		assert: (self int: -3) is_integer == True;
		yourself.
%
category: 'done'
method: intTest
test_numerator

	self
		assert: (self int: 3) numerator ___value equals: 3;
        assert: (self int: -3) numerator ___value equals: -3;
		yourself.
%
category: 'done'
method: intTest
test_real

	self
		assert: (self int: 3) real ___value equals: 3;
        assert: (self int: -3) real ___value equals: -3;
		yourself.
%
category: 'done'
method: intTest
test_to_bytes

	| result |
	"Test big-endian"
	result := (self int: 1024) to_bytes: (int ___value: 2) _: (str ___value: 'big').
	self assert: result ___container equals: #[4 0].

	"Test little-endian"
	result := (self int: 1024) to_bytes: (int ___value: 2) _: (str ___value: 'little').
	self assert: result ___container equals: #[0 4].

	"Test with more bytes"
	result := (self int: 256) to_bytes: (int ___value: 4) _: (str ___value: 'big').
	self assert: result ___container equals: #[0 0 1 0].

	"Test signed negative"
	result := (self int: -1) to_bytes: (int ___value: 2) _: (str ___value: 'big') _: True.
	self assert: result ___container equals: #[255 255].

	result := (self int: -128) to_bytes: (int ___value: 1) _: (str ___value: 'big') _: True.
	self assert: result ___container equals: #[128].
%
category: 'done'
method: intTest
testas_integer_ratio
	"int.as_integer_ratio() returns (n, 1) tuple"

	| result |
	result := (self int: 42) as_integer_ratio.
	self assert: (result isKindOf: tuple).
	self assert: (result __getitem__: (self int: 0)) ___value equals: 42.
	self assert: (result __getitem__: (self int: 1)) ___value equals: 1.

	result := (self int: -5) as_integer_ratio.
	self assert: (result __getitem__: (self int: 0)) ___value equals: -5.
	self assert: (result __getitem__: (self int: 1)) ___value equals: 1.
%
category: 'done'
method: intTest
testbit_count
	"int.bit_count() returns number of 1s in binary representation"

	self
		assert: (self int: 0) bit_count ___value equals: 0;
		assert: (self int: 1) bit_count ___value equals: 1;
		assert: (self int: 7) bit_count ___value equals: 3;
		assert: (self int: 19) bit_count ___value equals: 3;
		assert: (self int: -19) bit_count ___value equals: 3;
		yourself.
%
category: 'done'
method: intTest
testbit_length
	"int.bit_length() returns number of bits to represent integer"

	self
		assert: (self int: 0) bit_length ___value equals: 0;
		assert: (self int: 1) bit_length ___value equals: 1;
		assert: (self int: 2) bit_length ___value equals: 2;
		assert: (self int: 37) bit_length ___value equals: 6;
		assert: (self int: -37) bit_length ___value equals: 6;
		yourself.
%
category: 'done'
method: intTest
testdenominator
	"int.denominator always returns 1"

	self
		assert: (self int: 42) denominator ___value equals: 1;
		assert: (self int: 0) denominator ___value equals: 1;
		assert: (self int: -5) denominator ___value equals: 1;
		yourself.
%
category: 'done'
method: intTest
testfrom_bytes
	"int.from_bytes() class method"

	self
		assert: (int from_bytes: (bytes ___value: #[0 42]) _: (str ___value: 'big')) ___value equals: 42;
		assert: (int from_bytes: (bytes ___value: #[42 0]) _: (str ___value: 'little')) ___value equals: 42;
		assert: (int from_bytes: (bytes ___value: #[0 0 1 0]) _: (str ___value: 'big')) ___value equals: 256;
		yourself.
%
category: 'done'
method: intTest
testimag
	"int.imag always returns 0"

	self
		assert: (self int: 42) imag ___value equals: 0;
		assert: (self int: -5) imag ___value equals: 0;
		yourself.
%
category: 'done'
method: intTest
testis_integer
	"int.is_integer() always returns True"

	self
		assert: (self int: 42) is_integer == True;
		assert: (self int: 0) is_integer == True;
		assert: (self int: -5) is_integer == True;
		yourself.
%
category: 'done'
method: intTest
testnumerator
	"int.numerator returns self"

	| n |
	n := self int: 42.
	self assert: n numerator == n.

	n := self int: -5.
	self assert: n numerator == n.
%
category: 'done'
method: intTest
testreal
	"int.real returns self"

	| n |
	n := self int: 42.
	self assert: n real == n.

	n := self int: -5.
	self assert: n real == n.
%
category: 'done'
method: intTest
testto_bytes
	"int.to_bytes() method"

	| result |
	result := (self int: 42) to_bytes: (self int: 2) _: (str ___value: 'big').
	self assert: (result isKindOf: bytes).
	self assert: result ___value equals: #[0 42].

	result := (self int: 42) to_bytes: (self int: 2) _: (str ___value: 'little').
	self assert: result ___value equals: #[42 0].

	result := (self int: 256) to_bytes: (self int: 4) _: (str ___value: 'big').
	self assert: result ___value equals: #[0 0 1 0].
%
category: 'done'
method: intTest
zero

	^int ___value: 0
%
category: 'todo'
method: intTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__abs__' '__add__' '__and__' '__bool__' '__ceil__' '__class__' '__delattr__' '__dir__' '__divmod__' '__doc__' '__eq__' '__float__' '__floor__' '__floordiv__' '__format__' '__ge__' '__getattribute__' '__getnewargs__' '__gt__' '__hash__' '__index__' '__init__' '__init_subclass__' '__int__' '__invert__' '__le__' '__lshift__' '__lt__' '__mod__' '__mul__' '__ne__' '__neg__' '__new__' '__or__' '__pos__' '__pow__' '__radd__' '__rand__' '__rdivmod__' '__reduce__' '__reduce_ex__' '__repr__' '__rfloordiv__' '__rlshift__' '__rmod__' '__rmul__' '__ror__' '__round__' '__rpow__' '__rrshift__' '__rshift__' '__rsub__' '__rtruediv__' '__rxor__' '__setattr__' '__sizeof__' '__str__' '__sub__' '__subclasshook__' '__truediv__' '__trunc__' '__xor__' 'as_integer_ratio' 'bit_length' 'conjugate' 'denominator' 'from_bytes' 'imag' 'numerator' 'real' 'to_bytes')
	"

	#pyTodo.
	false ifTrue: [
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: 71."
   self assert: (dir __contains__: (self str: '__abs__')).
   self assert: (dir __contains__: (self str: '__add__')).
   self assert: (dir __contains__: (self str: '__and__')).
   self assert: (dir __contains__: (self str: '__bool__')).
   self assert: (dir __contains__: (self str: '__ceil__')).
   self assert: (dir __contains__: (self str: '__class__')).
   self assert: (dir __contains__: (self str: '__delattr__')).
   self assert: (dir __contains__: (self str: '__dir__')).
   self assert: (dir __contains__: (self str: '__divmod__')).
   self assert: (dir __contains__: (self str: '__doc__')).
   self assert: (dir __contains__: (self str: '__eq__')).
   self assert: (dir __contains__: (self str: '__float__')).
   self assert: (dir __contains__: (self str: '__floor__')).
   self assert: (dir __contains__: (self str: '__floordiv__')).
   self assert: (dir __contains__: (self str: '__format__')).
   self assert: (dir __contains__: (self str: '__ge__')).
   self assert: (dir __contains__: (self str: '__getattribute__')).
   #pyTodo. "self assert: (dir __contains__: (self str: '__getnewargs__'))."
   self assert: (dir __contains__: (self str: '__gt__')).
   self assert: (dir __contains__: (self str: '__hash__')).
   self assert: (dir __contains__: (self str: '__index__')).
   self assert: (dir __contains__: (self str: '__init__')).
   #pyTodo. "self assert: (dir __contains__: (self str: '__init_subclass__'))."
   self assert: (dir __contains__: (self str: '__int__')).
   self assert: (dir __contains__: (self str: '__invert__')).
   self assert: (dir __contains__: (self str: '__le__')).
   self assert: (dir __contains__: (self str: '__lshift__')).
   self assert: (dir __contains__: (self str: '__lt__')).
   self assert: (dir __contains__: (self str: '__mod__')).
   self assert: (dir __contains__: (self str: '__mul__')).
   self assert: (dir __contains__: (self str: '__ne__')).
   self assert: (dir __contains__: (self str: '__neg__')).
   self assert: (dir __contains__: (self str: '__new__')).
   self assert: (dir __contains__: (self str: '__or__')).
   self assert: (dir __contains__: (self str: '__pos__')).
   self assert: (dir __contains__: (self str: '__pow__')).
   self assert: (dir __contains__: (self str: '__radd__')).
   self assert: (dir __contains__: (self str: '__rand__')).
   self assert: (dir __contains__: (self str: '__rdivmod__')).
   #pyTodo. "self assert: (dir __contains__: (self str: '__reduce__'))."
   #pyTodo. "self assert: (dir __contains__: (self str: '__reduce_ex__'))."
   self assert: (dir __contains__: (self str: '__repr__')).
   self assert: (dir __contains__: (self str: '__rfloordiv__')).
   self assert: (dir __contains__: (self str: '__rlshift__')).
   self assert: (dir __contains__: (self str: '__rmod__')).
   self assert: (dir __contains__: (self str: '__rmul__')).
   self assert: (dir __contains__: (self str: '__ror__')).
   self assert: (dir __contains__: (self str: '__round__')).
   self assert: (dir __contains__: (self str: '__rpow__')).
   self assert: (dir __contains__: (self str: '__rrshift__')).
   self assert: (dir __contains__: (self str: '__rshift__')).
   self assert: (dir __contains__: (self str: '__rsub__')).
   self assert: (dir __contains__: (self str: '__rtruediv__')).
   self assert: (dir __contains__: (self str: '__rxor__')).
   self assert: (dir __contains__: (self str: '__setattr__')).
   self assert: (dir __contains__: (self str: '__sizeof__')).
   self assert: (dir __contains__: (self str: '__str__')).
   self assert: (dir __contains__: (self str: '__sub__')).
   self assert: (dir __contains__: (self str: '__subclasshook__')).
   self assert: (dir __contains__: (self str: '__truediv__')).
   self assert: (dir __contains__: (self str: '__trunc__')).
   self assert: (dir __contains__: (self str: '__xor__')).
   #pyTodo. "self assert: (dir __contains__: (self str: 'as_integer_ratio)."
   self assert: (dir __contains__: (self str: 'bit_length')).
    self assert: (dir __contains__: (self str: 'conjugate')).
    self assert: (dir __contains__: (self str: 'denominator')).
   #pyTodo. "self assert: (dir __contains__: (self str: 'from_bytes'))."
   self assert: (dir __contains__: (self str: 'imag')).
    self assert: (dir __contains__: (self str: 'numerator')).
   self assert: (dir __contains__: (self str: 'real')).
   #pyTodo. "self assert: (dir __contains__: (self str: 'to_bytes'))."
	]
%
