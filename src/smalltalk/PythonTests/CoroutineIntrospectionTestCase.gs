! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CoroutineIntrospectionTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CoroutineIntrospectionTestCase comment:
'The identity a generator / coroutine / async generator carries.

CPython stamps the object a def''s call answers with the def''s name and
qualified name (__name__ / __qualname__, both reassignable), and its code
object.  Grail''s call sites now do the same: the codegen closes the
``withBlock: [:___gen___ | ...'' wrapper with ``name: ... qualname: ...
code: [...]'' (FunctionDefAst >> ___emitLazyWrapperTailOn___:nested:), where
the code expression sits in a clean niladic block, built only if gi_code /
cr_code / ag_code is ever read.

Around the identity sit the pieces CPython''s tests actually consult:
gi_frame and its None-flip at completion (a lightweight PyFrame while the
body is unfinished -- test_cr_frame_after_close pins the flip, inspect''s
state readers pin the None-ness), the 3.12+ gi_suspended flag, the repr
built from the QUALIFIED name (reassigning __name__ alone leaves it,
measured on CPython 3.14), the type names -- generator / coroutine /
async_generator, via the ___pythonBuiltinTypeName___ remap that also moved
coroutine_objects.py''s known-gap pin into EXPECTED -- and inspect''s
getgeneratorstate / getcoroutinestate / getasyncgenstate.

The runtime MESSAGES move with the identity, worded per kind as CPython
words them: ''coroutine raised StopIteration'', ''can''''t send non-None
value to a just-started async generator'' (prose says ''async generator''
with a space; the TYPE name has the underscore).

The quiet bug fixed alongside: cr_running and cr_await were env-1 accessors
NOT listed in ___pythonValueAttrs___, so reading them answered an
always-truthy BoundMethod -- every coroutine claimed to be running.

See tests/python/coroutine_introspection.py (33 checks, CPython-validated
first).'
%

expectvalue /Class
doit
CoroutineIntrospectionTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
CoroutineIntrospectionTestCase removeAllMethods: 0.
CoroutineIntrospectionTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: CoroutineIntrospectionTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'coroutine_introspection' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/coroutine_introspection.py')
		name: 'coroutine_introspection'.
%

category: 'Grail-Helpers'
method: CoroutineIntrospectionTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: CoroutineIntrospectionTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - identity'
method: CoroutineIntrospectionTestCase
testNamesAreStampedAndMovable
	"The def's name and qualified name arrive on the object, and both
	reassign -- they are dynamic instVars, so the ordinary attribute path
	reads and writes them with no accessor at all."

	self assertAll: #('gen_name_is_the_defs' 'coro_name_is_the_defs'
		'agen_name_is_the_defs' 'nested_qualname_has_locals'
		'name_and_qualname_reassign')
%

category: 'Grail-Tests - identity'
method: CoroutineIntrospectionTestCase
testReprsUseTheQualifiedName
	"``<generator object top_gen at 0x...>'' and its two siblings -- and the
	name in it tracks __qualname__, not __name__, as measured on CPython."

	self assertAll: #('gen_repr_shape' 'coro_repr_shape' 'agen_repr_shape'
		'repr_tracks_qualname_not_name')
%

category: 'Grail-Tests - identity'
method: CoroutineIntrospectionTestCase
testTypeNamesAreCPythons
	"generator / coroutine / async_generator, via the same
	___pythonBuiltinTypeName___ remap that renamed ExecBlock to 'function'."

	self assertAll: #('gen_type_name' 'coro_type_name' 'agen_type_name')
%

category: 'Grail-Tests - code objects'
method: CoroutineIntrospectionTestCase
testCodeObjectsAgreeWithTheFunctions
	"gi_code / cr_code / ag_code are real PyCodes whose co_flags agree
	flag-for-flag with the def-time stamp on the function -- including
	CO_NESTED for a closure-form def, which is why the wrapper tail emits
	nested: true on that path and nested: false on the method-form path."

	self assertAll: #('gen_code_is_real' 'gen_code_names_the_def'
		'gen_code_has_generator_flag' 'coro_code_has_coroutine_flag'
		'coro_code_lacks_generator_flag' 'agen_code_has_asyncgen_flag'
		'nested_code_has_nested_flag')
%

category: 'Grail-Tests - frames and states'
method: CoroutineIntrospectionTestCase
testFramesFlipToNoneAtCompletion
	"A real frame (types.FrameType is now derived from a live tb_frame)
	while the body is unfinished; None afterwards.  The contents are
	minimal -- f_code, the def's first line, f_back None -- but the
	None-flip is what CPython's tests and inspect's state readers consult."

	self assertAll: #('gen_frame_is_real_while_fresh'
		'coro_frame_is_real_while_fresh' 'agen_frame_is_real_while_fresh'
		'gen_frame_is_none_after_close' 'coro_frame_is_none_after_close')
%

category: 'Grail-Tests - frames and states'
method: CoroutineIntrospectionTestCase
testStatesWalkAsCPythons
	"inspect's four-state model, read in CPython's exact order: running,
	then the 3.12+ suspended flag, then frame None-ness.  A plain Grail
	coroutine goes CREATED -> CLOSED with no SUSPENDED between -- no event
	loop, awaits run straight through -- so the walks only visit states
	both interpreters share."

	self assertAll: #('gen_states_created_suspended_closed'
		'coro_states_created_then_closed'
		'agen_states_created_suspended_closed')
%

category: 'Grail-Tests - messages'
method: CoroutineIntrospectionTestCase
testMessagesAreWordedPerKind
	"The four message families, worded per kind exactly as CPython words
	them (PythonGenerator >> ___pyKindWords___ and its two overrides)."

	self assertAll: #('coro_just_started_send_message'
		'agen_just_started_send_message' 'coro_pep479_message'
		'agen_pep479_message' 'gen_already_executing_message'
		'coro_already_executing_message')
%
