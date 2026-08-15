! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumModuleApiTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumModuleApiTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumModuleApiTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumModuleApiTestCase
!
! What the ``enum'' module says its API is.  Three separate faults met here, all
! of them visible through the one question of what enum exports:
!
!   1. ``enum.EnumType.__module__'' raised a raw Smalltalk MessageNotUnderstood.
!      A metaclass is a Behavior, but its own metaclass chain runs to Metaclass3
!      rather than to ``object class'', so the builtin-type probe the class-side
!      __module__ read performs was not inherited -- and the error was not even
!      catchable from Python: an ``except Exception'' around it did not stop the
!      script dying.  Confirmed by reverting the fix, not by assuming.
!   2. enum's own classes reported no __module__ at all, where CPython says
!      'enum'.  The metaclass borrows this: a metaclass has no identity of its
!      own, so it defers to the class it is the metaclass of.
!   3. ``enum.__all__'' did not exist, and ``dir(enum)'' both reported the
!      Smalltalk setup method ``initialize'' as public and hid ``verify'' behind
!      Grail's varargs spelling ``_verify''.
!
! Drives tests/python/enum_module_api.py.  test_enum MiscTestCase.test__all__.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumModuleApiTestCase removeAllMethods.
EnumModuleApiTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumModuleApiTestCase
setUp
	"Reload tests/python/enum_module_api.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_module_api' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_module_api.py')
		name: 'enum_module_api'.
%

category: 'Grail-Private'
method: EnumModuleApiTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The metaclass read'
method: EnumModuleApiTestCase
testReadingAMetaclassModuleDoesNotRaise
	"It used to raise a MessageNotUnderstood that Python could not catch -- the
	script died rather than seeing an exception.  Reading __module__ off a
	metaclass is ordinary introspection: repr helpers, pickle and inspect all
	do it."

	self assert: (self resultAt: 'metaclass_module') asString equals: '''enum'''.
%

category: 'Grail-Tests - enum types belong to enum'
method: EnumModuleApiTestCase
testEnumsOwnClassesReportTheirModule
	"CPython: enum.Enum.__module__ == 'enum'.  Grail answered nothing."

	self assert: (self resultAt: 'Enum_module') asString equals: 'enum'.
	self assert: (self resultAt: 'Flag_module') asString equals: 'enum'.
	self assert: (self resultAt: 'EnumType_module') asString equals: 'enum'.
	self assert: (self resultAt: 'EnumDict_module') asString equals: 'enum'.
%

category: 'Grail-Tests - enum types belong to enum'
method: EnumModuleApiTestCase
testAUserEnumKeepsItsOwnModule
	"Only the classes enum DEFINES are relabelled.  A user's enum belongs to the
	module that declared it -- which is also what lets pickle find it."

	self assert: (self resultAt: 'user_enum_module') asString
		equals: '''enum_module_api'''.
%

category: 'Grail-Tests - __all__'
method: EnumModuleApiTestCase
testTheModuleDeclaresItsApi
	self assert: (self resultAt: 'has_all') asString equals: 'True'.
	self assert: (self resultAt: 'all_has_Enum') asString equals: 'True'.
	self assert: (self resultAt: 'all_has_verify') asString equals: 'True'.
%

category: 'Grail-Tests - __all__'
method: EnumModuleApiTestCase
testShowFlagValuesIsDefinedButNotExported
	"Exactly as upstream -- test_enum's own check names it as not_exported."

	self assert: (self resultAt: 'show_flag_values_defined') asString equals: 'True'.
	self assert: (self resultAt: 'show_flag_values_exported') asString equals: 'False'.
%

category: 'Grail-Tests - __all__'
method: EnumModuleApiTestCase
testEveryPublicNameIsDeclared
	"The property test.support.check__all__ checks: dir() and __all__ agree."

	self assert: (self resultAt: 'dir_matches_all') asString equals: 'True'.
%

category: 'Grail-Tests - dir()'
method: EnumModuleApiTestCase
testAVarargsFunctionIsReportedByItsPythonName
	"A module-level ``def verify(*args, **kwargs)'' compiles to the varargs
	selector ``_verify:kw:''.  That one prefix underscore is Grail's encoding,
	not part of the name, and reporting it verbatim made a public function look
	private to every consumer that filters leading underscores -- while
	getattr(enum, 'verify') worked perfectly all along."

	self assert: (self resultAt: 'dir_has_verify') asString equals: 'True'.
	self assert: (self resultAt: 'dir_has_underscore_verify') asString equals: 'False'.
	self assert: (self resultAt: 'verify_callable') asString equals: 'True'.
%

category: 'Grail-Tests - dir()'
method: EnumModuleApiTestCase
testTheSmalltalkSetupHookIsNotAPythonAttribute
	"``initialize'' populates the namespace at import for a module written in
	Smalltalk.  CPython's enum has no such name, and dir() offered it as public."

	self assert: (self resultAt: 'dir_has_initialize') asString equals: 'False'.
%

category: 'Grail-Tests - Known gaps'
method: EnumModuleApiTestCase
testStarImportIgnoresAllWhichIsAKnownGap
	"Recorded, NOT endorsed, and deliberately NOT claimed as fixed by declaring
	__all__.  Grail's star-import walks the module's own dict entries and
	dynamic instVars rather than __all__, so it already imported most of these
	before the declaration existed -- and still misses a name that is a METHOD
	rather than a stored entry, though it is declared.  Teaching the
	star-import to consult __all__ is a change in the import machinery.

	Only ``unique'' is named.  WHICH names are missed is session state rather
	than a property of the module -- a name becomes a stored entry the first
	time something puts it there -- so an inventory here passed alone and failed
	in the suite, where an earlier test had already used ``global_enum''."

	self assert: (self resultAt: 'star_import_brings_IntEnum') asString equals: 'True'.
	self assert: (self resultAt: 'star_import_misses_unique_a_known_gap') asString
		equals: 'True'.
	self assert: (self resultAt: 'unique_is_declared') asString equals: 'True'.
%

category: 'Grail-Tests - Module identity'
method: EnumModuleApiTestCase
testEnumPropertyReportsItsModule
	"``enum.property'' is a class of its own upstream, defined in enum, so
	CPython reports 'enum'.  It does here too now.

	This used to be recorded as a known gap on the reasoning that the same
	PropertyDescriptor backed the builtin ``property'', so claiming 'enum'
	would relabel the builtin.  That stopped applying once enum.property became
	its own class -- and the gap was never cosmetic.  __module__ is how pickle
	saves a class BY REFERENCE; without it pickle SCANS sys.modules for a module
	exposing the object under its __qualname__, and ``types'' exposes this one.
	So pickling enum.property depended on whether an earlier test had imported
	types, which is why EnumPickleByNameTestCase passed alone and failed in a
	whole-suite run."

	self assert: (self resultAt: 'enum_property_module') asString
		equals: '''enum'''.
%

category: 'Grail-Tests - Known gaps'
method: EnumModuleApiTestCase
testFlagBoundaryClassIsAbsentWhichIsAKnownGap
	"Recorded, NOT endorsed.  Grail models the FlagBoundary / EnumCheck MEMBERS
	as opaque symbols and never builds the enclosing enum, so the two classes do
	not exist -- which is why neither is declared.  Every member resolves."

	self assert: (self resultAt: 'boundary_class_present_a_known_gap') asString
		equals: 'False'.
	self assert: (self resultAt: 'boundary_members_resolve') asString equals: 'True'.
%
