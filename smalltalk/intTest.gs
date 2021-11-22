! ------------------- Remove existing behavior from intTest
removeAllMethods intTest
removeAllClassMethods intTest
! ------------------- Class methods for intTest
! ------------------- Instance methods for intTest
set compile_env: 0
category: 'done'
method: intTest
test__abs__

   self 
		assert: ( self targetInstance: 3 ) __abs__ equals: ( self targetInstance: 3 );
        assert: ( self targetInstance: -3 ) __abs__ equals: ( self targetInstance: 3 );
		yourself.
%
category: 'done'
method: intTest
test__add__

   self 
        assert: ( ( self targetInstance:  3 ) __add__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: 4 );
        assert: ( ( self targetInstance: -3 ) __add__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: -2 );
		yourself.
%
category: 'done'
method: intTest
test__and__

   self 
		assert: ( ( self targetInstance:  3 ) __and__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: 1 );
        assert: ( ( self targetInstance: -3 ) __and__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: 1 );
        assert: ( ( self targetInstance:  3 ) __and__: ( self targetInstance: 2 ) ) equals: ( self targetInstance: 2 );
        assert: ( ( self targetInstance: -3 ) __and__: ( self targetInstance: 2 ) ) equals: ( self targetInstance: 0 );
		yourself.
%
category: 'done'
method: intTest
test__bool__

	self 
		assert: ( self targetInstance:  3 ) __bool__;
        assert: ( self targetInstance: -3 ) __bool__;
        assert: ( self targetInstance: -1 ) __bool__;
        assert: ( self targetInstance:  1 ) __bool__;
        deny:   ( self targetInstance:  0 ) __bool__;
		yourself
%
category: 'done'
method: intTest
test__ceil__

   self 
		assert: ( self targetInstance:  3 ) __ceil__ equals:  ( self targetInstance: 3 );
        assert: ( self targetInstance: -3 ) __ceil__ equals: ( self targetInstance: -3 );
		yourself.
%
category: 'done'
method: intTest
test__divmod__

	self
		assert: ( tuple ___new__init__: { 0. 3 } ) equals: ( ( self targetInstance: 3 ) __divmod__: ( self targetInstance: 4 ) );
		assert: ( tuple ___new__init__: {-1.-1 } ) equals: ( ( self targetInstance: 3 ) __divmod__: ( self targetInstance: -4 ) );
		assert: ( tuple ___new__init__: { 0.-3 } ) equals: ( ( self targetInstance:-3 ) __divmod__: ( self targetInstance: -4 ) );
		assert: ( tuple ___new__init__: { 1. 1 } ) equals: ( ( self targetInstance: 4 ) __divmod__: ( self targetInstance: 3 ) );
		assert: ( tuple ___new__init__: {-2.-2 } ) equals: ( ( self targetInstance: 4 ) __divmod__: ( self targetInstance: -3 ) );
		assert: ( tuple ___new__init__: { 1.-1 } ) equals: ( ( self targetInstance:-4 ) __divmod__: ( self targetInstance: -3 ) );
		assert: ( tuple ___new__init__: {-2. 2 } ) equals: ( ( self targetInstance:-4 ) __divmod__: ( self targetInstance: 3 ) );
		yourself
%
category: 'done'
method: intTest
test__eq__
	| a b |
	a := self targetInstance: 1.
	b := self targetInstance: 2.
	self
		assert: (a __eq__: a);
		assert: (a __eq__: 1);
		assert: (b __eq__: b);
		assert: (b __eq__: 2);
		deny: (a __eq__: b);
		deny: (b __eq__: a);
		yourself.
%
category: 'done'
method: intTest
test__float__

   self 
		assert: ( self targetInstance:  3 ) __float__ __class__ equals: float;
		assert: ( ( self targetInstance:  3 ) __float__ __eq__: ( self targetInstance:  3 ) );
        assert: ( ( self targetInstance: -3 ) __float__ __eq__: ( self targetInstance: -3 ) );
		yourself.
%
category: 'done'
method: intTest
test__floor__

   self 
		assert: ( self targetInstance:  3 ) __floor__ equals: ( self targetInstance: 3 );
        assert: ( self targetInstance: -3 ) __floor__ equals: ( self targetInstance: -3 );
		yourself.
%
category: 'done'
method: intTest
test__floordiv__

	self
		assert: ( ( self targetInstance: 3 ) __floordiv__: ( self targetInstance: 4 ) ) equals: ( self targetInstance: 0 );
		assert: ( ( self targetInstance: 3 ) __floordiv__: ( self targetInstance: 2 ) ) equals: ( self targetInstance: 1 );
		assert: ( ( self targetInstance: 4 ) __floordiv__: ( self targetInstance: 2 ) ) equals: ( self targetInstance: 2 );
		yourself
%
category: 'done'
method: intTest
test__ge__

	self
		deny:   ( ( self targetInstance: 2 ) __ge__: ( self targetInstance: 3 ) );
		assert: ( ( self targetInstance: 3 ) __ge__: ( self targetInstance: 3 ) );
		assert: ( ( self targetInstance: 4 ) __ge__: ( self targetInstance: 3 ) );
		yourself
%
category: 'done'
method: intTest
test__gt__

	self
		deny:   ( ( self targetInstance: 2 ) __gt__: ( self targetInstance: 3 ) );
		deny:   ( ( self targetInstance: 3 ) __gt__: ( self targetInstance: 3 ) );
		assert: ( ( self targetInstance: 4 ) __gt__: ( self targetInstance: 3 ) );
		yourself
%
category: 'done'
method: intTest
test__index__

   self 
		assert: ( self targetInstance:  3 ) __index__ equals: ( self targetInstance: 3 );
        assert: ( self targetInstance: -3 ) __index__ equals: ( self targetInstance: -3 );
		yourself
%
category: 'done'
method: intTest
test__int__

   self 
		assert: ( self targetInstance: 3 ) __int__ equals: ( self targetInstance: 3 );
        assert: ( self targetInstance: -3 ) __int__ equals: ( self targetInstance: -3 );
		yourself.
%
category: 'done'
method: intTest
test__invert__

   self 
		assert: ( self targetInstance:  3 ) __invert__ equals: ( self targetInstance: -4 );
        assert: ( self targetInstance: -3 ) __invert__ equals: ( self targetInstance:  2 );
        assert: ( self targetInstance:  0 ) __invert__ equals: ( self targetInstance: -1 );
        assert: ( self targetInstance:  1 ) __invert__ equals: ( self targetInstance: -2 );
		yourself.
%
category: 'done'
method: intTest
test__le__

	self
		assert: ( ( self targetInstance: 2 ) __le__: ( self targetInstance: 3 ) );
		assert: ( ( self targetInstance: 3 ) __le__: ( self targetInstance: 3 ) );
		deny:   ( ( self targetInstance: 4 ) __le__: ( self targetInstance: 3 ) );
		yourself
%
category: 'done'
method: intTest
test__lshift__

	self 
		assert: ( ( self targetInstance:  3 ) __lshift__: 1 ) equals: ( self targetInstance:  6 );
        assert: ( ( self targetInstance:  3 ) __lshift__: 2 ) equals: ( self targetInstance: 12 );
        assert: ( ( self targetInstance: -3 ) __lshift__: 1 ) equals: ( self targetInstance: -6 );
		assert: ( ( self targetInstance: -3 ) __lshift__: 2 ) equals: ( self targetInstance: -12 );
		yourself
%
category: 'done'
method: intTest
test__lt__

	self
		assert: ( ( self targetInstance: 2 ) __lt__: ( self targetInstance: 3 ) );
		deny:   ( ( self targetInstance: 3 ) __lt__: ( self targetInstance: 3 ) );
		deny:   ( ( self targetInstance: 4 ) __lt__: ( self targetInstance: 3 ) );
		yourself
%
category: 'done'
method: intTest
test__mod__

	self
		assert: ( ( ( self targetInstance: 3 ) __mod__: ( self targetInstance: 4 ) ) __eq__: ( self targetInstance: 3 ) );
		assert: ( ( ( self targetInstance: 3 ) __mod__: ( self targetInstance: 2 ) ) __eq__: ( self targetInstance: 1 ) );
		assert: ( ( ( self targetInstance: 4 ) __mod__: ( self targetInstance: 2 ) ) __eq__: ( self targetInstance: 0 ) );
		yourself
%
category: 'done'
method: intTest
test__mul__

   self 
        assert: ( ( ( self targetInstance:  3 ) __mul__: ( self targetInstance: 2 ) ) __eq__: ( self targetInstance: 6 ) );
        assert: ( ( ( self targetInstance: -3 ) __mul__: ( self targetInstance: 2 ) ) __eq__: ( self targetInstance: -6 ) );
		yourself.
%
category: 'done'
method: intTest
test__ne__

	| a b |
	a := self targetInstance: 1.
	b := self targetInstance: 2.
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
		assert: ( self targetInstance: 3 ) __neg__ equals: ( self targetInstance: -3 );
        assert: ( self targetInstance: -3 ) __neg__ equals: ( self targetInstance: 3 );
		yourself.
%
category: 'done'
method: intTest
test__new__onString

	self
		assert: (self targetInstance:  '1' )	__repr__ equals: '1';
		assert: (self targetInstance: '+1' )	__repr__ equals: '1';
	   	assert: (self targetInstance:  '0' )	__repr__ equals: '0';
		assert: (self targetInstance: '-1' )	__repr__ equals: '-1';
		assert: (self targetInstance: '33' )	__repr__ equals: '33';
		yourself.
	[
		self targetInstance: 'j'.
		self assert: false.
	] on: ValueError do: [:ex | 
		self assert: ex messageText equals: 'int() arg is a malformed string'.
	].
%
category: 'done'
method: intTest
test__or__

	self 
		assert: ( ( self targetInstance:  3 ) __or__: 1 ) equals: ( self targetInstance: 3 );
        assert: ( ( self targetInstance: -3 ) __or__: 1 ) equals: ( self targetInstance: -3 );
        assert: ( ( self targetInstance:  3 ) __or__: 2 ) equals: ( self targetInstance: 3 );
        assert: ( ( self targetInstance: -3 ) __or__: 2 ) equals: ( self targetInstance: -1 );
		yourself.
%
category: 'done'
method: intTest
test__pos__

   self 
		assert: ( self targetInstance: 3 ) __pos__ equals: ( self targetInstance: 3 );
        assert: ( self targetInstance: -3 ) __pos__ equals: ( self targetInstance: 3 );
		yourself.
%
category: 'done'
method: intTest
test__pow__

	self
		assert: ( ( self targetInstance: 3 ) __pow__: ( self targetInstance: 2 ) ) equals: ( self targetInstance: 9 );
		assert: ( ( self targetInstance: 4 ) __pow__: ( self targetInstance: 3 ) ) equals: ( self targetInstance: 64 );
		yourself.
%
category: 'done'
method: intTest
test__radd__

   self 
        assert: ( ( self targetInstance:  3 ) __radd__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: 4 );
        assert: ( ( self targetInstance: -3 ) __radd__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: -2 );
		yourself.
%
category: 'done'
method: intTest
test__rand__

	self 
		assert: ( ( self targetInstance:  3 ) __rand__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: 1 );
        assert: ( ( self targetInstance: -3 ) __rand__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: 1 );
        assert: ( ( self targetInstance:  3 ) __rand__: ( self targetInstance: 2 ) ) equals: ( self targetInstance: 2 );
        assert: ( ( self targetInstance: -3 ) __rand__: ( self targetInstance: 2 ) ) equals: ( self targetInstance: 0 );
		yourself.
%
category: 'done'
method: intTest
test__rdivmod__

	self
		assert: ( tuple ___new__init__: { 0. 3 } ) equals: ( ( self targetInstance: 4 ) __rdivmod__: ( self targetInstance: 3 ) );
		assert: ( tuple ___new__init__: {-1.-1 } ) equals: ( ( self targetInstance:-4 ) __rdivmod__: ( self targetInstance: 3)  );
		assert: ( tuple ___new__init__: { 0.-3 } ) equals: ( ( self targetInstance:-4 ) __rdivmod__: ( self targetInstance: -3 ) );
		assert: ( tuple ___new__init__: { 1. 1 } ) equals: ( ( self targetInstance: 3 ) __rdivmod__: ( self targetInstance: 4 ) );
		assert: ( tuple ___new__init__: {-2.-2 } ) equals: ( ( self targetInstance:-3 ) __rdivmod__: ( self targetInstance: 4 ) );
		assert: ( tuple ___new__init__: { 1.-1 } ) equals: ( ( self targetInstance:-3 ) __rdivmod__: ( self targetInstance: -4 ) );
		assert: ( tuple ___new__init__: {-2. 2 } ) equals: ( ( self targetInstance: 3 ) __rdivmod__: ( self targetInstance: -4 ) );
		yourself
%
category: 'done'
method: intTest
test__rfloordiv__

	self
		assert: ( ( self targetInstance: 4 ) __rfloordiv__: ( self targetInstance: 3 ) ) equals: ( self targetInstance: 0 );
		assert: ( ( self targetInstance: 2 ) __rfloordiv__: ( self targetInstance: 3 ) ) equals: ( self targetInstance: 1 );
		assert: ( ( self targetInstance: 2 ) __rfloordiv__: ( self targetInstance: 4 ) ) equals: ( self targetInstance: 2 );
		yourself
%
category: 'done'
method: intTest
test__rlshift__

	self 
		assert: ( ( self targetInstance: 1 ) __rlshift__:  ( self targetInstance: 3 ) ) equals: ( self targetInstance:  6 );
        assert: ( ( self targetInstance: 2 ) __rlshift__:  ( self targetInstance: 3 ) ) equals: ( self targetInstance: 12 );
        assert: ( ( self targetInstance: 1 ) __rlshift__: ( self targetInstance: -3 ) ) equals: ( self targetInstance: -6 );
		assert: ( ( self targetInstance: 2 ) __rlshift__: ( self targetInstance: -3 ) ) equals: ( self targetInstance: -12 );
		yourself.
%
category: 'done'
method: intTest
test__rmod__

	self
		assert: ( ( ( self targetInstance: 4 ) __rmod__: ( self targetInstance: 3 ) ) __eq__: ( self targetInstance: 3 ) );
		assert: ( ( ( self targetInstance: 2 ) __rmod__: ( self targetInstance: 3 ) ) __eq__: ( self targetInstance: 1 ) );
		assert: ( ( ( self targetInstance: 2 ) __rmod__: ( self targetInstance: 4 ) ) __eq__: ( self targetInstance: 0 ) );
		yourself
%
category: 'done'
method: intTest
test__rmul__

	self 
        assert: ( ( ( self targetInstance:  3 ) __rmul__: ( self targetInstance: 2 ) ) __eq__: ( self targetInstance: 6 ) );
        assert: ( ( ( self targetInstance: -3 ) __rmul__: ( self targetInstance: 2 ) ) __eq__: ( self targetInstance: -6 ) );
		yourself.
%
category: 'done'
method: intTest
test__ror__

	self 
		assert: ( ( self targetInstance: 1 ) __or__: ( self targetInstance: 3 ) ) equals: ( self targetInstance: 3 );
        assert: ( ( self targetInstance: 1 ) __or__: ( self targetInstance: -3 ) ) equals: ( self targetInstance: -3 );
        assert: ( ( self targetInstance: 2 ) __or__: ( self targetInstance: 3 ) ) equals: ( self targetInstance: 3 );
        assert: ( ( self targetInstance: 2 ) __or__: ( self targetInstance: -3 ) ) equals: ( self targetInstance: -1 );
		yourself.
%
category: 'done'
method: intTest
test__round__

   self 
		assert: ( self targetInstance:  3 ) __round__ equals: ( self targetInstance:  3 );
        assert: ( self targetInstance: -3 ) __round__ equals: ( self targetInstance: -3 );
		yourself.
%
category: 'done'
method: intTest
test__rpow__

	self
		assert: ( ( self targetInstance: 2 ) __rpow__: ( self targetInstance: 3 ) ) equals: ( self targetInstance: 9 );
		assert: ( ( self targetInstance: 3 ) __rpow__: ( self targetInstance: 4 ) ) equals: ( self targetInstance: 64 );
		yourself.
%
category: 'done'
method: intTest
test__rrshift__

	self 
		assert: ( ( self targetInstance: 1 ) __rrshift__: ( self targetInstance:  3 ) ) equals: ( self targetInstance:  1 );
        assert: ( ( self targetInstance: 2 ) __rrshift__: ( self targetInstance:  3 ) ) equals: ( self targetInstance:   0 );
        assert: ( ( self targetInstance: 1 ) __rrshift__: ( self targetInstance: -3 ) ) equals: ( self targetInstance: -2 );
		assert: ( ( self targetInstance: 2 ) __rrshift__: ( self targetInstance: -3 ) ) equals: ( self targetInstance: -1 );
		yourself.
%
category: 'done'
method: intTest
test__rshift__

	self 
		assert: ( ( self targetInstance:  3 ) __rshift__: ( self targetInstance: 1 ) ) equals: ( self targetInstance:  1 );
        assert: ( ( self targetInstance:  3 ) __rshift__: ( self targetInstance: 2 ) ) equals: ( self targetInstance:  0 );
        assert: ( ( self targetInstance: -3 ) __rshift__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: -2 );
		assert: ( ( self targetInstance: -3 ) __rshift__: ( self targetInstance: 2 ) ) equals: ( self targetInstance: -1 );
		yourself.
%
category: 'done'
method: intTest
test__rsub__

	self 
        assert: ( ( self targetInstance:  3 ) __rsub__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: -2 );
        assert: ( ( self targetInstance: -3 ) __rsub__: ( self targetInstance: 1 ) ) equals: ( self targetInstance:  4 );
		yourself.
%
category: 'done'
method: intTest
test__rtruediv__

	self 
		assert: ( ( self targetInstance: 1 ) __rtruediv__: ( self targetInstance: 3 ) ) __class__ equals: float;
    	assert: ( ( self targetInstance: 1 ) __rtruediv__: ( self targetInstance: 3 ) ) equals: ( self targetInstance: 3 );
        assert: ( ( self targetInstance: 2 ) __rtruediv__: ( self targetInstance: -4 ) ) equals: ( self targetInstance: -2 );
		yourself.
%
category: 'done'
method: intTest
test__rxor__

   self 
		assert: ( ( self targetInstance:  3 ) __rxor__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: 2 );
        assert: ( ( self targetInstance: -3 ) __rxor__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: -4 );
        assert: ( ( self targetInstance:  3 ) __rxor__: ( self targetInstance: 2 ) ) equals: ( self targetInstance: 1 );
        assert: ( ( self targetInstance: -3 ) __rxor__: ( self targetInstance: 2 ) ) equals: ( self targetInstance: -1 );
		yourself.
%
category: 'done'
method: intTest
test__sub__

   self 
        assert: ( ( self targetInstance:  3 ) __sub__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: 2 );
        assert: ( ( self targetInstance: -3 ) __sub__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: -4 );
		yourself
%
category: 'done'
method: intTest
test__truediv__

	self 
		assert: ( ( self targetInstance:  3 ) __truediv__: ( self targetInstance: 1 ) ) __class__ equals: float;
    	assert: ( ( self targetInstance:  3 ) __truediv__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: 3 );
        assert: ( ( self targetInstance: -4 ) __truediv__: ( self targetInstance: 2 ) ) equals: ( self targetInstance: -2 );
		yourself.
%
category: 'done'
method: intTest
test__trunc__

	self 
		assert: ( self targetInstance:  3 ) __trunc__ equals: ( self targetInstance:  3 );
        assert: ( self targetInstance: -3 ) __trunc__ equals: ( self targetInstance: -3 );
		yourself.
%
category: 'done'
method: intTest
test__xor__

	self 
		assert: ( ( self targetInstance:  3 ) __xor__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: 2 );
        assert: ( ( self targetInstance: -3 ) __xor__: ( self targetInstance: 1 ) ) equals: ( self targetInstance: -4 );
        assert: ( ( self targetInstance:  3 ) __xor__: ( self targetInstance: 2 ) ) equals: ( self targetInstance: 1 );
        assert: ( ( self targetInstance: -3 ) __xor__: ( self targetInstance: 2 ) ) equals: ( self targetInstance: -1 );
		yourself.
%
category: 'done'
method: intTest
testas_integer_ratio

	self
		assert: ( tuple ___new__init__: { 3. 1 } ) equals: ( ( self targetInstance: 3 ) as_integer_ratio );
		assert: ( tuple ___new__init__: {-3. 1 } ) equals: ( ( self targetInstance:-3 ) as_integer_ratio );
		assert: ( tuple ___new__init__: { 0. 1 } ) equals: ( ( self targetInstance: 0 ) as_integer_ratio );
		yourself
%
category: 'done'
method: intTest
testbit_length

	self 
		assert: ( ( self targetInstance:  7 ) bit_length __eq__: ( self targetInstance: 3 ) );
        assert: ( ( self targetInstance:  4 ) bit_length __eq__: ( self targetInstance: 3 ) );
        assert: ( ( self targetInstance:  3 ) bit_length __eq__: ( self targetInstance: 2 ) );
        assert: ( ( self targetInstance: -3 ) bit_length __eq__: ( self targetInstance: 2 ) );
        assert: ( ( self targetInstance: -1 ) bit_length __eq__: ( self targetInstance: 1 ) );
        assert: ( ( self targetInstance:  1 ) bit_length __eq__: ( self targetInstance: 1 ) );
        assert: ( ( self targetInstance:  0 ) bit_length __eq__: ( self targetInstance: 0 ) );
		yourself.
%
category: 'done'
method: intTest
testconjugate

	self 
		assert: ( self targetInstance:  3 ) conjugate equals: ( self targetInstance:  3 );
        assert: ( self targetInstance: -3 ) conjugate equals: ( self targetInstance: -3 );
		yourself.
%
category: 'done'
method: intTest
testdenominator

	self 
		assert: ( ( self targetInstance:  3 ) denominator __eq__: ( self targetInstance: 1 ) );
        assert: ( ( self targetInstance: -3 ) denominator __eq__: ( self targetInstance: 1 ) );
		yourself
%
category: 'done'
method: intTest
testimag

	self 
		assert: ( self targetInstance: 3 ) imag  equals: ( self targetInstance: 0 );
        assert: ( self targetInstance: -3 ) imag equals: ( self targetInstance: 0 );
		yourself.
%
category: 'done'
method: intTest
testnumerator

	self 
		assert: ( self targetInstance: 3 ) numerator equals: ( self targetInstance: 3 );
        assert: ( self targetInstance: -3 ) numerator equals: ( self targetInstance: -3 );
		yourself.
%
category: 'done'
method: intTest
testreal

	self 
		assert: ( self targetInstance: 3 ) real equals: ( self targetInstance: 3 );
        assert: ( self targetInstance: -3 ) real equals: ( self targetInstance: -3 );
		yourself.
%
set compile_env: 0
category: 'todo'
method: intTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__abs__' '__add__' '__and__' '__bool__' '__ceil__' '__class__' '__delattr__' '__dir__' '__divmod__' '__doc__' '__eq__' '__float__' '__floor__' '__floordiv__' '__format__' '__ge__' '__getattribute__' '__getnewargs__' '__gt__' '__hash__' '__index__' '__init__' '__init_subclass__' '__int__' '__invert__' '__le__' '__lshift__' '__lt__' '__mod__' '__mul__' '__ne__' '__neg__' '__new__' '__or__' '__pos__' '__pow__' '__radd__' '__rand__' '__rdivmod__' '__reduce__' '__reduce_ex__' '__repr__' '__rfloordiv__' '__rlshift__' '__rmod__' '__rmul__' '__ror__' '__round__' '__rpow__' '__rrshift__' '__rshift__' '__rsub__' '__rtruediv__' '__rxor__' '__setattr__' '__sizeof__' '__str__' '__sub__' '__subclasshook__' '__truediv__' '__trunc__' '__xor__' 'as_integer_ratio' 'bit_length' 'conjugate' 'denominator' 'from_bytes' 'imag' 'numerator' 'real' 'to_bytes')
	"
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: 71.
"   self assert: ( dir __contains__: #__abs__ ).
   self assert: ( dir __contains__: #__add__ ).
   self assert: ( dir __contains__: #__and__ ).
   self assert: ( dir __contains__: #__bool__ ).
   self assert: ( dir __contains__: #__ceil__ ).
   self assert: ( dir __contains__: #__class__ ).
   self assert: ( dir __contains__: #__delattr__ ).
   self assert: ( dir __contains__: #__dir__ ).
   self assert: ( dir __contains__: #__divmod__ ).
   self assert: ( dir __contains__: #__doc__ ).
   self assert: ( dir __contains__: #__eq__ ).
   self assert: ( dir __contains__: #__float__ ).
   self assert: ( dir __contains__: #__floor__ ).
   self assert: ( dir __contains__: #__floordiv__ ).
   self assert: ( dir __contains__: #__format__ ).
   self assert: ( dir __contains__: #__ge__ ).
   self assert: ( dir __contains__: #__getattribute__ ).
   #pyTodo. "self assert: ( dir __contains__: #__getnewargs__ ).
"   self assert: ( dir __contains__: #__gt__ ).
   self assert: ( dir __contains__: #__hash__ ).
   self assert: ( dir __contains__: #__index__ ).
   self assert: ( dir __contains__: #__init__ ).
   #pyTodo. "self assert: ( dir __contains__: #__init_subclass__ ).
"   self assert: ( dir __contains__: #__int__ ).
   self assert: ( dir __contains__: #__invert__ ).
   self assert: ( dir __contains__: #__le__ ).
   self assert: ( dir __contains__: #__lshift__ ).
   self assert: ( dir __contains__: #__lt__ ).
   self assert: ( dir __contains__: #__mod__ ).
   self assert: ( dir __contains__: #__mul__ ).
   self assert: ( dir __contains__: #__ne__ ).
   self assert: ( dir __contains__: #__neg__ ).
   self assert: ( dir __contains__: #__new__ ).
   self assert: ( dir __contains__: #__or__ ).
   self assert: ( dir __contains__: #__pos__ ).
   self assert: ( dir __contains__: #__pow__ ).
   self assert: ( dir __contains__: #__radd__ ).
   self assert: ( dir __contains__: #__rand__ ).
   self assert: ( dir __contains__: #__rdivmod__ ).
   #pyTodo. "self assert: ( dir __contains__: #__reduce__ ).
"   #pyTodo. "self assert: ( dir __contains__: #__reduce_ex__ ).
"   self assert: ( dir __contains__: #__repr__ ).
   self assert: ( dir __contains__: #__rfloordiv__ ).
   self assert: ( dir __contains__: #__rlshift__ ).
   self assert: ( dir __contains__: #__rmod__ ).
   self assert: ( dir __contains__: #__rmul__ ).
   self assert: ( dir __contains__: #__ror__ ).
   self assert: ( dir __contains__: #__round__ ).
   self assert: ( dir __contains__: #__rpow__ ).
   self assert: ( dir __contains__: #__rrshift__ ).
   self assert: ( dir __contains__: #__rshift__ ).
   self assert: ( dir __contains__: #__rsub__ ).
   self assert: ( dir __contains__: #__rtruediv__ ).
   self assert: ( dir __contains__: #__rxor__ ).
   self assert: ( dir __contains__: #__setattr__ ).
   self assert: ( dir __contains__: #__sizeof__ ).
   self assert: ( dir __contains__: #__str__ ).
   self assert: ( dir __contains__: #__sub__ ).
   self assert: ( dir __contains__: #__subclasshook__ ).
   self assert: ( dir __contains__: #__truediv__ ).
   self assert: ( dir __contains__: #__trunc__ ).
   self assert: ( dir __contains__: #__xor__ ).
   #pyTodo. "self assert: ( dir __contains__: #as_integer_ratio ).
"   self assert: ( dir __contains__: #bit_length ).
    self assert: ( dir __contains__: #conjugate ).
    self assert: ( dir __contains__: #denominator ).
   #pyTodo. "self assert: ( dir __contains__: #from_bytes ).
"   self assert: ( dir __contains__: #imag ).
    self assert: ( dir __contains__: #numerator ).
   self assert: ( dir __contains__: #real ).
   #pyTodo. "self assert: ( dir __contains__: #to_bytes ).
"
%
