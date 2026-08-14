! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumDefinitionErrorsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumDefinitionErrorsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumDefinitionErrorsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumDefinitionErrorsTestCase
!
! Two definition-time errors CPython raises that Grail accepted silently.
!
! (1) ``def _generate_next_value_'' placed AFTER the members that need it
! (test_auto_order).  CPython resolves each auto() AS THE CLASS BODY EXECUTES,
! so a generator defined below the members arrived too late and _EnumDict
! raises rather than let the values disagree with the source.  Grail resolves
! in one later pass, so it applied the generator to every member: the class read
! as working code that quietly disagreed with CPython on all three values.
!
! Only a member that ACTUALLY needed generating counts, which is what keeps
! test_auto_order_wierd legal -- an auto() built outside the body with its value
! already set never calls the generator.  The marker carries the distinction:
! a preset auto() answers ``value'', a fresh one raises.  ___classBodyOrder___
! supplies the positions.
!
! (2) a user __new__ that never sets _value_ AND whose member_type cannot be
! built from the member's args (test_missing_value_error).  The member is left
! with no value at all; CPython reports ``_value_ not set in __new__''.  The
! member_type(*args) fallback added with _find_new_ was best-effort and kept the
! raw class-body tuple, papering over a broken definition.  Only the __new__
! path is strict -- ___grailCoerceMemberValue: stays best-effort, since there
! the member already has a usable value and construction is only refining it.
!
! Drives tests/python/enum_definition_errors.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumDefinitionErrorsTestCase removeAllMethods.
EnumDefinitionErrorsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumDefinitionErrorsTestCase
setUp
	"Reload tests/python/enum_definition_errors.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_definition_errors' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_definition_errors.py')
		name: 'enum_definition_errors'.
%

category: 'Grail-Private'
method: EnumDefinitionErrorsTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - _generate_next_value_ ordering'
method: EnumDefinitionErrorsTestCase
testGeneratorAfterMembersIsAnError
	"CPython _EnumDict.__setitem__ (test_auto_order)."

	self assert: (self resultAt: 'gnv_after') asString
		equals: 'TypeError: _generate_next_value_ must be defined before members'.
%

category: 'Grail-Tests - _generate_next_value_ ordering'
method: EnumDefinitionErrorsTestCase
testGeneratorBeforeMembersIsFine
	"The ordinary, legal spelling -- and the values still come from it."

	self assert: (self resultAt: 'gnv_first') asString
		equals: 'red=red,green=green'.
%

category: 'Grail-Tests - _generate_next_value_ ordering'
method: EnumDefinitionErrorsTestCase
testPresetAutoDoesNotConstrainTheGenerator
	"test_auto_order_wierd: an auto() whose value was set OUTSIDE the body never
	calls the generator, so it does not pin where the generator may appear.
	Guard rail -- the naive ``any auto() before the def'' rule breaks this."

	self assert: (self resultAt: 'gnv_preset') asString
		equals: 'red=pathological case,blue=blue'.
%

category: 'Grail-Tests - _generate_next_value_ ordering'
method: EnumDefinitionErrorsTestCase
testPlainAutoNumberingUnaffected
	"No generator at all."

	self assert: (self resultAt: 'no_gnv') asString equals: 'a=1,b=2'.
%

category: 'Grail-Tests - _value_ not set in __new__'
method: EnumDefinitionErrorsTestCase
testNewThatLeavesValueUnsetIsAnError
	"test_missing_value_error: __new__ sets the str content and its own slots
	but never _value_, and str cannot be built from ('An$(1,2)', 0)."

	self assert: (self resultAt: 'no_value') asString
		equals: 'TypeError: _value_ not set in __new__, unable to create it'.
%

category: 'Grail-Tests - _value_ not set in __new__'
method: EnumDefinitionErrorsTestCase
testNewThatSetsValueIsFine
	self assert: (self resultAt: 'value_set') asString equals: 'ay/1/Fine.a'.
%

category: 'Grail-Tests - _value_ not set in __new__'
method: EnumDefinitionErrorsTestCase
testConstructibleMixinValueStillBuilds
	"Guard rail: making the __new__ path strict must not turn a member_type
	that CAN take the args into an error."

	self assert: (self resultAt: 'constructible') asString
		equals: 'june=''1'',july=''2'''.
%

category: 'Grail-Tests - _value_ not set in __new__'
method: EnumDefinitionErrorsTestCase
testEncodedStrArgsNowBuild
	"""Was a recorded gap, and it did its job: the assertion was written so that
	the day the (bytes, encoding) form was supported this test would FAIL and be
	updated, rather than the gap going unnoticed.  That day is this one.

	CPython builds ``three = b'3', 'ascii''' as str(b'3', 'ascii') == '3'.
	Grail's str handle is a one-argument BoundMethod, so the coercion could not
	make the call at all, and the path being best-effort meant the raw tuple
	survived as the member's value.  StrDecodeArgsTestCase pins the whole shape,
	including the argument validation and the tuple that is NOT a decode."""

	self assert: (self resultAt: 'encoded_gap') asString equals: '''3'''.
%
