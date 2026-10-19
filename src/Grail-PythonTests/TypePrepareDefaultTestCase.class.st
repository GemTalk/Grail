Class {
	#name : 'TypePrepareDefaultTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TypePrepareDefaultTestCase >> ___namespaceFor___: scratchName metaclass: aMetaclass [
	"What the class-statement machinery prepares for the fixture's scratch class
	when aMetaclass is its metaclass -- nil for no namespace.  Removed from the
	pending table afterwards, so a namespace it did allocate outlives nothing."

	| scratch ns tbl |
	scratch := testModule @env1:___pyAttrLoad___: scratchName.
	ns := scratch @env1:___grailPrepareNamespace___: aMetaclass bases: #() keywords: nil.
	tbl := SessionTemps current at: #'GrailPendingClassNamespace' otherwise: nil.
	tbl == nil ifFalse: [tbl removeKey: scratch ifAbsent: [nil]].
	^ ns

]

{ #category : 'Grail-Private' }
TypePrepareDefaultTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
TypePrepareDefaultTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'type_prepare_default' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_prepare_default.py')
		name: 'type_prepare_default'.

]

{ #category : 'Grail-Tests - namespace' }
TypePrepareDefaultTestCase >> testAMetaclassesOwnPrepareStillSuppliesOne [
	"The control for the guard: a metaclass that DEFINES __prepare__ is still
	asked, and what it answers is the namespace -- seeded through super().
	The body's implicit __module__ and __qualname__ follow the metaclass's own
	entry, as they do in CPython, where the body writes them first."

	| ns |
	ns := self ___namespaceFor___: #ScratchForSeeding
		metaclass: (testModule @env1:___pyAttrLoad___: #Seeding).
	self deny: ns isNil.
	self
		assert: ((builtins @env1:instance) @env1:repr: ns) asString
		equals: '{''seeded'': ''by Seeding'', ''__module__'': ''type_prepare_default'', ''__qualname__'': ''ScratchForSeeding''}'

]

{ #category : 'Grail-Tests - Controls' }
TypePrepareDefaultTestCase >> testAMetaclassWithNoPrepareIsUnchanged [
	"ABCMeta and a bare ``class N(type)'' inherit type's __prepare__ now, and
	their classes behave as before."

	self assertMatchesCPythonAt: 'abc_still_refuses_an_abstract_class'.
	self assertMatchesCPythonAt: 'bare_metaclass_class_still_works'.

]

{ #category : 'Grail-Tests - Controls' }
TypePrepareDefaultTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '10 checks, 0 xfail, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - super' }
TypePrepareDefaultTestCase >> testSuperPrepareReachesTheDefault [
	"The idiom this exists for: one level of super(), two, and a subclass that
	inherits the seeding metaclass -- and the seeded name reaching the class."

	self assertMatchesCPythonAt: 'super_prepare_is_reached'.
	self assertMatchesCPythonAt: 'seeded_name_reaches_the_class'.
	self assertMatchesCPythonAt: 'super_prepare_for_a_subclass'.
	self assertMatchesCPythonAt: 'super_prepare_through_two_metaclasses'.

]

{ #category : 'Grail-Tests - type.__prepare__' }
TypePrepareDefaultTestCase >> testTypePrepareAnswersAFreshEmptyDict [
	"Whatever it is handed, and through any metaclass."

	self assertMatchesCPythonAt: 'returns_an_empty_dict'.
	self assertMatchesCPythonAt: 'ignores_its_arguments'.
	self assertMatchesCPythonAt: 'fresh_dict_each_call'.
	self assertMatchesCPythonAt: 'inherited_by_a_metaclass'.

]

{ #category : 'Grail-Tests - namespace' }
TypePrepareDefaultTestCase >> testTypesOwnPrepareAllocatesNoNamespace [
	"The guard.  Bare has no __prepare__ of its own and overrides neither
	__new__ nor __init__, so no namespace -- exactly as before type had one to
	inherit.  Without ___grailIsTypesOwnPrepare___: it answers a dict.

	ABCMeta used to be the second subject, on the same grounds.  It is
	CPython's own now and DEFINES __new__, so it gets the namespace every
	constructing metaclass gets -- which is asserted, so the change of subject
	is visible rather than silent."

	| abcMeta |
	self assert: (self ___namespaceFor___: #ScratchForBare
		metaclass: (testModule @env1:___pyAttrLoad___: #Bare)) isNil.
	abcMeta := (testModule @env1:___pyAttrLoad___: #abc) @env1:___pyAttrLoad___: #ABCMeta.
	self deny: (self ___namespaceFor___: #ScratchForAbc metaclass: abcMeta) isNil

]
