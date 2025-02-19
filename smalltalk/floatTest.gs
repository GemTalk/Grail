! ------------------- Remove existing behavior from floatTest
removeallmethods floatTest
removeallclassmethods floatTest
! ------------------- Class methods for floatTest
! ------------------- Instance methods for floatTest
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
test__divmod__

	self
		assert: ((self float: 3) __divmod__: (self int: 4)) ___container asArray equals: #(0 3);
		assert: ((self float: 3) __divmod__: (self int: -4)) ___container asArray equals: #(-1 -1);
		assert: ((self float:-3) __divmod__: (self int: -4)) ___container asArray equals: #(0 -3);
		assert: ((self float: 4) __divmod__: (self int: 3)) ___container asArray equals: #(1 1);
		assert: ((self float: 4) __divmod__: (self int: -3)) ___container asArray equals: #(-2 -2);
		assert: ((self float:-4) __divmod__: (self int: -3)) ___container asArray equals: #(1 -1);
		assert: ((self float:-4) __divmod__: (self int: 3)) ___container asArray equals: #(-2 2);
		yourself
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

	powHolder := ((self float: 2) __pow__: (complex ___real: 0 imaginary: 1)).
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

	self
		assert: ((self float: 4) __rdivmod__: (self int: 3)) ___container asArray equals: #(0 3);
		assert: ((self float:-4) __rdivmod__: (self int: 3)) ___container asArray equals: #(-1 -1);
		assert: ((self float:-4) __rdivmod__: (self int: -3)) ___container asArray equals: #(0 -3);
		assert: ((self float: 3) __rdivmod__: (self int: 4)) ___container asArray equals: #(1 1);
		assert: ((self float:-3) __rdivmod__: (self int: 4)) ___container asArray equals: #(-2 -2);
		assert: ((self float:-3) __rdivmod__: (self int: -4)) ___container asArray equals: #(1 -1);
		assert: ((self float: 3) __rdivmod__: (self int: -4)) ___container asArray equals: #(-2 2);
		yourself
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

	self
		assert: ((self float: 3) as_integer_ratio) ___container asArray equals: #(3 1);
		assert: ((self float:-3) as_integer_ratio) ___container asArray equals: #(-3 1);
		assert: ((self float:-0.25) as_integer_ratio) ___container asArray equals: #(-1 4);
		assert: ((self float: 0) as_integer_ratio) ___container asArray equals: #(0 1);
		yourself.
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
category: 'todo'
method: floatTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__abs__' '__add__' '__bool__' '__ceil__' '__divmod__' '__float__' '__floor__' '__floordiv__' '__getformat__' '__getnewargs__' '__int__' '__mod__' '__mul__' '__neg__' '__pos__' '__pow__' '__radd__' '__rdivmod__' '__rfloordiv__' '__rmod__' '__rmul__' '__round__' '__rpow__' '__rsub__' '__rtruediv__' '__set_format__' '__sub__' '__truediv__' '__trunc__' 'as_integer_ratio' 'conjugate' 'fromhex' 'hex' 'imag' 'is_integer' 'real')
	"

false ifTrue: [
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: 36.
"   self assert: (dir __contains__: (self str: '__abs__')).
   self assert: (dir __contains__: (self str: '__add__')).
   self assert: (dir __contains__: (self str: '__bool__')).
   self assert: (dir __contains__: (self str: '__ceil__')).
   self assert: (dir __contains__: (self str: '__divmod__')).
   self assert: (dir __contains__: (self str: '__float__')).
   self assert: (dir __contains__: (self str: '__floor__')).
   self assert: (dir __contains__: (self str: '__floordiv__')).
   #pyTodo. "self assert: (dir __contains__: (self str: '__getformat__')).
"   #pyTodo. "self assert: (dir __contains__: (self str: '__getnewargs__')).
"   self assert: (dir __contains__: (self str: '__int__')).
   self assert: (dir __contains__: (self str: '__mod__')).
   self assert: (dir __contains__: (self str: '__mul__')).
   self assert: (dir __contains__: (self str: '__neg__')).
   self assert: (dir __contains__: (self str: '__pos__')).
   self assert: (dir __contains__: (self str: '__pow__')).
   self assert: (dir __contains__: (self str: '__radd__')).
   self assert: (dir __contains__: (self str: '__rdivmod__')).
   self assert: (dir __contains__: (self str: '__rfloordiv__')).
   self assert: (dir __contains__: (self str: '__rmod__')).
   self assert: (dir __contains__: (self str: '__rmul__')).
   #pyTodo. "self assert: (dir __contains__: (self str: '__round__')).
"   self assert: (dir __contains__: (self str: '__rpow__')).
   self assert: (dir __contains__: (self str: '__rsub__')).
   self assert: (dir __contains__: (self str: '__rtruediv__')).
   #pyTodo. "self assert: (dir __contains__: (self str: '__set_format__')).
"   self assert: (dir __contains__: (self str: '__sub__')).
   self assert: (dir __contains__: (self str: '__truediv__')).
   self assert: (dir __contains__: (self str: '__trunc__')).
   self assert: (dir __contains__: (self str: 'as_integer_ratio')).
   self assert: (dir __contains__: (self str: 'conjugate')).
   #pyTodo. "self assert: (dir __contains__: #fromhex).
"   #pyTodo. "self assert: (dir __contains__: #hex).
"   self assert: (dir __contains__: (self str: 'imag')).
   self assert: (dir __contains__: (self str: 'is_integer')).
   self assert: (dir __contains__: (self str: 'real')).
]
%
category: 'todo'
method: floatTest
test__getnewargs__
   #pyTodo
%
category: 'todo'
method: floatTest
test_fromhex
   #pyTodo
%
category: 'todo'
method: floatTest
test_hex
   #pyTodo
%
