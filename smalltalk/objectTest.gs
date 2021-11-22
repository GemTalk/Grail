! ------------------- Remove existing behavior from objectTest
removeAllMethods objectTest
removeAllClassMethods objectTest
! ------------------- Class methods for objectTest
! ------------------- Instance methods for objectTest
set compile_env: 0
category: 'tests'
method: objectTest
test__class__

	self
		assert: self targetInstance __class__ equals: self targetClass;
		yourself.
%
category: 'tests'
method: objectTest
test__delattr__

	self
		should: [ self targetInstance __delattr__: '__class__'] raise: TypeError
		withExceptionDo: [ :exception |
			self assert: exception messageText equals: 'can''t delete __class__ attribute' ];
		yourself.
%
category: 'tests'
method: objectTest
test__dir__
	" please inspect
	self new writeDirTestOn: #('__class__' '__delattr__' '__dir__' '__doc__' '__eq__' '__format__' '__ge__' '__getattribute__' '__gt__' '__hash__' '__init__' '__init_subclass__' '__le__' '__lt__' '__ne__' '__new__' '__reduce__' '__reduce_ex__' '__repr__' '__setattr__' '__sizeof__' '__str__' '__subclasshook__')
	"
	| dir |
		dir := self targetInstance __dir__.
	self assert: dir __class__ equals: list.

   #pyTodo. "self assert: dir __len__ equals: 23.
"   self assert: ( dir __contains__: #__class__ ).
   self assert: ( dir __contains__: #__delattr__ ).
   self assert: ( dir __contains__: #__dir__ ).
   self assert: ( dir __contains__: #__doc__ ).
   self assert: ( dir __contains__: #__eq__ ).
   self assert: ( dir __contains__: #__format__ ).
   self assert: ( dir __contains__: #__ge__ ).
   self assert: ( dir __contains__: #__getattribute__ ).
   self assert: ( dir __contains__: #__gt__ ).
   self assert: ( dir __contains__: #__hash__ ).
   #pyTodo. "self assert: ( dir __contains__: #__init__ ).
"   #pyTodo. "self assert: ( dir __contains__: #__init_subclass__ ).
"   self assert: ( dir __contains__: #__le__ ).
   self assert: ( dir __contains__: #__lt__ ).
   self assert: ( dir __contains__: #__ne__ ).
   self assert: ( dir __contains__: #__new__ ).
   #pyTodo. "self assert: ( dir __contains__: #__reduce__ ).
"   #pyTodo. "self assert: ( dir __contains__: #__reduce_ex__ ).
"   self assert: ( dir __contains__: #__repr__ ).
   self assert: ( dir __contains__: #__setattr__ ).
   self assert: ( dir __contains__: #__sizeof__ ).
   self assert: ( dir __contains__: #__str__ ).
   self assert: ( dir __contains__: #__subclasshook__ ).
%
category: 'tests'
method: objectTest
test__doc__

	self
		assert: self targetInstance __doc__ equals: 'The base class of the class hierarchy.\n\nWhen called, it accepts no arguments and returns a new featureless\ninstance that has no instance attributes and cannot be given any.\n';
		yourself.
%
category: 'tests'
method: objectTest
test__eq__

	| a b |
	a := self targetInstance.
	b := self targetInstance.
	self
		assert: (a __eq__: a);
		assert: (b __eq__: b);
		deny: (a __eq__: b);
		deny: (b __eq__: a);
		yourself.
%
category: 'tests'
method: objectTest
test__format__

	self
		should: [ self targetInstance __format__: 'x'] raise: TypeError;
		assert: ((self targetInstance __format__: '') isKindOf: String);
		yourself.
		#pyElaborate
%
category: 'tests'
method: objectTest
test__ge__
	self
	   assert: ( self targetInstance __ge__: 'x') == NotImplementedType singleton;
		yourself.
%
category: 'tests'
method: objectTest
test__getattribute__

	self
		should: [ self targetInstance __getattribute__: 'x'] raise: AttributeError;
		assert: (( self targetInstance __getattribute__: '__doc__') isKindOf: String);
		assert: ( self targetInstance __getattribute__: '__class__') equals: object;
		yourself.
		#pyElaborate
%
category: 'tests'
method: objectTest
test__gt__
	self
	   assert: ( self targetInstance __gt__: 'x') == NotImplementedType singleton;
		yourself.
%
category: 'tests'
method: objectTest
test__hash__
   self deny: self targetInstance __hash__ equals: self targetInstance __hash__
%
category: 'tests'
method: objectTest
test__le__
	self
	   assert: ( self targetInstance __le__: 'x') == NotImplementedType singleton;
		yourself.
%
category: 'tests'
method: objectTest
test__lt__
	self
	   assert: ( self targetInstance __lt__: 'x') == NotImplementedType singleton;
		yourself.
%
category: 'tests'
method: objectTest
test__ne__
	self
	   assert: ( self targetInstance __ne__: 'x') == NotImplementedType singleton;
		yourself.
%
category: 'tests'
method: objectTest
test__new__

	self
		assert: ( self targetClass __new__: object ) __class__ equals: self targetClass;
		yourself.
%
category: 'tests'
method: objectTest
test__new__onBaseExeption

	self
		should: [ self targetClass __new__: BaseException ] raise: TypeError
		withExceptionDo: [ :exception |
			self assert: exception messageText equals: 'object.__new__(BaseException) is not safe, use BaseException.__new__()' ];
		yourself.
%
category: 'tests'
method: objectTest
test__new__onList

	self
		should: [ self targetClass __new__: list ] raise: TypeError
		withExceptionDo: [ :exception |
			self assert: exception messageText equals: 'object.__new__(list) is not safe, use list.__new__()' ];
		yourself.
%
category: 'tests'
method: objectTest
test__repr__
   self assert: ( self targetInstance __repr__ truncateTo: 21 )
		  equals: '<', self targetClass name, ' object at '.
%
category: 'tests'
method: objectTest
test__setattr__onExistentAttr
	self
		should: [ self targetInstance __setattr__: '__doc__' _: 'x' ]
			raise: AttributeError
			withExceptionDo: [ :exception |
			self
				assert: exception messageText
				equals:
					self targetClass name asString printString
						, ' object attribute ''__doc__'' is read-only' ];
		yourself
%
category: 'tests'
method: objectTest
test__setattr__onNewAttr
	self
		should: [ self targetInstance __setattr__: 'te' _: 'x' ]
			raise: AttributeError
			withExceptionDo: [ :exception |
			self
				assert: exception messageText
				equals:
					self targetClass name asString printString
						, ' object has no attribute ''te''' ];
		yourself.
	#pyElaborate
%
category: 'tests'
method: objectTest
test__sizeof__
	self
	   assert: self targetInstance __sizeof__ equals: 16;
		yourself.
%
category: 'tests'
method: objectTest
test__str__
   self assert: ( self targetInstance __str__ truncateTo: 21 )
		  equals: '<', self targetClass name, ' object at '.
%
category: 'tests'
method: objectTest
test__subclasshook__
	self
	   assert: self targetInstance __subclasshook__ == NotImplementedType singleton;
		yourself.
%
set compile_env: 0
category: 'todo'
method: objectTest
test__reduce__
   #pyTodo.
%
category: 'todo'
method: objectTest
test__reduce_ex__
   #pyTodo.
%
