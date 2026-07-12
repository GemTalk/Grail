! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumAutoImportTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumAutoImportTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumAutoImportTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumAutoImportTestCase
!
! Regression: ``from enum import auto'' must bind auto to a callable
! BoundMethod, NOT to the result of invoking auto at import time.
! Pre-fix, the unary-method auto-invoke path turned auto into a
! SmallInteger; subsequent ``auto()'' calls failed with
! ``SmallInteger does not understand value:value:''.
!
! Fix: pre-store auto as a BoundMethod on the enum module so the
! ___pyAttrLoad___ dynamicInstVar probe returns the callable
! directly.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumAutoImportTestCase removeAllMethods.
EnumAutoImportTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumAutoImportTestCase
setUp
	"Load tests/python/enum_auto_import.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'enum_auto_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_auto_import.py')
		name: 'enum_auto_import'.
%

category: 'Grail-Tests'
method: EnumAutoImportTestCase
testAutoCallableAfterImport
	"auto() is callable after ``from enum import auto'' and returns a
	fresh marker each call.  Markers resolve to per-CLASS sequential
	values at member-build time (CPython semantics; the old behavior
	returned process-global integers directly, giving arbitrary values
	inside class bodies -- see DunderNewTestCase>>testEnumInternals for
	the value-resolution pins)."

	| result a b c |
	result := testModule @env1:imported_auto_is_callable.
	a := result @env0:at: 1.
	b := result @env0:at: 2.
	c := result @env0:at: 3.
	self assert: (a @env0:isKindOf: GrailEnumAuto).
	self assert: (b @env0:isKindOf: GrailEnumAuto).
	self assert: (c @env0:isKindOf: GrailEnumAuto).
	"Each call returns a distinct marker object."
	self deny: a == b.
	self deny: b == c.
	self deny: a == c
%
