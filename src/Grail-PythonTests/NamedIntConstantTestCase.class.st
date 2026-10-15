Class {
	#name : 'NamedIntConstantTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
NamedIntConstantTestCase >> setUp [

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'named_int_constant' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/named_int_constant.py')
		name: 'named_int_constant'.

]

{ #category : 'Grail-Tests - NamedIntConstant' }
NamedIntConstantTestCase >> testArithmeticBothOperandOrders [
	"Mixed arithmetic coerces the wrapper to its plain value in both
	operand orders, yielding a plain SmallInteger."

	self assert: (testModule @env1:plus_one) equals: 17.
	self assert: (testModule @env1:one_plus) equals: 17.
	self assert: (testModule @env1:hundred_minus) equals: 84.

]

{ #category : 'Grail-Tests - NamedIntConstant' }
NamedIntConstantTestCase >> testArithmeticForwarding [
	"Arithmetic operators not specifically overridden forward via
	DNU to the underlying SmallInteger value.  Returns a plain int."

	self assert: (testModule @env1:maxrepeat_minus_one) equals: 4294967294.
	self assert: (testModule @env1:greater_than_zero) equals: true.

]

{ #category : 'Grail-Tests - NamedIntConstant' }
NamedIntConstantTestCase >> testEqualityWithInt [
	"`LITERAL == 16` (the direction re/_compiler.py uses) compares
	by underlying value."

	self assert: (testModule @env1:eq_with_int) equals: true.
	self assert: (testModule @env1:ne_with_int) equals: false.

]

{ #category : 'Grail-Tests - NamedIntConstant' }
NamedIntConstantTestCase >> testIdentityIsDistinct [
	"Two NamedIntConstants with the same value but different .name
	identity are distinct objects (Symbol-like).  ``is`` returns
	False even when the values are equal."

	self assert: (testModule @env1:identity_different) equals: false.

]

{ #category : 'Grail-Tests - NamedIntConstant' }
NamedIntConstantTestCase >> testIntConversion [
	"int(named_constant) returns the underlying SmallInteger value."

	self assert: (testModule @env1:as_int) equals: 16.

]

{ #category : 'Grail-Tests - NamedIntConstant' }
NamedIntConstantTestCase >> testIsInstanceOfInt [
	"Now an AbstractPyInt (a real Number), so isinstance(op, int) is
	True — matching CPython's _NamedIntConstant(int).  Real ints still
	pass and non-ints still fail."

	self assert: (testModule @env1:is_int) equals: true.
	self assert: (testModule @env1:plain_is_int) equals: true.
	self assert: (testModule @env1:str_not_int) equals: false.

]

{ #category : 'Grail-Tests - NamedIntConstant' }
NamedIntConstantTestCase >> testNameAttribute [
	"The .name attribute holds the symbolic name passed at construction."

	self assert: (testModule @env1:name_attr) equals: 'LITERAL'.

]

{ #category : 'Grail-Tests - NamedIntConstant' }
NamedIntConstantTestCase >> testRepr [
	"repr() of a NamedIntConstant is its name — the whole point
	of the wrapper (debuggable opcode dumps)."

	self assert: (testModule @env1:repr_str) equals: 'LITERAL'.

]

{ #category : 'Grail-Tests - NamedIntConstant' }
NamedIntConstantTestCase >> testReverseComparison [
	"int-on-the-left comparison works via the kernel's Number
	coercion now that the wrapper is a real Number."

	self assert: (testModule @env1:reverse_lt_true) equals: true.
	self assert: (testModule @env1:reverse_lt_false) equals: false.
	self assert: (testModule @env1:forward_lt) equals: true.

]

{ #category : 'Grail-Tests - NamedIntConstant' }
NamedIntConstantTestCase >> testReverseEqualityWithInt [
	"`16 == LITERAL` — the reverse direction.  Without Int>>__eq__'s
	__index__ fallback this would silently return false, dropping
	the .name on the floor.  We make it work both ways to avoid
	the foot-gun."

	self assert: (testModule @env1:reverse_eq) equals: true.
	self assert: (testModule @env1:reverse_ne) equals: false.

]

{ #category : 'Grail-Tests - NamedIntConstant' }
NamedIntConstantTestCase >> testSetMembership [
	"`LITERAL in {LITERAL, BRANCH}` works — __hash__ and __eq__
	agree on the underlying integer value."

	self assert: (testModule @env1:literal_in_set) equals: true.
	self assert: (testModule @env1:maxrepeat_in_set) equals: false.

]
