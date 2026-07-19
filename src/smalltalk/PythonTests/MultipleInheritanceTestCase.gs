! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MultipleInheritanceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MultipleInheritanceTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
MultipleInheritanceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MultipleInheritanceTestCase — class C(A, B): C keeps its Smalltalk single
! inheritance from the first base and merges in the secondary Python bases'
! methods (importlib ___mergeSecondaryBases___).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MultipleInheritanceTestCase removeAllMethods.
MultipleInheritanceTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-MI'
method: MultipleInheritanceTestCase
loadFixture
	"Load tests/python/multiple_inheritance.py fresh."

	importlib @env1:modules removeKey: #'multiple_inheritance' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/multiple_inheritance.py')
		name: 'multiple_inheritance'
%

category: 'Grail-Tests-MI'
method: MultipleInheritanceTestCase
testInheritsFromBothBases
	"A class with two bases inherits methods from the primary base
	(Smalltalk single inheritance) AND the secondary base (merged),
	and construction uses the secondary base's __init__."

	self assert: self loadFixture @env1:inherits_methods_from_both equals: true
%

category: 'Grail-Tests-MI'
method: MultipleInheritanceTestCase
testLeftmostBaseWins
	"When both bases define a method, the leftmost (primary) base wins."

	self assert: self loadFixture @env1:leftmost_base_wins equals: true
%

category: 'Grail-Tests-MI'
method: MultipleInheritanceTestCase
testOwnMethodBeatsBases
	"A method on the class itself beats both bases."

	self assert: self loadFixture @env1:own_method_beats_bases equals: true
%

category: 'Grail-Tests-MI'
method: MultipleInheritanceTestCase
testSecondaryBaseOverridesObjectDefault
	"A secondary base's dunder (__repr__) overrides the universal
	object default — the roots don't block secondary methods."

	self assert: self loadFixture @env1:secondary_base_repr_beats_object_default equals: true
%

category: 'Grail-Tests-MI'
method: MultipleInheritanceTestCase
testStorageBaseSelectedAsSuperclass
	"class MixedDict(TagMixin, MyDict) where MyDict subclasses the
	built-in dict: the Smalltalk superclass is the built-in-backed base
	(MyDict), NOT the storage-less leftmost mixin — so the class keeps
	dict storage.  The mixin's own method (tag) is still merged in.
	See importlib ___selectStorageBase___."

	| mod mixed myDict |
	mod := self loadFixture.
	mixed := mod @env1:MixedDict.
	myDict := mod @env1:MyDict.
	"Storage base (the dict-subclass) is the Smalltalk superclass."
	self assert: (mixed inheritsFrom: myDict).
	"...so the class is dict-backed."
	self assert: (mixed inheritsFrom: KeyValueDictionary).
	"The leftmost mixin is NOT the superclass — its method (tag, a
	0-arg Python method → unary env-1 selector) is merged onto the
	class itself rather than inherited."
	self assert: (mixed whichClassIncludesSelector: #'tag' environmentId: 1) == mixed
%

category: 'Grail-Tests - C3'
method: MultipleInheritanceTestCase
testC3DiamondOrder
	"The diamond D(B, C) linearizes to [D, B, C, A] -- both branches
	before the shared ancestor.  Regresses __mro__ answering the plain
	Smalltalk chain (which lost the secondary branch entirely)."

	| names |
	names := self loadFixture @env1:c3_diamond_order.
	self assert: (names @env1:__getitem__: 0) equals: 'C3D'.
	self assert: (names @env1:__getitem__: 1) equals: 'C3B'.
	self assert: (names @env1:__getitem__: 2) equals: 'C3C'.
	self assert: (names @env1:__getitem__: 3) equals: 'C3A'
%

category: 'Grail-Tests - C3'
method: MultipleInheritanceTestCase
testBasesReportTrueBases
	"cls.__bases__ answers the DECLARED bases, not the single Smalltalk
	superclass."

	| names |
	names := self loadFixture @env1:c3_bases_are_true_bases.
	self assert: (names @env1:__len__) equals: 2.
	self assert: (names @env1:__getitem__: 0) equals: 'C3B'.
	self assert: (names @env1:__getitem__: 1) equals: 'C3C'
%

category: 'Grail-Tests - C3'
method: MultipleInheritanceTestCase
testSecondaryBaseIsinstance
	"isinstance / issubclass see secondary bases through the registered
	MRO (the Smalltalk isKindOf: chain cannot)."

	| r |
	r := self loadFixture @env1:c3_secondary_isinstance.
	self assert: (r @env1:__getitem__: 0) equals: true.
	self assert: (r @env1:__getitem__: 1) equals: true.
	self assert: (r @env1:__getitem__: 2) equals: true
%

category: 'Grail-Tests - C3'
method: MultipleInheritanceTestCase
testCooperativeSuperChain
	"super() is MRO-POSITIONAL: CoopMixin's super().__init__ reaches
	CoopBase through CoopD's MRO even though CoopMixin does not inherit
	from CoopBase.  Regresses the documented copied-method super bug
	(it used to resolve against the mixin's own Smalltalk chain and
	skip the base entirely)."

	| log |
	log := self loadFixture @env1:cooperative_super_chain.
	self assert: (log @env1:__len__) equals: 3.
	self assert: (log @env1:__getitem__: 0) equals: 'd'.
	self assert: (log @env1:__getitem__: 1) equals: 'mixin'.
	self assert: (log @env1:__getitem__: 2) equals: 'base'
%

category: 'Grail-Tests - C3'
method: MultipleInheritanceTestCase
testInconsistentMroRaisesTypeError
	"A hierarchy with no consistent linearization raises TypeError at
	class creation, matching CPython."

	self assert: (self loadFixture @env1:inconsistent_mro_raises)
		equals: 'type-error'
%
