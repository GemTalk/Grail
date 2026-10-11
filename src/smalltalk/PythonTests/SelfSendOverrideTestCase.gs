! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SelfSendOverrideTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SelfSendOverrideTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SelfSendOverrideTestCase - self.m() honours an override of m.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SelfSendOverrideTestCase removeAllMethods.
SelfSendOverrideTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Object Model'
method: SelfSendOverrideTestCase
testASelfSendHonoursAnOverriddenMethod
	"``self.m(...)'' inside a method compiles to a plain Smalltalk send, which
	consults neither the instance nor the class.  So monkey-patching a method --
	``C.m = f'', ``patch.object(C, ''m'')'' and ``c.m = f'' alike -- changed what
	an OUTSIDE caller got and nothing at all about what the object's own internal
	calls ran.  Grail was inconsistent with itself besides: ``self.m(*args)''
	compiles to a guarded attribute load and honoured every one of them.

	WHY THE FIX IS AT THE STORE AND NOT THE CALL.  A guard at the self-send costs
	47% of a full Python call, measured, on every intra-object call in the corpus
	whether anything is ever patched or not; behind a global flag it is still 6%.
	Replacing the compiled method the send resolves to moves the entire cost to
	patch time, and unpatched code compiles and runs byte-identically.

	THREE CHECKS HERE ARE CONTROLS, and they are why the dispatcher goes on the
	RECEIVER'S OWN class rather than on the class that defined the method:
	``super().m()'' deliberately starts past the receiver's class and must still
	reach the parent's method, ``Base.m(obj)'' must still reach Base's, and a
	sibling instance that was never patched must be untouched.

	THE ``wraps='' CHECK COUNTS THE CALLS, and that is the point of it.  CPython's
	bound method holds the FUNCTION, so a captured ``obj.m'' calls the original;
	Grail's BoundMethod holds a receiver and a SELECTOR and re-sends -- back into
	the dispatcher that is running.  An earlier version of this test asserted
	only ``spy.called'', which is true for any number of calls, and stayed green
	while Grail recorded TWO calls where CPython records one.  The selector pin
	taken at install time is what makes the capture reach the original.

	THREE MORE COVER BOTH SELECTORS A DEF COMPILES TO.  A def with a default
	argument compiles as varargs, so ``self.greet('you')'' is emitted as
	``_greet:kw:'' rather than as the fixed-arity ``greet:'' -- intercepting one
	spelling and not the other would make the fix depend on how the callee
	happens to be declared.  And the varargs spelling of ``tag'' IS ``_tag:kw:'',
	so matching a name against the first keyword alone made a patch of the
	unrelated def ``_tag'' hijack it."

	| mod |
	importlib @env1:modules removeKey: #'self_send_honours_override' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/self_send_honours_override.py')
		name: 'self_send_honours_override'.
	#( 'a_class_assignment_reaches_the_self_send'
	   'an_instance_assignment_reaches_the_self_send'
	   "Controls: nothing else may move."
	   'an_unpatched_instance_is_unaffected_by_another_instances_patch'
	   'the_starred_self_send_agrees_with_the_plain_one'
	   'an_external_call_still_sees_the_override'
	   'super_still_reaches_the_parent_past_an_instance_shadow'
	   'an_unbound_parent_call_still_reaches_the_parent'
	   "Every SPELLING of a def, not just the two obvious ones."
	   'a_defaulted_method_reached_by_the_varargs_selector_is_patchable'
	   'a_defaulted_method_is_unaffected_when_nothing_is_patched'
	   'a_one_argument_fixed_arity_self_send_is_patchable'
	   'a_two_argument_fixed_arity_self_send_is_patchable'
	   'unpatched_fixed_arity_self_sends_are_unchanged'
	   'patching_an_underscore_name_leaves_the_plain_one_alone'
	   "The mocking shape this exists for, and its unwind."
	   'patch_object_records_the_internal_call_exactly_once'
	   'the_original_returns_when_the_patch_exits' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'self-send override check failed: ' , k , ' -> '
				, answer printString]
%

category: 'Grail-Tests - Object Model'
method: SelfSendOverrideTestCase
testAFunctionFromTheClassIgnoresAnInstanceOverride
	"``A.f(obj)'', and a bound method captured from any instance, runs the
	class's function whatever an instance stores over ``f'' -- CPython lets a
	store on an instance change only later LOOKUPS on it (issue #1226).

	A handle holds a SELECTOR, and the dispatcher answering to it probes the
	receiver for an override at call time.  The pin that redirects a handle to
	the original used to cover only handles older than the first store on ANY
	instance, so ``A.f(obj)'' ran the instance attribute, and the wrap-a-method
	idiom and ``mock.patch.object(obj, ''f'', wraps=obj.f)'' recursed from the
	second instance on.  Putting a saved bound method back recursed too: the
	dispatcher's guard against the receiver's own bound method compared a
	String with a Symbol and never matched.

	CONTROLS: ``self.f()'' still sees the instance override, a CLASS patch
	still reaches every later lookup, and ``del D.m'' still leaves a fresh
	lookup finding the inherited method.

	See tests/python/bound_method_runs_class_function.py (CPython 3.14's
	values)."

	| mod results expected b keys |
	importlib @env1:modules removeKey: #'bound_method_runs_class_function' ifAbsent: [].
	[mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bound_method_runs_class_function.py')
		name: 'bound_method_runs_class_function'.
	 results := mod @env1:___pyAttrLoad___: #'r'.
	 expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	 b := (Python at: #'builtins') @env1:instance.
	 keys := mod @env1:___pyAttrLoad___: #'KEYS'.
	 self assert: (keys @env1:__len__) equals: 16.
	 0 to: (keys @env1:__len__) - 1 do: [:i |
		| k got want |
		k := keys @env1:__getitem__: i.
		got := (b @env1:repr: (results @env1:__getitem__: k)) asString.
		want := (b @env1:repr: (expected @env1:__getitem__: k)) asString.
		self assert: got equals: want
			description: k asString , ': got ' , got , ' want ' , want]]
		ensure: [
			importlib @env1:modules removeKey: #'bound_method_runs_class_function' ifAbsent: []]
%
