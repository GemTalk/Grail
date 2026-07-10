! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ObjectTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ObjectTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ObjectTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing behavior from ObjectTestCase

set compile_env: 0

expectvalue /Metaclass3
doit
ObjectTestCase removeAllMethods.
ObjectTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Attribute Access'
method: ObjectTestCase
test__class__
	"Test that __class__ returns the class of the object"

	| obj result |
	obj := object @env1:__new__.
	result := obj @env1:__class__.
	self assert: result equals: object
%

category: 'Grail-Attribute Access'
method: ObjectTestCase
test__dir__
	"Test that __dir__ returns a sorted array of method names"

	| obj result |
	obj := object @env1:__new__.
	result := obj @env1:__dir__.

	"Result should be an Array"
	self assert: result class equals: Array.

	"Result should include some known Python methods"
	self assert: (result includes: '__class__').
	self assert: (result includes: '__dir__').
	self assert: (result includes: '__eq__').
	self assert: (result includes: '__hash__').
	self assert: (result includes: '__repr__')
%

category: 'Grail-Other'
method: ObjectTestCase
test__doc__
	"Test that __doc__ returns the docstring"

	| obj result |
	obj := object @env1:__new__.
	result := obj @env1:__doc__.

	"Result should be a Unicode7"
	self assert: result class equals: Unicode7.

	"Result should contain expected text"
	self assert: (result includesString: 'base class')
%

category: 'Grail-Comparison'
method: ObjectTestCase
test__eq__
	"Test that __eq__ works correctly"

	| obj1 obj2 |
	obj1 := object @env1:__new__.
	obj2 := obj1.

	"Same object should be equal to itself"
	self assert: (obj1 @env1:__eq__: obj2).

	"Different objects should not be equal"
	obj2 := object @env1:__new__.
	self deny: (obj1 @env1:__eq__: obj2)
%

category: 'Grail-Hashing & Identity'
method: ObjectTestCase
test__hash__
	"Test that __hash__ returns a hash value"

	| obj result |
	obj := object @env1:__new__.
	result := obj @env1:__hash__.

	"Result should be a SmallInteger"
	self assert: result class equals: SmallInteger
%

category: 'Grail-Initialization'
method: ObjectTestCase
test__init__
	"Test that __init__ initializes an instance (instance method)"

	| obj result |
	obj := object @env1:__new__.
	result := obj @env1:__init__.

	"Result should be Python None"
	self assert: result equals: None
%

category: 'Grail-Initialization'
method: ObjectTestCase
test__init_subclass__
	"Test that __init_subclass__ is a class method"

	| result |
	"Call __init_subclass__ as a class method on object"
	result := object @env1:__init_subclass__.

	"Result should be Python None"
	self assert: result equals: None
%

category: 'Grail-Comparison'
method: ObjectTestCase
test__ne__
	"Test that __ne__ works correctly"

	| obj1 obj2 |
	obj1 := object @env1:__new__.
	obj2 := obj1.

	"Same object should not be not-equal to itself"
	self deny: (obj1 @env1:__ne__: obj2).

	"Different objects should be not-equal"
	obj2 := object @env1:__new__.
	self assert: (obj1 @env1:__ne__: obj2)
%

category: 'Grail-Initialization'
method: ObjectTestCase
test__new__
	"Test that __new__ creates a new instance (class method)"

	| result obj1 obj2 |
	"Call __new__ as a class method on object"
	result := object @env1:__new__.

	"Result should be an instance of object"
	self assert: result class equals: object.

	"Each call to __new__ should create a different instance"
	obj1 := object @env1:__new__.
	obj2 := object @env1:__new__.
	self deny: obj1 == obj2
%

category: 'Grail-String Representation'
method: ObjectTestCase
test__repr__
	"Test that __repr__ returns a string representation"

	| obj result |
	obj := object @env1:__new__.
	result := obj @env1:__repr__.

	"Result should be a Unicode7"
	self assert: result class equals: Unicode7.

	"Result should contain 'Object' and 'object'"
	self assert: (result includesString: 'Object').
	self assert: (result includesString: 'object')
%

category: 'Grail-Other'
method: ObjectTestCase
test__sizeof__
	"Test that __sizeof__ returns a size in bytes"

	| obj result |
	obj := object @env1:__new__.
	result := obj @env1:__sizeof__.

	"Result should be a SmallInteger"
	self assert: result class equals: SmallInteger.

	"Result should be positive"
	self assert: result > 0
%

category: 'Grail-String Representation'
method: ObjectTestCase
test__str__
	"Test that __str__ returns a string representation"

	| obj result |
	obj := object @env1:__new__.
	result := obj @env1:__str__.

	"Result should be a Unicode7"
	self assert: result class equals: Unicode7
%

category: 'Grail-Tests - Initialization'
method: ObjectTestCase
testVarargsInitIsNoOp
	"object.__init__(*args, **kwargs) is a no-op (CPython semantics
	when __new__ is overridden).  Without the varargs form, calling
	__init__ with arguments on a non-PythonInstance receiver died with
	an UNCATCHABLE MessageNotUnderstood (test_fractions.testImmutable)."

	self assert: (self eval: 'x = 7
r = x.__init__(2, 15)
[r is None, x]') @env1:__repr__ equals: '[True, 7]'
%
