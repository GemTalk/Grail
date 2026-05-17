! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NamedIntConstantTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NamedIntConstantTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NamedIntConstantTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
NamedIntConstantTestCase removeAllMethods.
NamedIntConstantTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NamedIntConstantTestCase
setUp

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'named_int_constant' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/named_int_constant.py')
		name: 'named_int_constant'.
%

category: 'Grail-Tests - NamedIntConstant'
method: NamedIntConstantTestCase
testNameAttribute
	"The .name attribute holds the symbolic name passed at construction."

	self assert: (testModule @env1:name_attr) equals: 'LITERAL'.
%

category: 'Grail-Tests - NamedIntConstant'
method: NamedIntConstantTestCase
testRepr
	"repr() of a NamedIntConstant is its name — the whole point
	of the wrapper (debuggable opcode dumps)."

	self assert: (testModule @env1:repr_str) equals: 'LITERAL'.
%

category: 'Grail-Tests - NamedIntConstant'
method: NamedIntConstantTestCase
testIntConversion
	"int(named_constant) returns the underlying SmallInteger value."

	self assert: (testModule @env1:as_int) equals: 16.
%

category: 'Grail-Tests - NamedIntConstant'
method: NamedIntConstantTestCase
testEqualityWithInt
	"`LITERAL == 16` (the direction re/_compiler.py uses) compares
	by underlying value."

	self assert: (testModule @env1:eq_with_int) equals: true.
	self assert: (testModule @env1:ne_with_int) equals: false.
%

category: 'Grail-Tests - NamedIntConstant'
method: NamedIntConstantTestCase
testReverseEqualityWithInt
	"`16 == LITERAL` — the reverse direction.  Without Int>>__eq__'s
	__index__ fallback this would silently return false, dropping
	the .name on the floor.  We make it work both ways to avoid
	the foot-gun."

	self assert: (testModule @env1:reverse_eq) equals: true.
	self assert: (testModule @env1:reverse_ne) equals: false.
%

category: 'Grail-Tests - NamedIntConstant'
method: NamedIntConstantTestCase
testIdentityIsDistinct
	"Two NamedIntConstants with the same value but different .name
	identity are distinct objects (Symbol-like).  ``is`` returns
	False even when the values are equal."

	self assert: (testModule @env1:identity_different) equals: false.
%

category: 'Grail-Tests - NamedIntConstant'
method: NamedIntConstantTestCase
testSetMembership
	"`LITERAL in {LITERAL, BRANCH}` works — __hash__ and __eq__
	agree on the underlying integer value."

	self assert: (testModule @env1:literal_in_set) equals: true.
	self assert: (testModule @env1:maxrepeat_in_set) equals: false.
%

category: 'Grail-Tests - NamedIntConstant'
method: NamedIntConstantTestCase
testArithmeticForwarding
	"Arithmetic operators not specifically overridden forward via
	DNU to the underlying SmallInteger value.  Returns a plain int."

	self assert: (testModule @env1:maxrepeat_minus_one) equals: 4294967294.
	self assert: (testModule @env1:greater_than_zero) equals: true.
%
