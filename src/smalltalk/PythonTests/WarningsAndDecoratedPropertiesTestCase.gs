! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for WarningsAndDecoratedPropertiesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'WarningsAndDecoratedPropertiesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
WarningsAndDecoratedPropertiesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! WarningsAndDecoratedPropertiesTestCase - what test.test_warnings found missing
! ===============================================================================
!   * exec import   -- a bare exec() in a function imports through the
!                      __builtins__ override with fromlist=None, which
!                      importlib >> ___import__:kw: refused.
!   * exec frames   -- a live frame of exec'd code reported '<grail>'
!                      (BaseException class >> ___liveFrameFilenameFor___:).
!   * get_source    -- warn_explicit(module_globals=...) now asks the loader
!                      (warnings >> ___sourceLineFrom___:globals:lineno:).
!   * surrogates    -- a lone-surrogate filename made warn_explicit raise.
!   * __all__       -- warnings declared none.
!   * identity      -- ``A.__init__ is object.__init__'' / ``A.__new__ is
!                      object.__new__'' (UnboundMethod class >>
!                      ___forClassRead___:selector:, BoundMethod class >>
!                      ___forAttrRead___:selector:), which @deprecated reads.
!   * properties    -- @property over another decorator ran the undecorated
!                      body; it is a property object over the decorated
!                      accessors now (ClassDefAst >> ___decoratedPropertyNames___).
!   * fresh import  -- import_fresh_module('warnings', fresh=[...]) answers a
!                      new module object (grail >> _fresh_native_module:).
!
! tests/python/warnings_and_decorated_properties.py holds the 11 checks, run
! under real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
WarningsAndDecoratedPropertiesTestCase removeAllMethods.
WarningsAndDecoratedPropertiesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: WarningsAndDecoratedPropertiesTestCase
setUp

	importlib @env1:modules removeKey: #'warnings_and_decorated_properties' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warnings_and_decorated_properties.py')
		name: 'warnings_and_decorated_properties'
%

category: 'Grail-Helpers'
method: WarningsAndDecoratedPropertiesTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: WarningsAndDecoratedPropertiesTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - exec'
method: WarningsAndDecoratedPropertiesTestCase
testExecInAFunctionImportsAndNamesItsFrames

	self assertAll: #('a_bare_exec_in_a_function_can_import'
		'exec_d_code_reports_compile_s_filename')
%

category: 'Grail-Tests - warnings'
method: WarningsAndDecoratedPropertiesTestCase
testWarnExplicitAsksTheLoader

	self assertAll: #('warn_explicit_asks_the_loader_for_the_source'
		'the_source_is_split_by_str_s_own_splitlines')
%

category: 'Grail-Tests - warnings'
method: WarningsAndDecoratedPropertiesTestCase
testSurrogateFilenameAndPublicApi

	self assertAll: #('a_lone_surrogate_filename_is_recorded'
		'warnings_declares_its_public_api')
%

category: 'Grail-Tests - identity'
method: WarningsAndDecoratedPropertiesTestCase
testMethodsInheritedFromObjectAreObjects

	self assertAll: #('a_method_inherited_from_object_is_object_s'
		'a_deprecated_class_without_init_rejects_arguments')
%

category: 'Grail-Tests - properties'
method: WarningsAndDecoratedPropertiesTestCase
testDecoratedPropertyAccessorsRun

	self assertAll: #('a_property_over_a_decorator_runs_the_decorated_accessors'
		'a_deprecated_property_getter_warns')
%

category: 'Grail-Tests - warnings'
method: WarningsAndDecoratedPropertiesTestCase
testAFreshWarningsIsANewModule

	self assertAll: #('a_fresh_warnings_is_a_new_working_module')
%

category: 'Grail-Tests - warnings'
method: WarningsAndDecoratedPropertiesTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 11 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 11
%
