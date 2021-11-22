! ------------------- Remove existing behavior from complexTest
removeAllMethods complexTest
removeAllClassMethods complexTest
! ------------------- Class methods for complexTest
! ------------------- Instance methods for complexTest
set compile_env: 0
category: 'done'
method: complexTest
test__abs__

	self 
		assert: ( self targetInstance: 3 _: 4 ) __abs__ equals: ( self int: 5 );
		yourself.
%
category: 'done'
method: complexTest
test__add__

	| a |
	a := self targetInstance: 1 _: 2.
	self
		assert: ( a __add__: a ) equals: ( self targetInstance: 2 _: 4 );
		assert: ( a __add__: ( self int: 2 ) ) real equals: ( self int: 3 );
		assert: ( a __add__: ( self int: 2 ) ) imag equals: ( self int:2 );
		yourself.
%
category: 'done'
method: complexTest
test__bool__

	self
		assert: ( self targetInstance: 1 _: 0 ) __bool__;
		assert: ( self targetInstance: 0 _: 1 ) __bool__;
		deny:   ( self targetInstance: 0 _: 0 ) __bool__;
		yourself.
%
category: 'done'
method: complexTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__abs__' '__add__' '__bool__' '__class__' '__delattr__' '__dir__' '__divmod__' '__doc__' '__eq__' '__float__' '__floordiv__' '__format__' '__ge__' '__getattribute__' '__getnewargs__' '__gt__' '__hash__' '__init__' '__init_subclass__' '__int__' '__le__' '__lt__' '__mod__' '__mul__' '__ne__' '__neg__' '__new__' '__pos__' '__pow__' '__radd__' '__rdivmod__' '__reduce__' '__reduce_ex__' '__repr__' '__rfloordiv__' '__rmod__' '__rmul__' '__rpow__' '__rsub__' '__rtruediv__' '__setattr__' '__sizeof__' '__str__' '__sub__' '__subclasshook__' '__truediv__' 'conjugate' 'imag' 'real')
	"
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: 49.
"   self assert: ( dir __contains__: (self str: '__abs__')).
   self assert: ( dir __contains__: (self str: '__add__')).
   self assert: ( dir __contains__: (self str: '__bool__')).
   self assert: ( dir __contains__: (self str: '__class__')).
   self assert: ( dir __contains__: (self str: '__delattr__')).
   self assert: ( dir __contains__: (self str: '__dir__')).
   self assert: ( dir __contains__: (self str: '__divmod__')).
   self assert: ( dir __contains__: (self str: '__doc__')).
   self assert: ( dir __contains__: (self str: '__eq__')).
   self assert: ( dir __contains__: (self str: '__float__')).
   self assert: ( dir __contains__: (self str: '__floordiv__')).
   self assert: ( dir __contains__: (self str: '__format__')).
   self assert: ( dir __contains__: (self str: '__ge__')).
   self assert: ( dir __contains__: (self str: '__getattribute__')).
   #pyTodo. "self assert: ( dir __contains__: (self str: '__getnewargs__')).
"   self assert: ( dir __contains__: (self str: '__gt__')).
   self assert: ( dir __contains__: (self str: '__hash__')).
   self assert: ( dir __contains__: (self str: '__init__')).
   #pyTodo. "self assert: ( dir __contains__: (self str: '__init_subclass__')).
"   self assert: ( dir __contains__: (self str: '__int__')).
   self assert: ( dir __contains__: (self str: '__le__')).
   self assert: ( dir __contains__: (self str: '__lt__')).
   self assert: ( dir __contains__: (self str: '__mod__')).
   self assert: ( dir __contains__: (self str: '__mul__')).
   self assert: ( dir __contains__: (self str: '__ne__')).
   self assert: ( dir __contains__: (self str: '__neg__')).
   self assert: ( dir __contains__: (self str: '__new__')).
   self assert: ( dir __contains__: (self str: '__pos__')).
   self assert: ( dir __contains__: (self str: '__pow__')).
   self assert: ( dir __contains__: (self str: '__radd__')).
   self assert: ( dir __contains__: (self str: '__rdivmod__')).
   #pyTodo. "self assert: ( dir __contains__: (self str: '__reduce__')).
"   #pyTodo. "self assert: ( dir __contains__: (self str: '__reduce_ex__')).
"   self assert: ( dir __contains__: (self str: '__repr__')).
   self assert: ( dir __contains__: (self str: '__rfloordiv__')).
   self assert: ( dir __contains__: (self str: '__rmod__')).
   self assert: ( dir __contains__: (self str: '__rmul__')).
   self assert: ( dir __contains__: (self str: '__rpow__')).
   self assert: ( dir __contains__: (self str: '__rsub__')).
   self assert: ( dir __contains__: (self str: '__rtruediv__')).
   self assert: ( dir __contains__: (self str: '__setattr__')).
   self assert: ( dir __contains__: (self str: '__sizeof__')).
   self assert: ( dir __contains__: (self str: '__str__')).
   self assert: ( dir __contains__: (self str: '__sub__')).
   self assert: ( dir __contains__: (self str: '__subclasshook__')).
   self assert: ( dir __contains__: (self str: '__truediv__')).
   self assert: ( dir __contains__: (self str: 'conjugate')).
   self assert: ( dir __contains__: (self str: 'imag')).
   self assert: ( dir __contains__: (self str: 'real')).
%
category: 'done'
method: complexTest
test__divmod__

	[
		self targetInstance __divmod__: ( self int: 2 ).
		self assert: false.
	] on: TypeError do: [:ex |
		self assert: ex messageText equals: 'can''t take floor or mod of complex numbers'.
	].
%
category: 'done'
method: complexTest
test__eq__

	| a b |
	a := self targetInstance: 1 _: 2.
	b := self targetInstance: 2 _: 1.
	self
		assert: (a __eq__: a);
		assert: (b __eq__: b);
		deny: (a __eq__: b);
		deny: (b __eq__: a);
		yourself.
%
category: 'done'
method: complexTest
test__float__

	[
		self targetInstance __float__.
		self should: false.
	] on: TypeError do: [:ex |
		self assert: ex messageText equals: 'can''t convert complex to float'.
	].
%
category: 'done'
method: complexTest
test__floordiv__

	[
		self targetInstance __floordiv__: ( self int: 2 ).
		self assert: false.
	] on: TypeError do: [:ex | 
		self assert: ex messageText equals: 'can''t take floor of complex numbers'.
	].
%
category: 'done'
method: complexTest
test__ge__

	self
		assert: ( self targetInstance __le__: 'x') == NotImplementedType singleton;
		yourself.
%
category: 'done'
method: complexTest
test__gt__

	self
		assert: ( self targetInstance __le__: 'x') == NotImplementedType singleton;
		yourself.
%
category: 'done'
method: complexTest
test__int__

	[
		self targetInstance __int__.
		self assert: false.
	] on: TypeError do: [:ex |
		self assert: ex messageText equals: 'can''t convert complex to int'.
	].
%
category: 'done'
method: complexTest
test__le__

	self
		assert: ( self targetInstance __le__: 'x') == NotImplementedType singleton;
		yourself.
%
category: 'done'
method: complexTest
test__lt__

	self
		assert: ( self targetInstance __le__: 'x') == NotImplementedType singleton;
		yourself.
%
category: 'done'
method: complexTest
test__mod__

	[
		self targetInstance __mod__: ( self int: 2 ).
		self assert: false.
	] on: TypeError do: [:ex |
		self assert: ex messageText equals: 'can''t mod complex numbers'.
	].
%
category: 'done'
method: complexTest
test__mul__

	| a |
	a := self targetInstance: 3 _: 4.
	self
		assert: ( a __mul__: ( self int: 2 ) ) equals: ( self targetInstance: 6 _: 8 );
		assert: ( a __mul__: ( self targetInstance: 1 _: 2 ) ) real equals: ( self int: -5 );
		assert: ( a __mul__: ( self targetInstance: 1 _: 2 ) ) imag equals: ( self int: 10 );
		yourself.
%
category: 'done'
method: complexTest
test__ne__

	| a b |
	a := self targetInstance: 1 _: 2.
	b := self targetInstance: 2 _: 1.
	self
		deny:   (a __ne__: a);
		deny:   (b __ne__: b);
		assert: (a __ne__: b);
		assert: (b __ne__: a);
		yourself.
%
category: 'done'
method: complexTest
test__neg__

	self
		assert: ( self targetInstance:  1 _:  2 ) __neg__ equals: ( self targetInstance: -1 _: -2 );
		assert: ( self targetInstance: -1 _:  2 ) __neg__ equals: ( self targetInstance:  1 _: -2 );
		assert: ( self targetInstance:  1 _: -2 ) __neg__ equals: ( self targetInstance: -1 _:  2 );
		yourself.
%
category: 'done'
method: complexTest
test__new__onComplex

	| a |
	a := self targetInstance: 1 _: 2.
	self
		assert: (complex ___new__init__: a) equals: a;
		yourself.
%
category: 'done'
method: complexTest
test__new__oneParam

	[
		self targetClass ___new__init__: Set new.
		self assert: false.
	] on: TypeError do: [:ex | 
		self assert: ex messageText equals: 'complex() first argument must be a string or a number, not ''Set'''.
	].
	[
		self targetClass ___new__init__: 'Set new'.
		self assert: false.
	] on: ValueError do: [:ex |
		self assert: ex messageText equals: 'complex() arg is a malformed string'.
	].
%
category: 'done'
method: complexTest
test__new__onString

	self
		assert: (self targetInstance: '(1+3j)') __repr__ equals: '(1+3j)';
		assert: (self targetInstance: '(1-3j)') __repr__ equals: '(1-3j)';
	   	assert: (self targetInstance:'(+1+0j)') __repr__ equals: '(1+0j)';
		assert: (self targetInstance:'(-1+0j)') __repr__ equals:'(-1+0j)';
		assert: (self targetInstance:   '-3j' ) __repr__ equals:   '-3j';
		assert: (self targetInstance:   '+3j' ) __repr__ equals:    '3j';
		assert: (self targetInstance:    '3j' ) __repr__ equals:    '3j';
		yourself.
	[
		self targetInstance: '(1-3j'.
		self assert: false.
	] on: ValueError do: [:ex | 
		self assert: ex messageText equals: 'complex() arg is a malformed string'.
	].
%
category: 'done'
method: complexTest
test__new__twoParams

	[
		self targetClass ___new__init__: 1 _: Set new.
		self assert: false.
	] on: TypeError do: [:ex | 
		self assert: ex messageText equals: 'complex() second argument must be a number, not ''Set'''.
	].
	[
		self targetClass ___new__init__: 'Set new' _: 1.
		self assert: false.
	] on: TypeError do: [:ex |
		self assert: ex messageText equals: 'complex() can''t take second arg if first is a string'.
	].
%
category: 'done'
method: complexTest
test__pos__

	| a |
	a := self targetInstance: 3 _: 4.
	self
		assert: a __pos__ equals: a;
		yourself.
%
category: 'done'
method: complexTest
test__pow__

	| a |
	a := self targetInstance: 3 _: 4.
	self
		assert: ( a __mul__: a ) equals: (( self targetInstance: 3 _: 4 ) __pow__: ( self int: 2 ) );
		assert: ( ( a __mul__: a ) __mul__: a ) equals: (( self targetInstance: 3 _: 4 ) __pow__: ( self int: 3 ) );
		yourself.
%
category: 'done'
method: complexTest
test__radd__
	| a |
	a := self targetInstance: 1 _: 2.

	self
		assert: ( a __radd__: a ) equals: ( self targetInstance: 2 _: 4 );
		assert: ( a __radd__: ( self int: 2 ) ) equals: ( self targetInstance: 3 _: 2 );
		yourself.
%
category: 'done'
method: complexTest
test__rdivmod__

	[
		self targetInstance __rdivmod__: ( self int: 2 ).
	] on: TypeError do: [:ex | 
		self assert: ex messageText equals: 'can''t take floor or mod of complex numbers'.
	].
%
category: 'done'
method: complexTest
test__repr__

	self
		assert: (self targetInstance: 1 _: 3) __repr__ equals: '(1+3j)';
		assert: (self targetInstance: 1 _:-3) __repr__ equals: '(1-3j)';
	   	assert: (self targetInstance: 0 _:-3) __repr__ equals:   '-3j';
		assert: (self targetInstance: 1 _: 0) __repr__ equals: '(1+0j)';
		assert: (self targetInstance:-1 _: 0) __repr__ equals:'(-1+0j)';
		yourself.
%
category: 'done'
method: complexTest
test__rfloordiv__

	[
		self targetInstance __rfloordiv__: ( self int: 2 ).
		self assert: false.
	] on: TypeError do: [:ex | 
		self assert: ex messageText equals: 'can''t take floor of complex numbers'.
	].
%
category: 'done'
method: complexTest
test__rmod__

	[
		self targetInstance __mod__: ( self int: 2 ).
		self assert: false.
	] on: TypeError do: [:ex |
		self assert: ex messageText equals: 'can''t mod complex numbers'.
	].
%
category: 'done'
method: complexTest
test__rmul__

	| a |
	a := self targetInstance: 3 _: 4.
	self
		assert: ( a __rmul__: ( self int: 2 ) ) equals: ( self targetInstance: 6 _: 8 );
		assert: ( a __rmul__: ( self targetInstance: 1 _: 2 ) ) real equals: ( self int: -5 );
		assert: ( a __rmul__: ( self targetInstance: 1 _: 2 ) ) imag equals: ( self int: 10 );
		yourself.
%
category: 'done'
method: complexTest
test__rpow__

	| a |
	a := self targetInstance: 3 _: 4.
	self
		assert: ( a __mul__: a ) equals: (( self targetInstance: 3 _: 4 ) __rpow__: ( self int: 2 ) );
		assert: ( ( a __mul__: a ) __mul__: a ) equals: (( self targetInstance: 3 _: 4 ) __rpow__: ( self int: 3 ) );
		yourself.
%
category: 'done'
method: complexTest
test__rsub__

	| a |
	a := self targetInstance: 3 _: 4.
	self
		assert: ( a __rsub__: ( self int: 2 ) ) equals: ( self targetInstance: -1 _: -4 );
		assert: ( a __rsub__: ( self targetInstance: 1 _: 2 ) ) real equals: ( self int: -2 );
		assert: ( a __rsub__: ( self targetInstance: 1 _: 2 ) ) imag equals: ( self int: -2 );
		yourself.
%
category: 'done'
method: complexTest
test__rtruediv__

	| a b |
	a := self targetInstance: 1 _: 2.
	b := self targetInstance: 2 _: 1.
	self
		assert: (a __rtruediv__: (self int: 3)) real equals: (self float: 3.0 / 5.0);
		assert: (a __rtruediv__: (self int: 3)) imag equals: (self float: -6.0 / 5.0);
		assert: (a __rtruediv__: b) real equals: (self float: 4.0 / 5.0);
		assert: (a __rtruediv__: b) imag equals: (self float: -3.0 / 5.0);
		assert: (b __rtruediv__: a) real equals: (self float: 4.0 / 5.0);
		assert: (b __rtruediv__: a) imag equals: (self float: 3.0 / 5.0 );
		assert: (b __rtruediv__: b) equals: ( self targetInstance: 1 _: 0 );
		yourself.
%
category: 'done'
method: complexTest
test__sub__

	| a |
	a := self targetInstance: 3 _: 4.
	self
		assert: ( a __sub__: ( self int: 2 ) ) equals: ( self targetInstance: 1 _: 4 );
		assert: ( a __sub__: ( self targetInstance: 1 _: 2 ) ) real equals: ( self int: 2 );
		assert: ( a __sub__: ( self targetInstance: 1 _: 2 ) ) imag equals: ( self int: 2 );
		yourself.
%
category: 'done'
method: complexTest
test__truediv__

	| a b |
	a := self targetInstance: 1 _: 2.
	b := self targetInstance: 2 _: 1.
	self
		assert: (a __truediv__: (self int: 3)) real equals: (self float: 1.0 / 3.0);
		assert: (a __truediv__: (self int: 3)) imag equals: (self float: 2.0 / 3.0);
		assert: (a __truediv__: b) real equals: (self float: 4.0 / 5.0);
		assert: (a __truediv__: b) imag equals: (self float: 3.0 / 5.0);
		assert: (b __truediv__: a) real equals: (self float: 4.0 / 5.0);
		assert: (b __truediv__: a) imag equals: (self float: -3.0 / 5.0);
		assert: (b __truediv__: b) equals: ( self targetInstance: 1 _: 0 );
		yourself.
%
category: 'done'
method: complexTest
testconjugate

	| a b |
	a := self targetInstance: 1 _: 2.
	b := self targetInstance: 2 _: 1.
	self
		assert: a conjugate real equals: ( self int: 1 );
		assert: a conjugate imag equals: ( self int: -2 );
		assert: b conjugate real equals: ( self int: 2 );
		assert: b conjugate imag equals: ( self int: -1 );
		yourself.
%
category: 'done'
method: complexTest
testimag

	self
		assert: ( self targetInstance:  1 _:  2 ) imag equals: ( self int:  2) ;
		assert: ( self targetInstance: -1 _:  2 ) imag equals: ( self int:  2 );
		assert: ( self targetInstance:  1 _: -2 ) imag equals: ( self int: -2 );
		assert: ( self targetInstance:  1 ) imag equals: ( self int: 0 );
		assert: ( self targetInstance: -1 ) imag equals: ( self int: 0 );
		assert: self targetInstance imag equals: ( self int: 0 );
		yourself.
%
category: 'done'
method: complexTest
testreal

	self
		assert: self targetInstance real equals: ( self int: 0 );
		assert: ( self targetInstance:  1 _:  2 ) real equals: ( self int:  1 );
		assert: ( self targetInstance: -1 _:  2 ) real equals: ( self int: -1 );
		assert: ( self targetInstance:  1 _: -2 ) real equals: ( self int:  1 );
		assert: ( self targetInstance:  1 ) real equals: ( self int:  1 );
		assert: ( self targetInstance: -1 ) real equals: ( self int: -1 );
		yourself.
%
set compile_env: 0
category: 'todo'
method: complexTest
test__getnewargs__
   #pyTodo
%
