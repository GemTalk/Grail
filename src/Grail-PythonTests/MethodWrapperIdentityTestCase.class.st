Class {
	#name : 'MethodWrapperIdentityTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MethodWrapperIdentityTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
MethodWrapperIdentityTestCase >> reprAt: aKey [
	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
MethodWrapperIdentityTestCase >> setUp [
	probe := self ___loadProbe___: 'method_wrapper_identity'.

]

{ #category : 'Grail-Tests' }
MethodWrapperIdentityTestCase >> testAClassmethodForwardsTheWrappedIdentity [
	"The same set, on the other wrapper.  Both are checked rather than one: the
	two classes carry SEPARATE copies of every forwarding method and of
	___pythonValueAttrs___, so a fix applied to one leaves the other exactly as
	it was."

	self assert: (self reprAt: 'classmethod_forwards')
		equals: '[True, True, True]'.

]

{ #category : 'Grail-Tests' }
MethodWrapperIdentityTestCase >> testAClassmethodObjectRefusesTheCallCatchably [
	"A staticmethod object is callable (bpo-43682, 3.10); a classmethod object is
	not.  The point of the test is CATCHABILITY, not the refusal: Grail already
	refused, but as an env-1 MessageNotUnderstood that Python cannot catch, so
	``assertRaises(TypeError, wrapper, 1)'' errored the test instead of passing
	it."

	self assert: (probe @env1:__getitem__: 'staticmethod_is_callable') equals: 1.
	self assert: (self reprAt: 'classmethod_is_not_callable')
		equals: '"TypeError: ''classmethod'' object is not callable"'.

]

{ #category : 'Grail-Tests' }
MethodWrapperIdentityTestCase >> testAModuleLevelFunctionHasItsDocstring [
	"It answered None, which testAModuleLevelFunctionsIdentityAttrsAreStillUnstable
	used to pin alongside the identity gap: a module-level def compiles to a
	method of the module class, and modules had no ___methodDocTable___."

	self assert: (self reprAt: 'module_level_function_doc')
		equals: '''a docstring the module-level path used to drop'''.

]

{ #category : 'Grail-Tests' }
MethodWrapperIdentityTestCase >> testAModuleLevelFunctionsIdentityAttrsAreStillUnstable [
	"THE GAP THIS WORK SURFACED, pinned so it cannot be mistaken for the wrapper
	one.  A Grail module-level function answers a FRESH object per read for
	__name__, __qualname__ and __annotations__ -- so ``f.__name__ is
	f.__name__'' is false and no amount of correct forwarding makes identity
	hold through a wrapper.  A nested def has none of these problems, which is
	why the fixture nests its function exactly as upstream does.  CPython
	answers True, True, True."

	self assert: (self reprAt: 'module_level_function_attrs_are_unstable')
		equals: '[False, False, False]'.

]

{ #category : 'Grail-Tests' }
MethodWrapperIdentityTestCase >> testAnnotationsReadsAsTheMappingNotABoundMethod [
	"THE MISS THAT LOOKED LIKE A HIT.  __annotations__ was forwarded but absent
	from ___pythonValueAttrs___, so the read wrapped the forwarding METHOD and
	answered a BoundMethod.  That is truthy, so a plain ``if ann:'' passes and
	only an isinstance or equality check catches it -- which is what this test
	does."

	self assert: (self reprAt: 'annotations_is_a_mapping') equals: '[True, True]'.

]

{ #category : 'Grail-Tests' }
MethodWrapperIdentityTestCase >> testAStaticmethodForwardsTheWrappedIdentity [
	"__func__, __wrapped__, and the five forwarded attributes, by IDENTITY.
	__wrapped__ and __module__ used to raise AttributeError outright."

	self assert: (self reprAt: 'staticmethod_forwards')
		equals: '[True, True, True]'.

]

{ #category : 'Grail-Tests' }
MethodWrapperIdentityTestCase >> testTheReprNamesTheWrappedCallable [
	"``<staticmethod(<function f at 0x...>)>''.  Asserted as the FORM, built from
	the same repr a reader would get, because Grail reprs a function as
	``<BoundMethod object at ...>'' -- a separate gap that a literal expectation
	here would have entangled with this one."

	self assert: (self reprAt: 'staticmethod_repr') equals: 'True'.
	self assert: (self reprAt: 'classmethod_repr') equals: 'True'.

]
