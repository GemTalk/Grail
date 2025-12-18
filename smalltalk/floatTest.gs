! ------------------- Remove existing behavior from floatTest
removeallmethods floatTest
removeallclassmethods floatTest
! ------------------- Class methods for floatTest
! ------------------- Instance methods for floatTest
category: 'done'
method: floatTest
test___getformat__

	| result |
	result := float __getformat__: (str ___value: 'double').
	self assert: result ___value equals: 'IEEE, little-endian'.

	result := float __getformat__: (str ___value: 'float').
	self assert: result ___value equals: 'IEEE, little-endian'.
%
category: 'done'
method: floatTest
test__abs__

	self
		assert: (self float: 3.5) __abs__ ___value equals: 3.5;
        assert: (self float: -3.5) __abs__ ___value equals: 3.5;
		assert: (self float: 3) __abs__ ___value equals: 3;
        assert: (self float: -3) __abs__ ___value equals: 3;
		yourself
%
category: 'done'
method: floatTest
test__add__

	self
        assert: ((self float:  3) __add__: (self int: 	1)) ___value equals: 4;
        assert: ((self float: -3) __add__: (self int: 	1)) ___value equals: -2;
        assert: ((self float:  3) __add__: (self float: 	1)) ___value equals: 4;
        assert: ((self float: -3) __add__: (self float: 	1)) ___value equals: -2;
		yourself.
%
category: 'done'
method: floatTest
test__bool__

	self
		assert: (self float:  3) __bool__;
        assert: (self float: -3) __bool__;
        assert: (self float: -1) __bool__;
        assert: (self float:  1) __bool__;
        deny:   (self float:  0) __bool__;
		yourself.
%
category: 'done'
method: floatTest
test__ceil__

	self
		assert: (self float:  3.5) __ceil__ __class__ equals: int;
        assert: (self float:  3.5) __ceil__ ___value equals: 4;
        assert: (self float: -3.5) __ceil__ ___value equals: -3;
		yourself.
%
category: 'done'
method: floatTest
test__class__
	"float.__class__ should return the float class"

	self assert: (self float: 3.14) __class__ equals: float.
%
category: 'done'
method: floatTest
test__delattr__
	"float.__delattr__ should raise AttributeError"

	self should: [(self float: 3.14) __delattr__: (str ___value: 'foo')] raise: AttributeError.
%
category: 'done'
method: floatTest
test__dir__
	"float.__dir__ should return a list of attribute names"

	| dir |
	dir := (self float: 3.14) __dir__.
	self assert: dir class equals: list.
	self assert: (dir __contains__: (str ___value: '__abs__')) ___value.
	self assert: (dir __contains__: (str ___value: '__add__')) ___value.
	self assert: (dir __contains__: (str ___value: 'real')) ___value.
%
category: 'done'
method: floatTest
test__divmod__

	| result |
	result := (self float: 3) __divmod__: (self int: 4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(0.0 3.0).
	result := (self float: 3) __divmod__: (self int: -4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-1.0 -1.0).
	result := (self float: -3) __divmod__: (self int: -4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(0.0 -3.0).
	result := (self float: 4) __divmod__: (self int: 3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(1.0 1.0).
	result := (self float: 4) __divmod__: (self int: -3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-2.0 -2.0).
	result := (self float: -4) __divmod__: (self int: -3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(1.0 -1.0).
	result := (self float: -4) __divmod__: (self int: 3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-2.0 2.0).
%
category: 'done'
method: floatTest
test__doc__
	"float.__doc__ should return a str or None"

	| doc |
	doc := (self float: 3.14) __doc__.
	self assert: (doc == None or: [doc isKindOf: str]).
%
category: 'done'
method: floatTest
test__eq__

	| a b |
	a := self float: 1.2.
	b := self float: 2.1.
	self
		assert: (a __eq__: a);
		assert: (a __eq__: (self float: 1.2));
		assert: (b __eq__: b);
		assert: (b __eq__: (self float: 2.1));
		deny: (a __eq__: b);
		deny: (b __eq__: a);
		yourself.
%
category: 'done'
method: floatTest
test__float__

	self
		assert: (self float:  3) __float__ __class__ equals: float;
        assert: (self float:  3) __float__ ___value equals: 3;
        assert: (self float: -3) __float__ ___value equals: -3;
		assert: (self float:  3) __float__ ___value equals:  3;
        assert: (self float: -3) __float__ ___value equals: -3;
		yourself
%
category: 'done'
method: floatTest
test__floor__

	self
		assert: (self float:  3.5) __floor__ __class__ equals: int;
        assert: (self float:  3.5) __floor__ ___value equals: 3;
        assert: (self float: -3.5) __floor__ ___value equals: -4;
	    yourself
%
category: 'done'
method: floatTest
test__floordiv__

	self
		assert: ((self float: 3.5) 	__floordiv__: (self int: 4)) 	__class__ equals: int;
		assert: ((self float: 3.5) 	__floordiv__: (self int: 4)) 		___value equals: 0;
		assert: ((self float: 3.5) 	__floordiv__: (self int: 2)) 		___value equals: 1;
		assert: ((self float: 3.5) 	__floordiv__: (self float: 1.75)) 	___value equals: 2;
		assert: ((self float: 4) 		__floordiv__: (self int: 2)) 		___value equals: 2;
		yourself
%
category: 'done'
method: floatTest
test__format__
	"float.__format__ should format the float according to format spec"

	self
		assert: ((self float: 3.14159) __format__: (str ___value: '.2f')) ___value equals: '3.14';
		assert: ((self float: 3.14159) __format__: (str ___value: '')) ___value equals: '3.14159';
		yourself.
%
category: 'done'
method: floatTest
test__ge__

	self
		deny:   ((self float: 2) __ge__: (self int: 3));
		assert: ((self float: 3) __ge__: (self int: 3));
		assert: ((self float: 4) __ge__: (self int: 3));
		deny:   ((self float: 2) __ge__: (self float: 3));
		assert: ((self float: 3) __ge__: (self float: 3));
		assert: ((self float: 4) __ge__: (self float: 3));
		yourself
%
category: 'done'
method: floatTest
test__getattribute__
	"float.__getattribute__ should get attributes"

	self assert: ((self float: 3.14) __getattribute__: (str ___value: 'real')) ___value equals: 3.14.
	self should: [(self float: 3.14) __getattribute__: (str ___value: 'nonexistent')] raise: AttributeError.
%
category: 'done'
method: floatTest
test__getnewargs__

	| result |
	result := (float ___value: 3.14) __getnewargs__.
	self
		assert: result class equals: tuple;
		assert: result ___value size equals: 1;
		assert: (result ___value first) ___value equals: 3.14.
%
category: 'done'
method: floatTest
test__gt__

	self
		deny:   ((self float: 2) __gt__: (self int: 3));
		deny:   ((self float: 3) __gt__: (self int: 3));
		assert: ((self float: 4) __gt__: (self int: 3));
		deny:   ((self float: 2) __gt__: (self float: 3));
		deny:   ((self float: 3) __gt__: (self float: 3));
		assert: ((self float: 4) __gt__: (self float: 3));
		yourself
%
category: 'done'
method: floatTest
test__hash__
	"float.__hash__ should return consistent hash values"

	| h1 h2 |
	h1 := (self float: 3.14) __hash__.
	h2 := (self float: 3.14) __hash__.
	self assert: h1 equals: h2.
	"Hash of integer-valued float should equal hash of that integer"
	self assert: (self float: 3.0) __hash__ equals: (self int: 3) __hash__.
%
category: 'done'
method: floatTest
test__int__

	self
		assert: (self float:  3.5) __int__ __class__ equals: int;
        assert: (self float:  3.5) __int__ ___value equals: 3;
        assert: (self float: -3.5) __int__ ___value equals: -3;
		yourself.
%
category: 'done'
method: floatTest
test__le__

	self
		assert: ((self float: 2) __le__: (self int: 3));
		assert: ((self float: 3) __le__: (self int: 3));
		deny:   ((self float: 4) __le__: (self int: 3));
		assert: ((self float: 2) __le__: (self float: 3));
		assert: ((self float: 3) __le__: (self float: 3));
		deny:   ((self float: 4) __le__: (self float: 3));
		yourself
%
category: 'done'
method: floatTest
test__lt__

	self
		assert: ((self float: 2) __lt__: (self int: 3));
		deny:   ((self float: 3) __lt__: (self int: 3));
		deny:   ((self float: 4) __lt__: (self int: 3));
		assert: ((self float: 2) __lt__: (self float: 3));
		deny:   ((self float: 3) __lt__: (self float: 3));
		deny:   ((self float: 4) __lt__: (self float: 3));
		yourself
%
category: 'done'
method: floatTest
test__mod__

	self
		assert: ((self float: 3) __mod__: (self int: 4)) ___value equals: 3;
		assert: ((self float: 3) __mod__: (self int: 2)) ___value equals: 1;
		assert: ((self float: 4) __mod__: (self int: 2)) ___value equals: 0;
		yourself
%
category: 'done'
method: floatTest
test__mul__

	self
		assert: ((self float:  3) __mul__: (self int: 2)) ___value equals: 6;
        assert: ((self float: -3) __mul__: (self int: 2)) ___value equals: -6;
        assert: ((self float:  3) __mul__: (self float: 2)) ___value equals: 6;
        assert: ((self float: -3) __mul__: (self float: 2)) ___value equals: -6;
		yourself.
%
category: 'done'
method: floatTest
test__ne__

	| a b |
	a := self float: 1.
	b := self float: 2.
	self
		deny: (a __ne__: a);
		deny: (a __ne__: (self int: 1));
		deny: (b __ne__: b);
		deny: (b __ne__: (self int: 2));
		assert: (a __ne__: b);
		assert: (b __ne__: a);
		yourself.
%
category: 'done'
method: floatTest
test__neg__

   self
		assert: (self float: 3) __neg__ ___value equals: -3;
        assert: (self float: -3) __neg__ ___value equals: 3;
		yourself.
%
category: 'done'
method: floatTest
test__new__
	"float.__new__ should create new instances"

	| f |
	f := float __new__.
	self assert: f class equals: float.
	self assert: f ___value equals: 0.0.
%
category: 'done'
method: floatTest
test__pos__

	self
		assert: (self float: 3) __pos__ ___value equals: 3;
        assert: (self float: -3) __pos__ ___value equals: 3;
		yourself.
%
category: 'done'
method: floatTest
test__pow__

	| powHolder |
	self
		assert: ((self float: 3.5) __pow__: (self int: 2)) ___value equals: 12.25;
		assert: ((self float: 4) __pow__: (self int: 3)) ___value equals: 64;
		assert: ((self float: 4) __pow__: (self float: 3.0)) ___value equals: 64;
		assert: ((self float: -1) __pow__: (self float: 0.5)) equals: (complex ___real: 0 imaginary: 1);
		yourself.

	powHolder := (self float: 2) __pow__: (complex ___real: 0 imaginary: 1).
	self
		assert: (powHolder real ___value roundTo: 0.000001) equals: 0.769239;
		assert: (powHolder imag ___value roundTo: 0.000001) equals: 0.638961;
		yourself.
%
category: 'done'
method: floatTest
test__radd__

	self
		assert: (((self float:  3) __radd__: (self int: 1)) __class__) equals: float;
        assert: ((self float:  3) __radd__: (self int: 1)) ___value equals: 4;
        assert: ((self float: -3) __radd__: (self int: 1)) ___value equals: -2;
        assert: ((self float:  3) __radd__: (self float: 1)) ___value equals: 4;
        assert: ((self float: -3) __radd__: (self float: 1)) ___value equals: -2;
		yourself.
%
category: 'done'
method: floatTest
test__rdivmod__

	| result |
	result := (self float: 4) __rdivmod__: (self int: 3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(0 3).
	result := (self float: -4) __rdivmod__: (self int: 3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-1 -1).
	result := (self float: -4) __rdivmod__: (self int: -3).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(0 -3).
	result := (self float: 3) __rdivmod__: (self int: 4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(1 1).
	result := (self float: -3) __rdivmod__: (self int: 4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-2 -2).
	result := (self float: -3) __rdivmod__: (self int: -4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(1 -1).
	result := (self float: 3) __rdivmod__: (self int: -4).
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-2 2).
%
category: 'done'
method: floatTest
test__repr__

	self
		assert: (self float: 3.0) __repr__ ___value equals: '3.0';
		assert: (self float: -3.5) __repr__ ___value equals: '-3.5';
		assert: (self float: 0.0) __repr__ ___value equals: '0.0';
		assert: (self float: 123.456) __repr__ ___value equals: '123.456';
		yourself.
%
category: 'done'
method: floatTest
test__rfloordiv__

	self
		assert: ((self float: 4) __rfloordiv__: (self int: 3)) __class__ equals: int;
		assert: ((self float: 4) __rfloordiv__: (self int: 3)) ___value equals: 0;
		assert: ((self float: 2) __rfloordiv__: (self int: 3)) ___value equals: 1;
		assert: ((self float: 2) __rfloordiv__: (self int: 4)) ___value equals: 2;
		yourself
%
category: 'done'
method: floatTest
test__rmod__

	self
		assert: ((self float: 4.5) __rmod__: (self int: 3)) ___value equals: 3;
		assert: ((self float: 4) __rmod__: (self int: 3)) ___value equals: 3;
		assert: ((self float: 2) __rmod__: (self int: 3)) ___value equals: 1;
		assert: ((self float: 2) __rmod__: (self int: 4)) ___value equals: 0;
		yourself
%
category: 'done'
method: floatTest
test__rmul__

	self
		assert: ((self float:  3.2) 	__rmul__: (self int: 2)) 		___value equals: 6.4;
        assert: ((self float: -3) 	__rmul__: (self int: 2)) 		___value equals: -6;
        assert: ((self float:  3) 		__rmul__: (self float: 2)) 	___value equals: 6;
        assert: ((self float: -3) 	__rmul__: (self float: 2)) 	___value equals: -6;
		yourself
%
category: 'done'
method: floatTest
test__round__

	self
		assert: (self float:  3.5) 	__round__ __class__ equals: int;
        assert: (self float:  3.5) 	__round__ ___value equals: 4;
        assert: (self float:  3.49)	__round__ ___value equals: 3;
        assert: (self float: -3.5) 	__round__ ___value equals: -4;
        assert: (self float: -3.49) 	__round__ ___value equals: -3;
		assert: (self float:  2.5) 	__round__ ___value equals: 2;
	    yourself
%
category: 'done'
method: floatTest
test__rpow__

	self
		assert: ((self float: 2) __rpow__: (self float: 3.25)) ___value equals: 10.5625;
		assert: ((self float: 3) __rpow__: (self int: 4)) ___value equals: 64;
		yourself.
%
category: 'done'
method: floatTest
test__rsub__

	self
		assert: ((self float:  3) __rsub__: (self int: 1)) ___value equals: -2;
        assert: ((self float: -3) __rsub__: (self int: 1)) ___value equals: 4;
        assert: ((self float:  3) __rsub__: (self float: 1)) ___value equals: -2;
        assert: ((self float: -3) __rsub__: (self float: 1)) ___value equals: 4;
		yourself.
%
category: 'done'
method: floatTest
test__rtruediv__

	self
		assert: ((self float: 1) __rtruediv__: (self int: 3)) __class__ equals: float;
    	assert: ((self float: 1) __rtruediv__: (self int: 3)) ___value equals: 3;
        assert: ((self float: 2) __rtruediv__: (self int: -4)) ___value equals: -2;
		yourself.
%
category: 'done'
method: floatTest
test__setattr__
	"float.__setattr__ should raise TypeError/AttributeError"

	self should: [(self float: 3.14) __setattr__: (str ___value: 'foo') _: (self int: 1)] raise: AttributeError.
%
category: 'done'
method: floatTest
test__sizeof__
	"float.__sizeof__ should return an int"

	| size |
	size := (self float: 3.14) __sizeof__.
	self assert: (size isKindOf: int).
	self assert: size ___value > 0.
%
category: 'done'
method: floatTest
test__str__
	"float.__str__ should return string representation"

	self
		assert: (self float: 3.14) __str__ ___value equals: '3.14';
		assert: (self float: 3.0) __str__ ___value equals: '3.0';
		assert: (self float: -0.0) __str__ ___value equals: '-0.0';
		yourself.
%
category: 'done'
method: floatTest
test__sub__

	self
		assert: ((self float:  3) __sub__: (self int: 1)) ___value equals: 2;
        assert: ((self float: -3) __sub__: (self int: 1)) ___value equals: -4;
        assert: ((self float:  3) __sub__: (self float: 1)) ___value equals: 2;
        assert: ((self float: -3) __sub__: (self float: 1)) ___value equals: -4;
		yourself.
%
category: 'done'
method: floatTest
test__subclasshook__
	"float.__subclasshook__ should return NotImplemented"

	self assert: (self float: 3.14) __subclasshook__ == NotImplementedType singleton.
%
category: 'done'
method: floatTest
test__truediv__

	self
		assert: ((self float:  3) __truediv__: (self int: 1)) __class__ equals: float;
    	assert: ((self float:  3) __truediv__: (self int: 1)) ___value equals: 3;
        assert: ((self float: -4) __truediv__: (self int: 2)) ___value equals: -2;

		assert: ((self float:  3) __truediv__: (self float: 1)) __class__ equals: float;
    	assert: ((self float:  3) __truediv__: (self float: 1)) ___value equals: 3;
        assert: ((self float: -4) __truediv__: (self float: 2)) ___value equals: -2;

		assert: ((self float:  1) __truediv__: (complex ___real: 1 imaginary:1)) __class__ equals: complex;
    	assert: ((self float:  1) __truediv__: (complex ___real: 1 imaginary:1)) equals: (complex ___real: 0.5 imaginary:-0.5);
		yourself.
%
category: 'done'
method: floatTest
test__trunc__

	self
		assert: (self float:  3.5) __trunc__ __class__ equals: int;
        assert: (self float:  3.5) __trunc__ ___value equals: 3;
        assert: (self float: -3.5) __trunc__ ___value equals: -3;
		yourself.
%
category: 'done'
method: floatTest
test_as_integer_ratio

	| result |
	result := (self float: 3) as_integer_ratio.
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(3 1).
	result := (self float: -3) as_integer_ratio.
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-3 1).
	result := (self float: -0.25) as_integer_ratio.
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(-1 4).
	result := (self float: 0) as_integer_ratio.
	self
		assert: (result ___container collect: [:each | each ___value]) asArray equals: #(0 1).
%
category: 'done'
method: floatTest
test_conjugate

	self
		assert: (self float:  3.4) conjugate ___value equals: 3.4;
        assert: (self float: -3) conjugate ___value equals: -3;
		yourself.
%
category: 'done'
method: floatTest
test_from_number
	"float.from_number should create a float from a number"

	self
		assert: (float from_number: (self int: 42)) ___value equals: 42.0;
		assert: (float from_number: (self float: 3.14)) ___value equals: 3.14;
		yourself.
%
category: 'done'
method: floatTest
test_fromhex

	self
		assert: (float fromhex: (str ___value: '0x1.0p+0')) ___value equals: 1.0;
		assert: (float fromhex: (str ___value: '0x1.0p+1')) ___value equals: 2.0;
		assert: (float fromhex: (str ___value: '0x1.0p-1')) ___value equals: 0.5;
		assert: (float fromhex: (str ___value: '-0x1.0p+0')) ___value equals: -1.0;
		assert: (float fromhex: (str ___value: '0xff')) ___value equals: 255.0;
		yourself.
%
category: 'done'
method: floatTest
test_hex

	| result |
	"Test basic values"
	result := (float ___value: 1.0) hex ___value.
	self assert: (result beginsWith: '0x1.').
	self assert: (result includesString: 'p+0').

	"Test negative"
	result := (float ___value: -1.0) hex ___value.
	self assert: (result beginsWith: '-0x1.').

	"Test zero"
	result := (float ___value: 0.0) hex ___value.
	self assert: result equals: '0x0.0000000000000p+0'.
%
category: 'done'
method: floatTest
test_imag

	self
		assert: (self float: 3) imag ___value equals: 0;
        assert: (self float: -3) imag ___value equals: 0;
        assert: float __call__ imag ___value equals: 0;
		yourself.
%
category: 'done'
method: floatTest
test_real

	self
		assert: (self float: 3) real ___value equals: 3;
        assert: (self float: -3) real ___value equals: -3;
		yourself.
%
category: 'done'
method: floatTest
testas_integer_ratio
	"float.as_integer_ratio() returns tuple of (numerator, denominator)"

	| result |
	result := (self float: 3.5) as_integer_ratio.
	self assert: (result isKindOf: tuple).
	self assert: (result __getitem__: (self int: 0)) ___value equals: 7.
	self assert: (result __getitem__: (self int: 1)) ___value equals: 2.

	result := (self float: 0.5) as_integer_ratio.
	self assert: (result __getitem__: (self int: 0)) ___value equals: 1.
	self assert: (result __getitem__: (self int: 1)) ___value equals: 2.
%
category: 'done'
method: floatTest
testfromhex
	"float.fromhex() class method parses hex float strings"

	self
		assert: (float fromhex: (str ___value: '0x1.cp+1')) ___value equals: 3.5;
		assert: (float fromhex: (str ___value: '0x1.0p+0')) ___value equals: 1.0;
		assert: (float fromhex: (str ___value: '-0x1.0p+0')) ___value equals: -1.0;
		assert: (float fromhex: (str ___value: '0x1.0p+3')) ___value equals: 8.0;
		yourself.
%
category: 'done'
method: floatTest
testhex
	"float.hex() returns hexadecimal string representation"

	| result |
	result := (self float: 0.0) hex.
	self assert: (result isKindOf: str).
	self assert: result ___value equals: '0x0.0000000000000p+0'.

	"Check roundtrip for 3.5"
	result := (self float: 3.5) hex.
	self assert: (result isKindOf: str).
	self assert: (float fromhex: result) ___value equals: 3.5.
%
category: 'done'
method: floatTest
testimag
	"float.imag always returns 0.0"

	self
		assert: (self float: 3.14) imag ___value equals: 0;
		assert: (self float: -5.0) imag ___value equals: 0;
		yourself.
%
category: 'done'
method: floatTest
testis_integer
	"float.is_integer() returns True if float has integral value"

	self
		assert: (self float: 3.0) is_integer ___value;
		assert: (self float: -5.0) is_integer ___value;
		assert: (self float: 0.0) is_integer ___value;
		deny: (self float: 3.5) is_integer ___value;
		deny: (self float: 0.1) is_integer ___value;
		yourself.
%
category: 'done'
method: floatTest
testreal
	"float.real returns self"

	| f |
	f := self float: 3.14.
	self assert: f real == f.

	f := self float: -5.0.
	self assert: f real == f.
%
