! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AbstractBasesProtocolTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AbstractBasesProtocolTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
AbstractBasesProtocolTestCase comment:
'The old-style ``__bases__'' protocol for isinstance() / issubclass().

CPython does not require a real type: recursive_issubclass falls back to
abstract_issubclass, which walks the candidate''s __bases__ graph by identity,
and recursive_isinstance does the same starting from the instance''s __class__.
An object that merely exposes a tuple __bases__ participates in subclass checks
without being a type at all.  Grail rejected both outright with
``issubclass() arg must be a type'' -- 16 of test_isinstance''s 20 failures.

Two deliberate limits are asserted: a cyclic __bases__ graph raises Python''s
RecursionError (the walk consumes no Smalltalk stack, so the guard is an
explicit step count), and the ceiling is low because a getter that manufactures
classes per level overflows the Smalltalk stack before a larger counter fires.

Also covers a bug this work exposed: issubclass''s TUPLE branch did not resolve
its elements, so ``issubclass(B, (str, A))'' died on ``str'' before reaching A,
and nested tuples were unsupported.

See tests/python/abstract_bases_protocol.py.'
%

expectvalue /Class
doit
AbstractBasesProtocolTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
AbstractBasesProtocolTestCase removeAllMethods: 0.
AbstractBasesProtocolTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: AbstractBasesProtocolTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'abstract_bases_protocol' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/abstract_bases_protocol.py')
		name: 'abstract_bases_protocol'.
%

category: 'Grail-Helpers'
method: AbstractBasesProtocolTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Tests - issubclass'
method: AbstractBasesProtocolTestCase
testIssubclassWalksTheBasesGraph
	"Identity, one hop, and a two-hop linear chain -- plus the wrong direction
	and an unrelated node answering false."

	self assert: (self resultAt: 'issubclass_graph') equals: true
%

category: 'Grail-Tests - issubclass'
method: AbstractBasesProtocolTestCase
testIssubclassWalksMultipleBases
	"A node with several bases recurses into each; a single base iterates, so a
	long linear chain costs no depth."

	self assert: (self resultAt: 'issubclass_multi') equals: true
%

category: 'Grail-Tests - issubclass'
method: AbstractBasesProtocolTestCase
testEmptyBasesIsNotASubclass
	"An empty __bases__ terminates the walk with false -- it does not mean
	``matches anything''."

	self assert: (self resultAt: 'empty_bases') equals: true
%

category: 'Grail-Tests - isinstance'
method: AbstractBasesProtocolTestCase
testIsinstanceUsesTheInstancesClass
	"recursive_isinstance starts from the instance's __class__ and walks from
	there."

	self assert: (self resultAt: 'isinstance_class') equals: true
%

category: 'Grail-Tests - Errors'
method: AbstractBasesProtocolTestCase
testNonClassStillRaisesTypeError
	"Something with no __bases__ at all is still an error -- and a CATCHABLE
	Python TypeError, not the AttributeError that leaked out while the guard
	caught the wrong exception class (Grail's Python exceptions hang off
	Exception, not Error)."

	self assert: (self resultAt: 'non_class_typeerror') equals: true
%

category: 'Grail-Tests - Errors'
method: AbstractBasesProtocolTestCase
testNonTupleBasesDoesNotQualify
	"__bases__ must be a TUPLE; anything else means ``not a class''."

	self assert: (self resultAt: 'non_tuple_bases') equals: true
%

category: 'Grail-Tests - Depth guard'
method: AbstractBasesProtocolTestCase
testCyclicBasesRaisesRecursionError
	"A self-referential __bases__ used to spin forever in the single-base walk,
	taking the whole scoring session down rather than failing one test."

	self assert: (self resultAt: 'cyclic_recursionerror') equals: true
%

category: 'Grail-Tests - Depth guard'
method: AbstractBasesProtocolTestCase
testMutuallyCyclicGraphRaisesRecursionError
	"Two nodes naming each other -- the cycle is not self-referential, so it
	also needs the step count rather than an identity check."

	self assert: (self resultAt: 'mutual_cycle') equals: true
%

category: 'Grail-Tests - Unaffected'
method: AbstractBasesProtocolTestCase
testRealTypesAreUnaffected
	"The fast path must not change: two real types never reach the __bases__
	walk.  Includes the tuple and nested-tuple forms, which is where the
	element-resolution bug lived."

	self assert: (self resultAt: 'real_types') equals: true
%

category: 'Grail-Tests - ABC'
method: AbstractBasesProtocolTestCase
testAbstractInstantiation
	"CPython refuses to instantiate a class that still has abstract methods.

	Honoured only for a class that EXPLICITLY declared ``metaclass=abc.ABCMeta''.
	A plain class using @abc.abstractmethod is deliberately left alone -- abc.py
	records why: twilio's AuthStrategy / CredentialProvider are plain classes
	whose abstract methods raise NotImplementedError from their bodies, and
	blocking them would break working code.  All three directions are asserted
	here, because the exclusion is as much the behaviour as the enforcement.

	Overriding clears it, which is how email's Compat32 instantiates while the
	Policy it derives from does not."

	self assert: testModule @env1:abstract_instantiation asArray equals: #(
		'abstract: TypeError'
		'concrete: 3'
		'plain: PlainWithAbstract' ).
%
