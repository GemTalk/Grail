! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FastapiWallsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FastapiWallsTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FastapiWallsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FastapiWallsTestCase - Python bugs running FastAPI found
! ===============================================================================
! Found running FastAPI 0.142 / starlette 1.7 / anyio 4.15 under Grail
! (docs/Support_FastAPI.md, section 7):
!
!   * signal had no Signals / Handlers enums -- signal.py is CPython's, over
!     a _signal stand-in;
!   * shlex had no shlex lexer class -- shlex.py is CPython's;
!   * concurrent.interpreters and runpy were missing;
!   * a top-level def did not rebind a name an earlier star import bound --
!     ImportFromAst >> ___storesModuleSlot___: (checked in
!     ModuleDefRebindingTestCase; the signal_signal_* checks here are its
!     consequence).
!
! tests/python/fastapi_walls.py holds the checks, run under CPython 3.14 by
! scripts/check_python_fixtures.sh; run here on the default path and forced
! onto IR.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FastapiWallsTestCase removeAllMethods.
FastapiWallsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FastapiWallsTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'faw_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'fastapi_walls' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'faw_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: FastapiWallsTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/fastapi_walls.py'
%

category: 'Grail-Private'
method: FastapiWallsTestCase
___names___
	"Listed rather than iterated so that a check DISAPPEARING fails too."

	^ #('class_body_del_dunder'
	    'class_body_readback_dunders'
	    'class_eq_assigned'
	    'class_eq_assigned_in_dict'
	    'class_eq_assigned_unchanged'
	    'class_hash_assigned'
	    'classmethod_defaults'
	    'closure_defaults_per_def'
	    'closure_kwdefaults'
	    'closure_mutable_default_shared'
	    'closure_signature'
	    'dataclass_frozen_hash'
	    'dataclass_frozen_refuses'
	    'dataclass_order_kw_only'
	    'dataclass_post_init'
	    'dataclass_repr_eq'
	    'dataclass_signature'
	    'dataclass_slots'
	    'fastapi_shape_depends'
	    'hash_none'
	    'init_signature'
	    'init_signature_value'
	    'instance_eq_assigned'
	    'interpreters_all'
	    'interpreters_error_bases'
	    'interpreters_is_shareable'
	    'isinstance_none_mapping_after'
	    'lambda_dunders_instance'
	    'method_defaults_bound'
	    'method_defaults_unbound'
	    'module_default_is_call_value'
	    'module_defaults'
	    'module_kwdefaults'
	    'module_signature_str'
	    'module_signature_values'
	    'no_defaults'
	    'object_eq_over_inherited_def'
	    'object_lt_assigned_raises'
	    'runpy_all'
	    'runtime_object_repr'
	    'shlex_join_quote'
	    'shlex_lexer_comma_separated'
	    'shlex_lexer_tokens'
	    'shlex_split'
	    'signal_getsignal_returns_enum'
	    'signal_handlers_members'
	    'signal_sig_dfl_is_handler'
	    'signal_sigint_default_handler'
	    'signal_sigint_is_int'
	    'signal_sigint_is_member'
	    'signal_signal_is_the_wrapper'
	    'signal_signal_returns_enum'
	    'signal_signals_lookup'
	    'signal_signals_name'
	    'signal_valid_signals_are_members'
	    'type_made_class_init'
	    'type_made_class_no_init_refuses_args')
%

category: 'Grail-Private'
method: FastapiWallsTestCase
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
method: FastapiWallsTestCase
___irModule___
	"Forced rather than inherited, so both codegen paths are covered."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'faw_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'faw_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'faw_ir'.
	^ irModule
%

category: 'Grail-Tests - fastapi walls'
method: FastapiWallsTestCase
testEveryCheckAgreesWithCPython
	| fixture |
	(importlib @env1:modules) removeKey: #'fastapi_walls' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'fastapi_walls'.
	self ___assertEveryCheckIn___: fixture label: 'default path'
%

category: 'Grail-Tests - fastapi walls'
method: FastapiWallsTestCase
testEveryCheckAgreesWithCPythonUnderIR
	self ___assertEveryCheckIn___: self ___irModule___ label: 'forced IR'
%

category: 'Grail-Tests - fastapi walls'
method: FastapiWallsTestCase
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
