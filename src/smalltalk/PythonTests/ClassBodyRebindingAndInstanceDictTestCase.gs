! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyRebindingAndInstanceDictTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyRebindingAndInstanceDictTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyRebindingAndInstanceDictTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyRebindingAndInstanceDictTestCase - pydantic BaseModel's Python walls
! ===============================================================================
! Found bringing pydantic's BaseModel up (docs/Support_Pydantic.md, Phase 5):
!
!   * a class-body @overload stub beat the implementation after it --
!     FunctionDefAst >> isOverloadStub did not recognise a BARE ``@overload''
!     (the parser's Symbol form), and ClassDefAst stored a decorated def's
!     result over a LATER rebinding (___isRebindLaterInBody___:);
!   * ``f.attr = value'' on a sibling def in a class body was dropped --
!     ClassDefAst >> ___methodAttributeAssigns___;
!   * ``obj.__dict__ = d'' stored an attribute named __dict__, and
!     ``obj.__dict__.copy()'' did not exist -- object >>
!     ___grailReplaceInstanceDict___:, PyInstanceDict >> copy.
!
! tests/python/class_body_rebinding_and_instance_dict.py holds the 15 checks,
! run under CPython 3.14 by scripts/check_python_fixtures.sh; run here on the
! default path and forced onto IR.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyRebindingAndInstanceDictTestCase removeAllMethods.
ClassBodyRebindingAndInstanceDictTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyRebindingAndInstanceDictTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'cbraid_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'class_body_rebinding_and_instance_dict' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'cbraid_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: ClassBodyRebindingAndInstanceDictTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/class_body_rebinding_and_instance_dict.py'
%

category: 'Grail-Private'
method: ClassBodyRebindingAndInstanceDictTestCase
___names___
	"Listed rather than iterated so that a check DISAPPEARING fails too."

	^ #('bare_overload_keyword_reaches_impl'
	    'bare_overload_one_arg_reaches_impl'
	    'class_body_dunder_init_attribute'
	    'class_body_function_attribute'
	    'class_body_function_attribute_via_instance'
	    'dict_assignment_reads_back'
	    'dict_assignment_replaces_old_attributes'
	    'dict_assignment_requires_a_dict'
	    'dict_assignment_sets_attributes'
	    'instance_dict_copy_is_independent'
	    'instance_dict_copy_method'
	    'instance_dict_copy_module'
	    'later_decorated_def_still_applies'
	    'later_plain_def_beats_earlier_decorated'
	    'later_plain_def_beats_earlier_plain')
%

category: 'Grail-Private'
method: ClassBodyRebindingAndInstanceDictTestCase
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
method: ClassBodyRebindingAndInstanceDictTestCase
___irModule___
	"Forced rather than inherited, so both codegen paths are covered."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'cbraid_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbraid_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'cbraid_ir'.
	^ irModule
%

category: 'Grail-Tests - class body'
method: ClassBodyRebindingAndInstanceDictTestCase
testEveryCheckAgreesWithCPython
	| fixture |
	(importlib @env1:modules) removeKey: #'class_body_rebinding_and_instance_dict' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_body_rebinding_and_instance_dict'.
	self ___assertEveryCheckIn___: fixture label: 'default path'
%

category: 'Grail-Tests - class body'
method: ClassBodyRebindingAndInstanceDictTestCase
testEveryCheckAgreesWithCPythonUnderIR
	self ___assertEveryCheckIn___: self ___irModule___ label: 'forced IR'
%

category: 'Grail-Tests - class body'
method: ClassBodyRebindingAndInstanceDictTestCase
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
