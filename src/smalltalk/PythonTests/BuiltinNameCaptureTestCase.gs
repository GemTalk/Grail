! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BuiltinNameCaptureTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinNameCaptureTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BuiltinNameCaptureTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BuiltinNameCaptureTestCase
! Drives tests/python/builtin_name_capture.py, whose EXPECTED table was measured
! by RUNNING CPython 3.14.6: Python names that are also names Grail's generated
! code relies on (``tuple'', ``set'', ``slice'', ``object'', ``importlib'',
! ``format'', ``str'', ``repr''), a rebound ``self'' beside ``_self'', star
! targets binding a list, f-string conversion and spec semantics, and eval()'s
! lookup order through a live locals mapping.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BuiltinNameCaptureTestCase removeAllMethods.
BuiltinNameCaptureTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BuiltinNameCaptureTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'builtin_name_capture' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_name_capture.py')
		name: 'builtin_name_capture'.
%

category: 'Grail-Private'
method: BuiltinNameCaptureTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - codegen names'
method: BuiltinNameCaptureTestCase
testLocalsNamedLikeRuntimeClasses
	"A parameter or local called tuple / set / slice / object / list /
	complex / importlib no longer captures the class the generated code
	sends to -- each of these died uncatchably (``a SmallInteger does not
	understand #withAll:'') before the codegen named its ___x___ aliases."

	self assertMatchesCPythonAt: 'tuple_param'.
	self assertMatchesCPythonAt: 'varargs_beside_tuple'.
	self assertMatchesCPythonAt: 'lambda_varargs_beside_tuple'.
	self assertMatchesCPythonAt: 'set_param'.
	self assertMatchesCPythonAt: 'slice_param'.
	self assertMatchesCPythonAt: 'object_param'.
	self assertMatchesCPythonAt: 'list_param'.
	self assertMatchesCPythonAt: 'complex_param'.
	self assertMatchesCPythonAt: 'importlib_local'.
	self assertMatchesCPythonAt: 'dataclass_beside_tuple'.
	self assertMatchesCPythonAt: 'eval_tuple_global'.
	self assertMatchesCPythonAt: 'eval_set_global'.
%

category: 'Grail-Tests - f-strings'
method: BuiltinNameCaptureTestCase
testFStringFieldsLookNothingUp
	"A field is ___fformat___(value, conversion, spec): a local or module
	global called format / str / repr / ascii cannot capture it."

	self assertMatchesCPythonAt: 'fstring_params_named_like_builtins'.
	self assertMatchesCPythonAt: 'fstring_module_global_format'.
%

category: 'Grail-Tests - f-strings'
method: BuiltinNameCaptureTestCase
testFStringConversionAndSpecSemantics
	"``f'{x}''' is format(x, ''), not str(x); a conversion survives a spec."

	self assertMatchesCPythonAt: 'fstring_no_spec_uses_format'.
	self assertMatchesCPythonAt: 'fstring_conversions'.
	self assertMatchesCPythonAt: 'fstring_conversion_with_spec'.
	self assertMatchesCPythonAt: 'fstring_nested_spec'.
	self assertMatchesCPythonAt: 'fstring_plain_values'.
%

category: 'Grail-Tests - rebound self'
method: BuiltinNameCaptureTestCase
testReboundSelfAndReservedParameters
	"A rebound pseudo-variable travels as ___self___, which no Python name can
	collide with (``_self'' did); a plain def may rebind a reserved-named
	parameter, and ``for self in'' stores to the rebound temp."

	self assertMatchesCPythonAt: 'rebind_self_beside__self'.
	self assertMatchesCPythonAt: 'rebind_self_from__self_param'.
	self assertMatchesCPythonAt: 'for_loop_rebinds_self'.
	self assertMatchesCPythonAt: 'plain_def_rebinds_self'.
	self assertMatchesCPythonAt: 'plain_def_self_and__self'.
	self assertMatchesCPythonAt: 'plain_def_rebinds_nil'.
%

category: 'Grail-Tests - star unpacking'
method: BuiltinNameCaptureTestCase
testStarTargetsBindListsAndStrsIterate
	"A star target is a list whatever was unpacked; ``*'ab''' yields strs."

	self assertMatchesCPythonAt: 'star_targets_bind_lists'.
	self assertMatchesCPythonAt: 'star_over_str'.
	self assertMatchesCPythonAt: 'star_over_bytes'.
	self assertMatchesCPythonAt: 'star_too_few'.
%

category: 'Grail-Tests - eval name lookup'
method: BuiltinNameCaptureTestCase
testEvalSeesNoImplementationNames
	"Grail's implementation and module classes are not names eval'd code can
	see: ``eval('module', {})'' raises NameError as it does in CPython."

	self assertMatchesCPythonAt: 'eval_implementation_names'.
	self assertMatchesCPythonAt: 'exec_module_name'.
	self assertMatchesCPythonAt: 'not_callable_names_python_type'.
%

category: 'Grail-Tests - eval name lookup'
method: BuiltinNameCaptureTestCase
testEvalLiveLocalsMappingIsAskedFirst
	"LOAD_NAME order through a live mapping: locals, then globals, then
	builtins -- at the top level only; a lambda or generator reads globals."

	self assertMatchesCPythonAt: 'eval_locals_mapping_before_builtins'.
	self assertMatchesCPythonAt: 'eval_locals_mapping_call'.
	self assertMatchesCPythonAt: 'eval_locals_mapping_before_globals'.
	self assertMatchesCPythonAt: 'eval_locals_mapping_missing'.
	self assertMatchesCPythonAt: 'eval_globals_mapping'.
	self assertMatchesCPythonAt: 'eval_lambda_reads_globals'.
	self assertMatchesCPythonAt: 'eval_genexp_reads_globals'.
	self assertMatchesCPythonAt: 'eval_inlined_comprehension'.
	self assertMatchesCPythonAt: 'eval_walrus'.
	self assertMatchesCPythonAt: 'eval_plain_mappings'.
	self assertMatchesCPythonAt: 'exec_locals_mapping'.
%

category: 'Grail-Tests - iteration'
method: BuiltinNameCaptureTestCase
testSequenceSubclassIterIsHonoured
	"A list / tuple / dict subclass with its own __iter__ is iterated through
	it by star displays, star calls, set(), set.update, frozenset(),
	list.extend and dict.fromkeys -- which all read the kernel storage -- while
	a subclass that does not override __iter__ keeps the storage fast path."

	self assertMatchesCPythonAt: 'iter_override_star_displays'.
	self assertMatchesCPythonAt: 'iter_override_star_call'.
	self assertMatchesCPythonAt: 'iter_override_consumers'.
	self assertMatchesCPythonAt: 'plain_subclass_iterates_storage'.
%

category: 'Grail-Tests - rebound self'
method: BuiltinNameCaptureTestCase
testPseudoVariableParametersOnEveryDefShape
	"``nil'' / ``true'' / ``false'' as parameters of a method (fixed-arity,
	defaulted, varargs, keyword-only), a static or class method, a plain def
	and a nested def or lambda: declared as the transport identifier, bound by
	keyword under the Python name."

	self assertMatchesCPythonAt: 'method_reserved_params'.
	self assertMatchesCPythonAt: 'method_reserved_varargs'.
	self assertMatchesCPythonAt: 'static_and_class_reserved_params'.
	self assertMatchesCPythonAt: 'plain_reserved_varargs_and_kwonly'.
	self assertMatchesCPythonAt: 'nested_and_lambda_reserved_params'.
%

category: 'Grail-Tests - eval name lookup'
method: BuiltinNameCaptureTestCase
testEvalGenexpFirstIterableReadsEnclosingScope
	"A generator expression's first iterable is evaluated where the genexp is
	written, so it reads the live mapping; the rest of the genexp does not."

	self assertMatchesCPythonAt: 'eval_genexp_first_iterable'.
%

category: 'Grail-Tests - Controls'
method: BuiltinNameCaptureTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '53 checks, 0 disagreeing [], keys match: True'
%
