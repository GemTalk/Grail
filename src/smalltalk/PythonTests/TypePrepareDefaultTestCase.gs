! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypePrepareDefaultTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TypePrepareDefaultTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TypePrepareDefaultTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TypePrepareDefaultTestCase
!
! type.__prepare__, and the ``super().__prepare__(name, bases, **kwds)'' that
! reaches it.
!
! CPython's type.__prepare__ answers a new, empty dict and ignores its arguments.
! What it is FOR is the idiom a metaclass writes to start from the default and
! then seed or wrap it.  Grail's ``type'' had no __prepare__, so that super()
! read raised AttributeError and the class statement failed.
!
! NOW: type class >> ___prepare__:kw: answers a fresh dict.  It is the varargs
! entry, so it serves every spelling -- ``type.__prepare__()'', with arguments,
! with keywords, and through super().
!
! THE HALF THAT IS NOT VISIBLE FROM PYTHON.  Every metaclass inherits that
! method, ABCMeta included, and object >> ___grailPrepareNamespace___:bases:
! keywords: used to read ``has a __prepare__'' as ``supplies a namespace''.
! Unguarded, every class with a Python metaclass would have been given a
! namespace, where one that overrides nothing has always been given none -- and
! a Python-level check cannot tell, because the class comes out the same.
! ___grailIsTypesOwnPrepare___: tells type's default from one the metaclass
! defines, and the namespace tests below ask the machinery directly.
!
! Drives tests/python/type_prepare_default.py, whose EXPECTED table was measured
! by RUNNING CPython 3.14.6.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TypePrepareDefaultTestCase removeAllMethods.
TypePrepareDefaultTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TypePrepareDefaultTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'type_prepare_default' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_prepare_default.py')
		name: 'type_prepare_default'.
%

category: 'Grail-Private'
method: TypePrepareDefaultTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Private'
method: TypePrepareDefaultTestCase
___namespaceFor___: scratchName metaclass: aMetaclass
	"What the class-statement machinery prepares for the fixture's scratch class
	when aMetaclass is its metaclass -- nil for no namespace.  Removed from the
	pending table afterwards, so a namespace it did allocate outlives nothing."

	| scratch ns tbl |
	scratch := testModule @env1:___pyAttrLoad___: scratchName.
	ns := scratch @env1:___grailPrepareNamespace___: aMetaclass bases: #() keywords: nil.
	tbl := SessionTemps current at: #'GrailPendingClassNamespace' otherwise: nil.
	tbl == nil ifFalse: [tbl removeKey: scratch ifAbsent: [nil]].
	^ ns
%

category: 'Grail-Tests - type.__prepare__'
method: TypePrepareDefaultTestCase
testTypePrepareAnswersAFreshEmptyDict
	"Whatever it is handed, and through any metaclass."

	self assertMatchesCPythonAt: 'returns_an_empty_dict'.
	self assertMatchesCPythonAt: 'ignores_its_arguments'.
	self assertMatchesCPythonAt: 'fresh_dict_each_call'.
	self assertMatchesCPythonAt: 'inherited_by_a_metaclass'.
%

category: 'Grail-Tests - super'
method: TypePrepareDefaultTestCase
testSuperPrepareReachesTheDefault
	"The idiom this exists for: one level of super(), two, and a subclass that
	inherits the seeding metaclass -- and the seeded name reaching the class."

	self assertMatchesCPythonAt: 'super_prepare_is_reached'.
	self assertMatchesCPythonAt: 'seeded_name_reaches_the_class'.
	self assertMatchesCPythonAt: 'super_prepare_for_a_subclass'.
	self assertMatchesCPythonAt: 'super_prepare_through_two_metaclasses'.
%

category: 'Grail-Tests - Controls'
method: TypePrepareDefaultTestCase
testAMetaclassWithNoPrepareIsUnchanged
	"ABCMeta and a bare ``class N(type)'' inherit type's __prepare__ now, and
	their classes behave as before."

	self assertMatchesCPythonAt: 'abc_still_refuses_an_abstract_class'.
	self assertMatchesCPythonAt: 'bare_metaclass_class_still_works'.
%

category: 'Grail-Tests - namespace'
method: TypePrepareDefaultTestCase
testTypesOwnPrepareAllocatesNoNamespace
	"The guard.  ABCMeta and Bare have no __prepare__ of their own and override
	neither __new__ nor __init__, so no namespace -- exactly as before type had
	one to inherit.  Without ___grailIsTypesOwnPrepare___: both answer a dict."

	| abcMeta |
	abcMeta := (testModule @env1:___pyAttrLoad___: #abc) @env1:___pyAttrLoad___: #ABCMeta.
	self assert: (self ___namespaceFor___: #ScratchForAbc metaclass: abcMeta) isNil.
	self assert: (self ___namespaceFor___: #ScratchForBare
		metaclass: (testModule @env1:___pyAttrLoad___: #Bare)) isNil
%

category: 'Grail-Tests - namespace'
method: TypePrepareDefaultTestCase
testAMetaclassesOwnPrepareStillSuppliesOne
	"The control for the guard: a metaclass that DEFINES __prepare__ is still
	asked, and what it answers is the namespace -- seeded through super()."

	| ns |
	ns := self ___namespaceFor___: #ScratchForSeeding
		metaclass: (testModule @env1:___pyAttrLoad___: #Seeding).
	self deny: ns isNil.
	self
		assert: ((builtins @env1:instance) @env1:repr: ns) asString
		equals: '{''seeded'': ''by Seeding''}'
%

category: 'Grail-Tests - Controls'
method: TypePrepareDefaultTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '10 checks, 0 xfail, 0 disagreeing [], keys match: True'
%
