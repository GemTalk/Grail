! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassIdentityAndRelativeImportTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassIdentityAndRelativeImportTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassIdentityAndRelativeImportTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassIdentityAndRelativeImportTestCase - three bugs on pydantic's import path
! ===============================================================================
! Each stopped ``from pydantic import BaseModel`` (docs/Support_Pydantic.md,
! Phase 4):
!
!   * a class whose __eq__ was ASSIGNED (every dataclass) compared equal to
!     other classes -- object >> ___dynamicInstanceDunder___: and the
!     class-operand guard in ___reflectedFirst___:selector:kwSelector:;
!   * a metaclass got bases == (object,) for ``class A(metaclass=M)'' instead
!     of () -- object >> ___grailHeaderBases___;
!   * importlib.import_module ignored ``package'' for a relative name --
!     src/python/stdlib/importlib/__init__.py.
!
! tests/python/class_identity_and_relative_import.py holds the 13 checks, run
! under CPython 3.14 by scripts/check_python_fixtures.sh; run here on the
! default path and forced onto IR.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassIdentityAndRelativeImportTestCase removeAllMethods.
ClassIdentityAndRelativeImportTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassIdentityAndRelativeImportTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'ciari_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'class_identity_and_relative_import' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ciari_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: ClassIdentityAndRelativeImportTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/class_identity_and_relative_import.py'
%

category: 'Grail-Private'
method: ClassIdentityAndRelativeImportTestCase
___names___
	"Listed rather than iterated so that a check DISAPPEARING fails too."

	^ #('assigned_eq_class_vs_int'
	    'assigned_eq_still_governs_instances'
	    'bases_attribute_still_object'
	    'class_hash_is_identity_hash'
	    'dataclass_generic_eq_generic'
	    'dataclass_generic_ne'
	    'dataclass_generic_not_in_generic_protocol'
	    'dataclass_generic_subscripts'
	    'dataclass_instances_still_compare'
	    'metaclass_sees_empty_bases'
	    'metaclass_sees_written_base'
	    'relative_import_module'
	    'slots_dataclass_generic_eq_generic')
%

category: 'Grail-Private'
method: ClassIdentityAndRelativeImportTestCase
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
method: ClassIdentityAndRelativeImportTestCase
___irModule___
	"Forced rather than inherited, so both codegen paths are covered."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'ciari_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ciari_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'ciari_ir'.
	^ irModule
%

category: 'Grail-Tests - class body'
method: ClassIdentityAndRelativeImportTestCase
testEveryCheckAgreesWithCPython
	| fixture |
	(importlib @env1:modules) removeKey: #'class_identity_and_relative_import' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_identity_and_relative_import'.
	self ___assertEveryCheckIn___: fixture label: 'default path'
%

category: 'Grail-Tests - class body'
method: ClassIdentityAndRelativeImportTestCase
testEveryCheckAgreesWithCPythonUnderIR
	self ___assertEveryCheckIn___: self ___irModule___ label: 'forced IR'
%

category: 'Grail-Tests - class body'
method: ClassIdentityAndRelativeImportTestCase
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
