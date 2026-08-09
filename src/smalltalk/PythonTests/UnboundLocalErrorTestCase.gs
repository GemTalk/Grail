! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnboundLocalErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnboundLocalErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
UnboundLocalErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! UnboundLocalErrorTestCase - Tests for Python UnboundLocalError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnboundLocalErrorTestCase removeAllMethods.
UnboundLocalErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-UnboundLocalError'
method: UnboundLocalErrorTestCase
test_creation
	"Test creating a UnboundLocalError instance."
	
	| exc |
	exc := UnboundLocalError ___new___:  UnboundLocalError .
	self assert: exc notNil.
%

category: 'Grail-Tests-UnboundLocalError'
method: UnboundLocalErrorTestCase
test_inheritance
	"Test that UnboundLocalError inherits from NameError."

	| exc |
	exc := UnboundLocalError ___new___:  UnboundLocalError .
	self assert: (exc isKindOf: NameError).
%

! ===============================================================================
! Phase C-1 — DNU backstop on UndefinedObject (env 1)
! ===============================================================================
! An env-1 message sent to nil indicates an unbound Python local (or a
! Smalltalk-bridge nil leak). The DNU handler converts these to
! UnboundLocalError so user code sees a Python-shaped error, not a
! Smalltalk MessageNotUnderstood. The backstop is independent of (and
! complementary to) Phase C-2's load-site definite-assignment check.

category: 'Grail-Tests-DNU Backstop'
method: UnboundLocalErrorTestCase
test_env1_message_to_nil_raises
	"Sending any env-1 Python protocol message to nil raises
	UnboundLocalError, not MessageNotUnderstood."

	self should: [nil @env1:__bool__] raise: UnboundLocalError.
%

category: 'Grail-Tests-DNU Backstop'
method: UnboundLocalErrorTestCase
test_env1_keyword_message_to_nil_raises
	"Multi-argument env-1 sends to nil also surface as UnboundLocalError."

	self should: [nil @env1:__add__: 1] raise: UnboundLocalError.
%

category: 'Grail-Tests-DNU Backstop'
method: UnboundLocalErrorTestCase
test_unbound_local_inherits_from_name_error
	"The DNU backstop raises a real Python UnboundLocalError, which is
	itself a NameError subclass — so generic ``except NameError:`` catches
	it just like in CPython."

	self should: [nil @env1:__bool__] raise: NameError.
%

category: 'Grail-Tests-DNU Backstop'
method: UnboundLocalErrorTestCase
test_env0_message_to_nil_unaffected
	"env-0 messages to nil still raise MessageNotUnderstood — the
	backstop is intentionally limited to env-1 to leave Smalltalk
	semantics unchanged."

	self should: [nil __bool__] raise: MessageNotUnderstood.
%

category: 'Grail-Tests-DNU Backstop'
method: UnboundLocalErrorTestCase
test_perform_env1_to_nil_raises
	"Reflective dispatch via perform:env:withArguments: on nil also goes
	through the backstop (cantPerform:withArguments:env:)."

	self should: [nil perform: #__bool__ env: 1 withArguments: #()]
		raise: UnboundLocalError.
%

category: 'Grail-Tests-DNU Backstop'
method: UnboundLocalErrorTestCase
test_python_unbound_local_use_raises
	"A Python local that is never assigned (because the assignment is
	guarded by a condition that is false) raises UnboundLocalError on
	read. With Phase C-2's load-site check this fires at the read of
	``x``, before any message would reach the DNU backstop."

	self
		should: [self eval: 'def f(c):
    if c:
        x = 1
    return x + 1
f(False)']
		raise: UnboundLocalError.
%

category: 'Grail-Tests-Load-Site Check'
method: UnboundLocalErrorTestCase
test_python_explicit_none_does_not_raise
	"Sanity: a local assigned to None — the singleton — does not trigger
	the check. Only nil (genuine undefined) does."

	self assert: (self eval: 'def f():
    x = None
    return x is None
f()') == true.
%

category: 'Grail-Tests-Load-Site Check'
method: UnboundLocalErrorTestCase
test_python_unbound_local_names_the_variable
	"Phase C-2: the load-site check raises an error whose message names
	the unbound variable. This is Python-fidelity: the codegen knows the
	name; the DNU backstop alone cannot recover it."

	[self eval: 'def f(c):
    if c:
        y = 1
    return y
f(False)']
		on: UnboundLocalError do: [:ex |
			self assert:
				(ex messageText indexOfSubCollection: '''y''') > 0.
			^ self].
	self assert: false description: 'Expected UnboundLocalError'
%

category: 'Grail-Tests-Load-Site Check'
method: UnboundLocalErrorTestCase
test_python_assigned_local_does_not_raise
	"A local that is unconditionally assigned before use reads cleanly —
	the codegen still emits a check, but it always passes."

	self assert: (self eval: 'def f():
    x = 42
    return x
f()') equals: 42.
%

category: 'Grail-Tests-Load-Site Check'
method: UnboundLocalErrorTestCase
test_python_parameter_does_not_raise
	"Function parameters are bound by the call. The codegen emits a check
	but it always passes."

	self assert: (self eval: 'def f(p):
    return p
f(7)') equals: 7.
%

category: 'Grail-Tests-Load-Site Check'
method: UnboundLocalErrorTestCase
test_python_aug_assign_unbound_raises
	"Augmented assignment ``x += 1`` reads x first, so an unbound
	augmented target raises UnboundLocalError on the implicit read."

	self
		should: [self eval: 'def f():
    x += 1
    return x
f()']
		raise: UnboundLocalError.
%

! ===============================================================================
! Inlined ifNil: guard — codegen shape and message text
! ===============================================================================
! NameAst's load-context guard emits
!     (x ifNil: [UnboundLocalError ___signalUnbound___: #x])
! rather than a send of ___checkLocal:named:.  ifNil: is an OPTIMISED
! selector, so the compiler inlines it: the bound case (the overwhelming
! majority of the ~12k emitted guards) costs an inline nil test rather than
! a real message send, and allocates no BlockClosure.  Regressing that is
! invisible behaviourally and shows up only as a slowdown, hence these tests.
! ===============================================================================

category: 'Grail-Tests-Load-Site Check'
method: UnboundLocalErrorTestCase
test_guard_message_matches_cpython
	"The text built by ___signalUnbound___: must keep CPython's wording."

	self assert: (self eval: 'def f(flag):
    if flag:
        later = 1
    return later

try:
    f(False)
    msg = "no error raised"
except UnboundLocalError as e:
    msg = str(e)
msg')
		equals: 'cannot access local variable ''later'' where it is not associated with a value'.
%

category: 'Grail-Tests-Load-Site Check'
method: UnboundLocalErrorTestCase
test_guard_emits_inlined_ifNil
	"The emitted guard is the ifNil: form, not a ___checkLocal:named: send."

	| src |
	src := (self unboundGuardFixture class
		compiledMethodAt: #'read_maybe_unbound:' environmentId: 1) sourceString.
	self assert: (src includesString:
		'ifNil: [UnboundLocalError ___signalUnbound___: #later]').
	self deny: (src includesString: '___checkLocal:').
%

category: 'Grail-Tests-Load-Site Check'
method: UnboundLocalErrorTestCase
test_guard_allocates_no_block
	"``read_parameter'' is a single guarded read and nothing else, so its
	compiled method has a block literal if and only if ifNil: was compiled
	as a real send instead of being inlined."

	| m |
	m := self unboundGuardFixture class
		compiledMethodAt: #'read_parameter:' environmentId: 1.
	self assert: (m sourceString includesString: 'ifNil: [UnboundLocalError').
	self assert: m _blockLiterals isNil.
%

category: 'Grail-helpers'
method: UnboundLocalErrorTestCase
unboundGuardFixture
	"tests/python/unbound_local_guard.py, loaded fresh."

	(importlib @env1:modules) removeKey: #'unbound_local_guard' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unbound_local_guard.py')
		name: 'unbound_local_guard'
%
