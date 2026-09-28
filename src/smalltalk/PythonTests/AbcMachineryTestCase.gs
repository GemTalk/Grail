! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AbcMachineryTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AbcMachineryTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AbcMachineryTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AbcMachineryTestCase - CPython's abc, collections.abc and GenericAlias rules
! ===============================================================================
! abc and collections.abc are CPython 3.14.6's own (abc.py's GRAIL DEVIATION
! notes record the three places they differ), and types.GenericAlias and the
! union type delegate their rules to _grail_generic_alias.  The neighbours are
! the shared-machinery defects that change exposed.
!
! tests/python/abc_machinery.py holds the checks, run under real CPython 3.14
! by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AbcMachineryTestCase removeAllMethods.
AbcMachineryTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AbcMachineryTestCase
setUp

	importlib @env1:modules removeKey: #'abc_machinery' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/abc_machinery.py')
		name: 'abc_machinery'
%

category: 'Grail-Helpers'
method: AbcMachineryTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: AbcMachineryTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: AbcMachineryTestCase
testAbstractClassesAreEnforced

	self assertAll: #('abstract_methods_are_computed'
		'an_abstract_class_refuses_instantiation'
		'a_concrete_subclass_instantiates'
		'abc_is_declared_with_abcmeta'
		'a_plain_class_is_not_checked')
%

category: 'Grail-Tests'
method: AbcMachineryTestCase
testRegistrationAndHooks

	self assertAll: #('register_makes_a_virtual_subclass'
		'a_subclasshook_decides'
		'singledispatch_follows_abc_registrations')
%

category: 'Grail-Tests'
method: AbcMachineryTestCase
testCollectionsAbcOverBuiltins

	self assertAll: #('builtins_are_their_abcs'
		'structural_checks_read_the_class_dict'
		'every_builtin_iterator_is_an_iterator'
		'a_builtin_iterator_type_cannot_be_constructed'
		'mixin_methods_work'
		'an_abc_refuses_instantiation'
		'a_dict_view_does_not_pickle'
		'builtin_class_dicts_list_their_methods')
%

category: 'Grail-Tests'
method: AbcMachineryTestCase
testGenericAliasRules

	self assertAll: #('a_generic_alias_names_itself'
		'parameters_are_found_nested'
		'substitution'
		'a_non_generic_alias_refuses_a_subscript'
		'aliases_print_as_cpython_prints_them'
		'an_alias_is_not_a_type_check_target'
		'an_alias_pickles_and_hashes')
%

category: 'Grail-Tests'
method: AbcMachineryTestCase
testUnionIsTheUnionType

	self assertAll: #('union_is_the_union_type'
		'a_union_deduplicates_and_collapses'
		'a_union_substitutes'
		'a_union_pickles'
		'the_union_type_is_not_constructible')
%

category: 'Grail-Tests'
method: AbcMachineryTestCase
testClassMachineryNeighbours

	self assertAll: #('a_metaclass_class_lists_its_subclasses'
		'a_slot_bearing_base_keeps_its_slots'
		'a_generator_lambda')
%

category: 'Grail-Tests'
method: AbcMachineryTestCase
testAWarmBindRestoresEveryDeployedMetaclass
	"A deployed class's ``metaclass='' record is session-local, so a warm bind
	has to put it back -- and for EVERY deployed class, not only those of the
	module being bound (importlib >> ___restoreAllCanonicalMetaclasses___).
	collections.abc is reached through _collections_abc's committed globals
	without ever being bound, and a stale pathlib rebuilt against it found no
	metaclass on Sequence's chain: _PathParents skipped ABCMeta.__new__ and
	``Path('/a/b').parents'' refused to instantiate.

	Drops one deployed record from this session and asks for the restore.
	Nothing to test on an extent with no deployed metaclass record; a suite run
	always has them (deployFrameworks commits collections.abc)."

	| reg classes tbl picked saved |
	reg := UserGlobals at: #'GrailCanonicalMetaclasses' otherwise: nil.
	classes := UserGlobals at: #'GrailCanonicalClasses' otherwise: nil.
	(reg isNil or: [classes isNil]) ifTrue: [^ self].
	reg keysAndValuesDo: [:modName :inner |
		inner keysAndValuesDo: [:aClassName :meta | | cls |
			cls := classes
				at: (modName asString , '.' , aClassName asString)
				otherwise: nil.
			(picked isNil and: [(cls isKindOf: Behavior) and: [meta isKindOf: Behavior]])
				ifTrue: [picked := cls -> meta]]].
	picked isNil ifTrue: [^ self].
	tbl := SessionTemps current
		at: #'GrailClassMetaclass'
		ifAbsentPut: [IdentityKeyValueDictionary new].
	saved := tbl at: picked key otherwise: nil.
	[tbl removeKey: picked key ifAbsent: [].
	importlib ___restoreAllCanonicalMetaclasses___.
	self assert: (tbl at: picked key otherwise: nil) == picked value]
		ensure: [
			saved isNil
				ifTrue: [tbl removeKey: picked key ifAbsent: []]
				ifFalse: [tbl at: picked key put: saved]]
%

category: 'Grail-Tests'
method: AbcMachineryTestCase
testABindCreditsSubclassLinksToTheBoundModule
	"A warm bind re-derives the bound module's subclass links, and must credit
	them to THAT module, not to the importer whose body is running
	(importlib >> ___registerSubclass___:of:origin:).  Credited to the
	importer, its next re-run took them back: DunderNewTestCase's fixture,
	re-imported, left Sequence.__subclasses__() as its own MySeq alone, and
	isinstance([], Sequence) went False once the ABC caches were cold.

	Stages the bind inside a stand-in importer's body, then supersedes that
	body the way a re-import does."

	| cabc seq mut |
	cabc := testModule @env1:___pyAttrLoad___: #cabc.
	seq := cabc @env1:___pyAttrLoad___: #Sequence.
	mut := cabc @env1:___pyAttrLoad___: #MutableSequence.
	importlib ___pushInitializingModule___: 'grail_abc_machinery_importer'.
	[importlib ___restoreCanonicalClassStructure___: 'collections.abc']
		ensure: [importlib ___popInitializingModule___].
	importlib ___forgetSubclassesFromModule___: 'grail_abc_machinery_importer'.
	self assert: ((importlib ___subclassRegistry___ at: seq otherwise: #())
		includesIdentical: mut)
%
