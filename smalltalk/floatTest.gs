! ------------------- Remove existing behavior from floatTest
removeAllMethods floatTest
removeAllClassMethods floatTest
! ------------------- Class methods for floatTest
! ------------------- Instance methods for floatTest
set compile_env: 0
category: 'done'
method: floatTest
test__abs__

	self 
		assert: ( self targetInstance: 3.5 ) __abs__ equals: (self float: 3.5);
        assert: ( self targetInstance: -3.5 ) __abs__ equals: (self float: 3.5);
		assert: ( self targetInstance: 3 ) __abs__ equals: (self int: 3);
        assert: ( self targetInstance: -3 ) __abs__ equals: (self int: 3);
		yourself
%
category: 'done'
method: floatTest
test__add__

	self 
        assert: ( ( self targetInstance:  3 ) __add__: ( self int: 1 ) ) equals: (self int: 4);
        assert: ( ( self targetInstance: -3 ) __add__: ( self int: 1 ) ) equals: (self int: -2);
        assert: ( ( self targetInstance:  3 ) __add__: ( self float: 1 ) ) equals: (self int: 4);
        assert: ( ( self targetInstance: -3 ) __add__: ( self float: 1 ) ) equals: (self int: -2);
		yourself.
%
category: 'done'
method: floatTest
test__bool__

	self 
		assert: ( self targetInstance:  3 ) __bool__;
        assert: ( self targetInstance: -3 ) __bool__;
        assert: ( self targetInstance: -1 ) __bool__;
        assert: ( self targetInstance:  1 ) __bool__;
        deny:   ( self targetInstance:  0 ) __bool__;
		yourself.
%
category: 'done'
method: floatTest
test__ceil__

	self 
		assert: ( self targetInstance:  3.5 ) __ceil__ __class__ equals: int;
        assert: ( self targetInstance:  3.5 ) __ceil__ equals: (self int: 4);
        assert: ( self targetInstance: -3.5 ) __ceil__ equals: (self int: -3);
		yourself.
%
category: 'done'
method: floatTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__abs__' '__add__' '__bool__' '__ceil__' '__divmod__' '__float__' '__floor__' '__floordiv__' '__getformat__' '__getnewargs__' '__int__' '__mod__' '__mul__' '__neg__' '__pos__' '__pow__' '__radd__' '__rdivmod__' '__rfloordiv__' '__rmod__' '__rmul__' '__round__' '__rpow__' '__rsub__' '__rtruediv__' '__set_format__' '__sub__' '__truediv__' '__trunc__' 'as_integer_ratio' 'conjugate' 'fromhex' 'hex' 'imag' 'is_integer' 'real')
	"
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: 36.
"   self assert: ( dir __contains__: (self str: '__abs__')).
   self assert: ( dir __contains__: (self str: '__add__')).
   self assert: ( dir __contains__: (self str: '__bool__')).
   self assert: ( dir __contains__: (self str: '__ceil__')).
   self assert: ( dir __contains__: (self str: '__divmod__')).
   self assert: ( dir __contains__: (self str: '__float__')).
   self assert: ( dir __contains__: (self str: '__floor__')).
   self assert: ( dir __contains__: (self str: '__floordiv__')).
   #pyTodo. "self assert: ( dir __contains__: (self str: '__getformat__')).
"   #pyTodo. "self assert: ( dir __contains__: (self str: '__getnewargs__')).
"   self assert: ( dir __contains__: (self str: '__int__')).
   self assert: ( dir __contains__: (self str: '__mod__')).
   self assert: ( dir __contains__: (self str: '__mul__')).
   self assert: ( dir __contains__: (self str: '__neg__')).
   self assert: ( dir __contains__: (self str: '__pos__')).
   self assert: ( dir __contains__: (self str: '__pow__')).
   self assert: ( dir __contains__: (self str: '__radd__')).
   self assert: ( dir __contains__: (self str: '__rdivmod__')).
   self assert: ( dir __contains__: (self str: '__rfloordiv__')).
   self assert: ( dir __contains__: (self str: '__rmod__')).
   self assert: ( dir __contains__: (self str: '__rmul__')).
   #pyTodo. "self assert: ( dir __contains__: (self str: '__round__')).
"   self assert: ( dir __contains__: (self str: '__rpow__')).
   self assert: ( dir __contains__: (self str: '__rsub__')).
   self assert: ( dir __contains__: (self str: '__rtruediv__')).
   #pyTodo. "self assert: ( dir __contains__: (self str: '__set_format__')).
"   self assert: ( dir __contains__: (self str: '__sub__')).
   self assert: ( dir __contains__: (self str: '__truediv__')).
   self assert: ( dir __contains__: (self str: '__trunc__')).
   self assert: ( dir __contains__: (self str: 'as_integer_ratio')).
   self assert: ( dir __contains__: (self str: 'conjugate')).
   #pyTodo. "self assert: ( dir __contains__: #fromhex ).
"   #pyTodo. "self assert: ( dir __contains__: #hex ).
"   self assert: ( dir __contains__: (self str: 'imag')).
   self assert: ( dir __contains__: (self str: 'is_integer')).
   self assert: ( dir __contains__: (self str: 'real')).
%
category: 'done'
method: floatTest
test__divmod__

	self
		assert: ( tuple ___new__init__: { 0. 3 } ) equals: ( ( self targetInstance: 3 ) __divmod__: (self int: 4) );
		assert: ( tuple ___new__init__: {-1.-1 } ) equals: ( ( self targetInstance: 3 ) __divmod__: (self int: -4) );
		assert: ( tuple ___new__init__: { 0.-3 } ) equals: ( ( self targetInstance:-3 ) __divmod__: (self int: -4) );
		assert: ( tuple ___new__init__: { 1. 1 } ) equals: ( ( self targetInstance: 4 ) __divmod__: (self int: 3) );
		assert: ( tuple ___new__init__: {-2.-2 } ) equals: ( ( self targetInstance: 4 ) __divmod__: (self int: -3) );
		assert: ( tuple ___new__init__: { 1.-1 } ) equals: ( ( self targetInstance:-4 ) __divmod__: (self int: -3) );
		assert: ( tuple ___new__init__: {-2. 2 } ) equals: ( ( self targetInstance:-4 ) __divmod__: (self int: 3) );
		yourself
%
category: 'done'
method: floatTest
test__eq__

	| a b |
	a := self targetInstance: 1.2.
	b := self targetInstance: 2.1.
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
		assert: ( self targetInstance:  3 ) __float__ __class__ equals: float;
        assert: ( self targetInstance:  3 ) __float__ equals: (self int: 3);
        assert: ( self targetInstance: -3 ) __float__ equals: (self int: -3);
		assert: ( self targetInstance:  3 ) __float__ equals: ( self targetInstance:  3 );
        assert: ( self targetInstance: -3 ) __float__ equals: ( self targetInstance: -3 );
		yourself
%
category: 'done'
method: floatTest
test__floor__

	self 
		assert: ( self targetInstance:  3.5 ) __floor__ __class__ equals: int ;
        assert: ( self targetInstance:  3.5 ) __floor__ equals: (self int: 3);
        assert: ( self targetInstance: -3.5 ) __floor__ equals: (self int: -4);
	    yourself
%
category: 'done'
method: floatTest
test__floordiv__

	self
		assert: ( ( self targetInstance: 3.5) 	__floordiv__: 4 ) __class__ equals: int;
		assert: ( ( self targetInstance: 3.5 ) 	__floordiv__: 4 ) 		equals: (self int: 0);
		assert: ( ( self targetInstance: 3.5 ) 	__floordiv__: 2 ) 		equals: (self int: 1);
		assert: ( ( self targetInstance: 3.5 ) 	__floordiv__: 1.75 ) 	equals: (self int: 2);
		assert: ( ( self targetInstance: 4 ) 		__floordiv__: 2 ) 		equals: (self int: 2);
		yourself
%
category: 'done'
method: floatTest
test__ge__

	self
		deny:   ( ( self targetInstance: 2 ) __ge__: (self int: 3) );
		assert: ( ( self targetInstance: 3 ) __ge__: (self int: 3) );
		assert: ( ( self targetInstance: 4 ) __ge__: (self int: 3) );
		deny:   ( ( self targetInstance: 2 ) __ge__: ( self targetInstance: 3 ) );
		assert: ( ( self targetInstance: 3 ) __ge__: ( self targetInstance: 3 ) );
		assert: ( ( self targetInstance: 4 ) __ge__: ( self targetInstance: 3 ) );
		yourself
%
category: 'done'
method: floatTest
test__gt__

	self
		deny:   ( ( self targetInstance: 2 ) __gt__: (self int: 3) );
		deny:   ( ( self targetInstance: 3 ) __gt__: (self int: 3) );
		assert: ( ( self targetInstance: 4 ) __gt__: (self int: 3) );
		deny:   ( ( self targetInstance: 2 ) __gt__: ( self targetInstance: 3 ) );
		deny:   ( ( self targetInstance: 3 ) __gt__: ( self targetInstance: 3 ) );
		assert: ( ( self targetInstance: 4 ) __gt__: ( self targetInstance: 3 ) );
		yourself
%
category: 'done'
method: floatTest
test__int__

	self 
		assert: ( self targetInstance:  3.5 ) __int__ __class__ equals: int;
        assert: ( self targetInstance:  3.5 ) __int__ equals: (self int: 3);
        assert: ( self targetInstance: -3.5 ) __int__ equals: (self int: -3);
		yourself.
%
category: 'done'
method: floatTest
test__le__
	self
		assert: ( ( self targetInstance: 2 ) __le__: (self int: 3) );
		assert: ( ( self targetInstance: 3 ) __le__: (self int: 3) );
		deny:   ( ( self targetInstance: 4 ) __le__: (self int: 3) );
		assert: ( ( self targetInstance: 2 ) __le__: ( self targetInstance: 3 ) );
		assert: ( ( self targetInstance: 3 ) __le__: ( self targetInstance: 3 ) );
		deny:   ( ( self targetInstance: 4 ) __le__: ( self targetInstance: 3 ) );
		yourself
%
category: 'done'
method: floatTest
test__lt__
	self
		assert: ( ( self targetInstance: 2 ) __lt__: (self int: 3) );
		deny:   ( ( self targetInstance: 3 ) __lt__: (self int: 3) );
		deny:   ( ( self targetInstance: 4 ) __lt__: (self int: 3) );
		assert: ( ( self targetInstance: 2 ) __lt__: ( self targetInstance: 3 ) );
		deny:   ( ( self targetInstance: 3 ) __lt__: ( self targetInstance: 3 ) );
		deny:   ( ( self targetInstance: 4 ) __lt__: ( self targetInstance: 3 ) );
		yourself
%
category: 'done'
method: floatTest
test__mod__

	self
		assert: ( ( ( self targetInstance: 3 ) __mod__: (self int: 4) ) __eq__: (self int: 3) );
		assert: ( ( ( self targetInstance: 3 ) __mod__: (self int: 2) ) __eq__: (self int: 1) );
		assert: ( ( ( self targetInstance: 4 ) __mod__: (self int: 2) ) __eq__: (self int: 0) );
		yourself
%
category: 'done'
method: floatTest
test__mul__

	self 
		assert: ( ( ( self targetInstance:  3 ) __mul__: (self int: 2) ) __eq__: (self int: 6) );
        assert: ( ( ( self targetInstance: -3 ) __mul__: (self int: 2) ) __eq__: (self int: -6) );
        assert: ( ( ( self targetInstance:  3 ) __mul__: ( self targetInstance: 2 ) ) __eq__: (self int: 6) );
        assert: ( ( ( self targetInstance: -3 ) __mul__: ( self targetInstance: 2 ) ) __eq__: (self int: -6) );
		yourself.
%
category: 'done'
method: floatTest
test__ne__

	| a b |
	a := self targetInstance: 1.
	b := self targetInstance: 2.
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
		assert: ( self targetInstance: 3 ) __neg__ equals: (self int: -3);
        assert: ( self targetInstance: -3 ) __neg__ equals: (self int: 3);
		yourself.
%
category: 'done'
method: floatTest
test__pos__

	self 
		assert: ( self targetInstance: 3 ) __pos__ equals: (self int: 3);
        assert: ( self targetInstance: -3 ) __pos__ equals: (self int: 3);
		yourself.
%
category: 'done'
method: floatTest
test__pow__

	self
		assert: ( ( self targetInstance: 3.5 ) __pow__: (self int: 2) ) equals: (self float: 12.25);
		assert: ( ( self targetInstance: 4 ) __pow__: (self int: 3) ) equals: (self int: 64);
		yourself.
%
category: 'done'
method: floatTest
test__radd__

	self
		assert: ( ( ( self targetInstance:  3 ) __radd__: ( self int: 1 ) ) __class__  ) equals: int;
        assert: ( ( self targetInstance:  3 ) __radd__: (self int: 1) ) equals: (self int: 4);
        assert: ( ( self targetInstance: -3 ) __radd__: (self int: 1) ) equals: (self int: -2);
        assert: ( ( self targetInstance:  3 ) __radd__: ( self targetInstance: 1 ) ) equals: (self int: 4);
        assert: ( ( self targetInstance: -3 ) __radd__: ( self targetInstance: 1 ) ) equals: (self int: -2);
		yourself.
%
category: 'done'
method: floatTest
test__rdivmod__

	self
		assert: ( tuple ___new__init__: { 0. 3 } ) equals: ( ( self targetInstance: 4 ) __rdivmod__: (self int: 3) );
		assert: ( tuple ___new__init__: {-1.-1 } ) equals: ( ( self targetInstance:-4 ) __rdivmod__: (self int: 3) );
		assert: ( tuple ___new__init__: { 0.-3 } ) equals: ( ( self targetInstance:-4 ) __rdivmod__: (self int: -3) );
		assert: ( tuple ___new__init__: { 1. 1 } ) equals: ( ( self targetInstance: 3 ) __rdivmod__: (self int: 4) );
		assert: ( tuple ___new__init__: {-2.-2 } ) equals: ( ( self targetInstance:-3 ) __rdivmod__: (self int: 4) );
		assert: ( tuple ___new__init__: { 1.-1 } ) equals: ( ( self targetInstance:-3 ) __rdivmod__: (self int: -4) );
		assert: ( tuple ___new__init__: {-2. 2 } ) equals: ( ( self targetInstance: 3 ) __rdivmod__: (self int: -4) );
		yourself
%
category: 'done'
method: floatTest
test__rfloordiv__

	self
		assert: ( ( self targetInstance: 4 ) __rfloordiv__: (self int: 3) ) __class__ equals: int;
		assert: ( ( self targetInstance: 4 ) __rfloordiv__: (self int: 3) ) equals: (self int: 0);
		assert: ( ( self targetInstance: 2 ) __rfloordiv__: (self int: 3) ) equals: (self int: 1);
		assert: ( ( self targetInstance: 2 ) __rfloordiv__: (self int: 4) ) equals: (self int: 2);
		yourself
%
category: 'done'
method: floatTest
test__rmod__

	self
		assert: ( ( ( self targetInstance: 4.5 ) __rmod__: (self int: 3) ) __eq__: (self int: 3) );
		assert: ( ( ( self targetInstance: 4 ) __rmod__: (self int: 3) ) __eq__: (self int: 3) );
		assert: ( ( ( self targetInstance: 2 ) __rmod__: (self int: 3) ) __eq__: (self int: 1) );
		assert: ( ( ( self targetInstance: 2 ) __rmod__: (self int: 4) ) __eq__:(self int: 0) );
		yourself
%
category: 'done'
method: floatTest
test__rmul__

	self 
		assert: ( ( self float:  3.2 ) 	__rmul__: (self int: 2) ) 		equals: (self float: 6.4);
        assert: ( ( self float: -3 ) 		__rmul__: (self int: 2) ) 		equals: (self int: -6);
        assert: ( ( self float:  3 ) 		__rmul__: ( self float: 2 ) ) 	equals: (self int: 6);
        assert: ( ( self float: -3 ) 		__rmul__: ( self float: 2 ) ) 	equals: (self int: -6);
		yourself
%
category: 'done'
method: floatTest
test__round__

	self 
		assert: ( self targetInstance:  3.5 ) 	__round__ __class__ equals: int ;
        assert: ( self targetInstance:  3.5 ) 	__round__ equals: (self int: 4);
        assert: ( self targetInstance:  3.49 )	__round__ equals: (self int: 3);
        assert: ( self targetInstance: -3.5 ) 	__round__ equals: (self int: -4);
        assert: ( self targetInstance: -3.49 ) 	__round__ equals: (self int: -3);
	    yourself
%
category: 'done'
method: floatTest
test__rpow__
	
	self
		assert: ( ( self targetInstance: 2 ) __rpow__: (self float: 3.25) ) equals: (self float: 10.5625);
		assert: ( ( self targetInstance: 3 ) __rpow__: (self int: 4 ) ) equals: (self int: 64);
		yourself.
%
category: 'done'
method: floatTest
test__rsub__

	self 
		assert: ( ( self targetInstance:  3 ) __rsub__: (self int: 1) ) equals: (self int: -2);
        assert: ( ( self targetInstance: -3 ) __rsub__: (self int: 1) ) equals:  (self int: 4);
        assert: ( ( self targetInstance:  3 ) __rsub__: ( self targetInstance: 1 ) ) equals: (self int: -2);
        assert: ( ( self targetInstance: -3 ) __rsub__: ( self targetInstance: 1 ) ) equals: (self int: 4);
		yourself.
%
category: 'done'
method: floatTest
test__rtruediv__

	self 
		assert: ( ( self targetInstance: 1 ) __rtruediv__: (self int: 3) ) __class__ equals: float;
    	assert: ( ( self targetInstance: 1 ) __rtruediv__: (self int: 3) ) equals: (self int: 3);
        assert: ( ( self targetInstance: 2 ) __rtruediv__: (self int: -4) ) equals: (self int: -2);
		yourself.
%
category: 'done'
method: floatTest
test__sub__

	self 
		assert: ( ( self targetInstance:  3 ) __sub__: (self int: 1) ) equals: (self int: 2);
        assert: ( ( self targetInstance: -3 ) __sub__: (self int: 1) ) equals: (self int: -4);
        assert: ( ( self targetInstance:  3 ) __sub__: ( self targetInstance: 1 ) ) equals: (self int: 2);
        assert: ( ( self targetInstance: -3 ) __sub__: ( self targetInstance: 1 ) ) equals: (self int: -4);
		yourself.
%
category: 'done'
method: floatTest
test__truediv__

	self 
		assert: ( ( self targetInstance:  3 ) __truediv__: (self int: 1) ) __class__ equals: float;
    	assert: ( ( self targetInstance:  3 ) __truediv__: (self int: 1) ) equals: (self int: 3);
        assert: ( ( self targetInstance: -4 ) __truediv__: (self int: 2) ) equals: (self int: -2);
		yourself.
%
category: 'done'
method: floatTest
test__trunc__

	self 
		assert: ( self targetInstance:  3.5 ) __trunc__ __class__ equals: int;
        assert: ( self targetInstance:  3.5 ) __trunc__ equals: (self int: 3);
        assert: ( self targetInstance: -3.5 ) __trunc__ equals: (self int: -3);
		yourself.
%
category: 'done'
method: floatTest
testas_integer_ratio

	self
		assert: ( tuple ___new__init__: { 3. 1 } ) equals: ( ( self targetInstance: 3 ) as_integer_ratio );
		assert: ( tuple ___new__init__: {-3. 1 } ) equals: ( ( self targetInstance:-3 ) as_integer_ratio );
		assert: ( tuple ___new__init__: {-1. 4 } ) equals: ( ( self targetInstance:-0.25 ) as_integer_ratio );
		assert: ( tuple ___new__init__: { 0. 1 } ) equals: ( ( self targetInstance: 0 ) as_integer_ratio );
		yourself.
%
category: 'done'
method: floatTest
testconjugate

	self 
		assert: ( self targetInstance:  3.4 ) conjugate equals: (self float: 3.4);
        assert: ( self targetInstance: -3 ) conjugate equals: (self int: -3);
		yourself.
%
category: 'done'
method: floatTest
testimag

	self 
		assert: ( self targetInstance: 3 ) imag equals: (self int: 0);
        assert: ( self targetInstance: -3 ) imag equals: (self int: 0);
        assert: self targetInstance imag equals: (self int: 0);
		yourself.
%
category: 'done'
method: floatTest
testis_integer

	self 
		deny:   ( self targetInstance:  3.5 ) is_integer;
        assert: ( self targetInstance:  3 ) is_integer;
        assert: ( self targetInstance:  0 ) is_integer;
        assert: self targetInstance is_integer;
		  yourself
%
category: 'done'
method: floatTest
testreal

	self 
		assert: ( self targetInstance: 3 ) real equals: (self int: 3);
        assert: ( self targetInstance: -3 ) real equals: (self int: -3);
		yourself.
%
set compile_env: 0
category: 'todo'
method: floatTest
test__getnewargs__
   #pyTodo
%
category: 'todo'
method: floatTest
testfromhex
   #pyTodo
%
category: 'todo'
method: floatTest
testhex
   #pyTodo
%
