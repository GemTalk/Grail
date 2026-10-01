! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyNestedDefBindingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyNestedDefBindingTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyNestedDefBindingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyNestedDefBindingTestCase - a def in a class-body compound statement
! ===============================================================================
! A def at the top of a class body compiles to a Smalltalk METHOD.  A def inside
! an ``if'' / ``for'' / ``try'' / ``with'' compiles to a BLOCK stored as a class
! attribute (ClassDefAst >> emitClassBodyIfDef:on:, FunctionDefAst >>
! printSmalltalkClassBodyRuntimeDefOn:), and in that form:
!
!   * zero-arg ``super()'' bound Smalltalk ``self'' -- the MODULE instance
!     running the class body -- instead of the def's first parameter
!     (CallAst >> ___superObjTempName___);
!   * ``__class__'' raised NameError, read as class-body code because
!     inClassBodyValueEmit is still on (NameAst's two __class__ branches);
!   * __init_subclass__ / __class_getitem__ / __new__ got no implicit
!     classmethod / staticmethod (FunctionDefAst >> ___classBodyValueWrapper___);
!   * a keyword bound to a named parameter also stayed in ``**kw'' -- true of
!     EVERY nested def, the closure form's kwarg binding dropped only
!     keyword-only names.
!
! Found through annotated_types, a pydantic dependency, whose Protocol defines
! __init_subclass__ under ``if not TYPE_CHECKING:'' -- docs/Support_Pydantic.md
! wall W4.
!
! tests/python/class_body_nested_def_binding.py holds the 18 checks, run under
! CPython 3.14 by scripts/check_python_fixtures.sh.  Run twice here: once on
! whichever path is the default, and once FORCED onto IR with a fallback guard,
! because both emitters had the super() and __class__ defects.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyNestedDefBindingTestCase removeAllMethods.
ClassBodyNestedDefBindingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyNestedDefBindingTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'cbndb_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'class_body_nested_def_binding' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'cbndb_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: ClassBodyNestedDefBindingTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/class_body_nested_def_binding.py'
%

category: 'Grail-Private'
method: ClassBodyNestedDefBindingTestCase
___names___
	"Listed rather than iterated so that a check DISAPPEARING fails too."

	^ #('a_protocol_init_subclass_under_type_checking_guard'
	    'class_body_if_def_kwargs_drop_named_parameters'
	    'class_getitem_in_if_is_a_classmethod'
	    'dunder_class_direct_control'
	    'dunder_class_in_for'
	    'dunder_class_in_if'
	    'explicit_decorators_in_for_control'
	    'explicit_super_inside_a_nested_def_still_works'
	    'init_subclass_in_if_runs_with_the_subclass_and_consumes_its_keyword'
	    'nested_def_kwargs_drop_named_parameters'
	    'new_in_if_is_a_staticmethod'
	    'super_direct_control'
	    'super_in_for_binds_the_instance'
	    'super_in_if_binds_the_instance'
	    'super_in_if_from_a_subclass_instance'
	    'super_in_try_binds_the_instance'
	    'super_in_with_binds_the_instance'
	    'the_namespace_holds_the_descriptors')
%

category: 'Grail-Private'
method: ClassBodyNestedDefBindingTestCase
___assertEveryCheckIn___: aModule label: aString
	| results bad |
	results := aModule @env1:___pyAttrLoad___: #RESULTS.
	bad := OrderedCollection new.
	self ___names___ do: [:name |
		| v |
		v := results @env1:__getitem__: name.
		v = true ifFalse: [bad add: name , ' -> ' , v printString]].
	self assert: bad isEmpty
		description: aString , ': ' , bad asArray printString.
	self assert: (results @env1:__len__) equals: self ___names___ size
%

category: 'Grail-Private'
method: ClassBodyNestedDefBindingTestCase
___irModule___
	"Forced rather than inherited: both emitters carried the super() and
	__class__ defects, so a flag-off run would exercise only one of them."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'cbndb_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbndb_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'cbndb_ir'.
	^ irModule
%

category: 'Grail-Tests - class body'
method: ClassBodyNestedDefBindingTestCase
testEveryNestedDefCheckAgreesWithCPython
	| fixture |
	(importlib @env1:modules) removeKey: #'class_body_nested_def_binding' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_body_nested_def_binding'.
	self ___assertEveryCheckIn___: fixture label: 'default path'
%

category: 'Grail-Tests - class body'
method: ClassBodyNestedDefBindingTestCase
testEveryNestedDefCheckAgreesWithCPythonUnderIR
	self ___assertEveryCheckIn___: self ___irModule___ label: 'forced IR'
%

category: 'Grail-Tests - class body'
method: ClassBodyNestedDefBindingTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: correct answers under IR prove nothing if every def
	fell back to text."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #compiled) > 0
		description: 'IR compiled nothing: ' , stats printString
%
