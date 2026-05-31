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

	importlib @env1:modules @env0:removeKey: #'multiple_inheritance' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/multiple_inheritance.py')
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
