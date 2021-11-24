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


	[
		self targetInstance __delattr__: (self str: '__class__').
		self assert: false.
	] on: TypeError do: [:ex |
		self assert: ex messageText equals: 'can''t delete __class__ attribute'.
	].
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
"   self assert: (dir __contains__: (self str: '__class__')).
   self assert: (dir __contains__: (self str: '__delattr__')).
   self assert: (dir __contains__: (self str: '__dir__')).
   self assert: (dir __contains__: (self str: '__doc__')).
   self assert: (dir __contains__: (self str: '__eq__')).
   self assert: (dir __contains__: (self str: '__format__')).
   self assert: (dir __contains__: (self str: '__ge__')).
   self assert: (dir __contains__: (self str: '__getattribute__')).
   self assert: (dir __contains__: (self str: '__gt__')).
   self assert: (dir __contains__: (self str: '__hash__')).
   "self assert: (dir __contains__: (self str: '__init__'))."
   "self assert: (dir __contains__: (self str: '__init_subclass__'))."
   self assert: (dir __contains__: (self str: '__le__')).
   self assert: (dir __contains__: (self str: '__lt__')).
   self assert: (dir __contains__: (self str: '__ne__')).
   self assert: (dir __contains__: (self str: '__new__')).
   "self assert: (dir __contains__: (self str: '__reduce__'))."
   "self assert: (dir __contains__: (self str: '__reduce_ex__'))."
   self assert: (dir __contains__: (self str: '__repr__')).
   self assert: (dir __contains__: (self str: '__setattr__')).
   self assert: (dir __contains__: (self str: '__sizeof__')).
   self assert: (dir __contains__: (self str: '__str__')).
   self assert: (dir __contains__: (self str: '__subclasshook__')).
%
category: 'tests'
method: objectTest
test__doc__

	| doc |
	doc := 'The base class of the class hierarchy.\n\n' ,
		'When called, it accepts no arguments and returns a new featureless\n' ,
		'instance that has no instance attributes and cannot be given any.\n'.

	self
		assert: object __call__ __doc__ equals: doc;
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
test__ge__

	self
	   assert: (self targetInstance __ge__: (self str: 'x')) == NotImplementedType singleton;
		yourself.
%
category: 'tests'
method: objectTest
test__gt__

	self
		assert: (self targetInstance __gt__: (self str: 'x')) == NotImplementedType singleton;
		yourself.
%
category: 'tests'
method: objectTest
test__hash__

	self
		deny: self targetInstance __hash__ equals: self targetInstance __hash__;
		yourself.
%
category: 'tests'
method: objectTest
test__le__

	self
	   assert: (self targetInstance __le__: (self str: 'x')) == NotImplementedType singleton;
		yourself.
%
category: 'tests'
method: objectTest
test__lt__

	self
	   assert: (self targetInstance __lt__: (self str: 'x')) == NotImplementedType singleton;
		yourself.
%
category: 'tests'
method: objectTest
test__ne__

	self
	   assert: (self targetInstance __ne__: ('x')) == NotImplementedType singleton;
		yourself.
%
category: 'tests'
method: objectTest
test__new__

	self
		assert: self targetClass __new__ __class__ equals: self targetClass;
		yourself.
%
category: 'tests'
method: objectTest
test__new__onBaseExeption

	[
		self targetClass __new__: BaseException.
		self assert: false.
	] on: TypeError do: [:ex |
		self assert: ex messageText equals: 'object.__new__(BaseException) is not safe, use BaseException.__new__()'.
	].
%
category: 'tests'
method: objectTest
test__new__onList

	[
		self targetClass __new__: list.
		self assert: false.
	] on: TypeError do: [:ex |
		self assert: ex messageText equals: 'object.__new__(list) is not safe, use list.__new__()'.
	].
%
category: 'tests'
method: objectTest
test__repr__

   self
		assert: (self targetInstance __repr__ copyFrom: 1 to: 18)
		  equals: '<', self targetClass name, ' object at '.
%
category: 'tests'
method: objectTest
test__setattr__onExistentAttr

	[
		self targetInstance __setattr__: (self str: '__doc__') _: (self str: 'x').
		self assert: false.
	] on: AttributeError do: [:ex |
			self
				assert: ex messageText
				equals:
					self targetClass name asString printString
						, ' object attribute ''__doc__'' is read-only'.
	].
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

	self
		assert: (self targetInstance __str__ copyFrom: 1 to: 18)
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
test__format__

	self
		should: [self targetInstance __format__: (self str: 'x')] raise: TypeError;
		assert: ((self targetInstance __format__: (self str: '')) isKindOf: String);
		yourself.
		#pyElaborate
%
category: 'todo'
method: objectTest
test__getattribute__

	self
		should: [	self targetInstance __getattribute__: (self str: 'x')] raise: AttributeError;
		assert: ((	self targetInstance __getattribute__: (self str: '__doc__')) isKindOf: String);
		assert: (	self targetInstance __getattribute__: (self str: '__class__')) equals: object;
		yourself.
		#pyElaborate
%
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
category: 'todo'
method: objectTest
test__setattr__onNewAttr

	#pyElaborate.
	[
		self targetInstance __setattr__: (self str: 'te') _: (self str: 'x').
		self assert: false.
	] on: AttributeError do: [:ex |
			self
				assert: ex messageText
				equals:
					self targetClass name asString printString
						, ' object has no attribute ''te'''.
	].
%
