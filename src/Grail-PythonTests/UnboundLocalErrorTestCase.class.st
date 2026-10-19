Class {
	#name : 'UnboundLocalErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Load-Site Check' }
UnboundLocalErrorTestCase >> test_body_local_read_still_guarded [
	"The relaxation is for PARAMETERS only -- a conditionally assigned
	body local keeps its guard."

	| src |
	src := (self unboundGuardFixture class
		compiledMethodAt: #'read_maybe_unbound:' environmentId: 1) sourceString.
	self assert: (src includesString:
		'ifNil: [UnboundLocalError ___signalUnbound___: #later]').

]

{ #category : 'Grail-Tests-UnboundLocalError' }
UnboundLocalErrorTestCase >> test_creation [
	"Test creating a UnboundLocalError instance."
	
	| exc |
	exc := UnboundLocalError ___new___:  UnboundLocalError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-Load-Site Check' }
UnboundLocalErrorTestCase >> test_deleted_parameter_keeps_guard_and_raises [
	"``del`` on a parameter unbinds it, so the read keeps its guard and
	raises.  This whole shape used to fail to COMPILE: DeleteAst emits
	``value := nil``, which cannot target a Smalltalk method argument."

	| src |
	src := (self unboundGuardFixture class
		compiledMethodAt: #'deleted_parameter:' environmentId: 1) sourceString.
	self assert: (src includesString:
		'ifNil: [UnboundLocalError ___signalUnbound___: #value]').
	self
		should: [self unboundGuardFixture
			perform: #'deleted_parameter:' env: 1 withArguments: { 5 }]
		raise: UnboundLocalError.

]

{ #category : 'Grail-Tests-Load-Site Check' }
UnboundLocalErrorTestCase >> test_deleted_parameter_rebound_is_usable [
	"Deleting a parameter and reassigning it rebinds the name."

	self assert: (self eval: 'def f(a):
    del a
    a = 7
    return a
f(1)') equals: 7.

]

{ #category : 'Grail-Tests-DNU Backstop' }
UnboundLocalErrorTestCase >> test_env0_message_to_nil_unaffected [
	"env-0 messages to nil still raise MessageNotUnderstood — the
	backstop is intentionally limited to env-1 to leave Smalltalk
	semantics unchanged."

	self should: [nil __bool__] raise: MessageNotUnderstood.

]

{ #category : 'Grail-Tests-DNU Backstop' }
UnboundLocalErrorTestCase >> test_env1_keyword_message_to_nil_raises [
	"Multi-argument env-1 sends to nil also surface as UnboundLocalError."

	self should: [nil @env1:__add__: 1] raise: UnboundLocalError.

]

{ #category : 'Grail-Tests-DNU Backstop' }
UnboundLocalErrorTestCase >> test_env1_message_to_nil_raises [
	"Sending any env-1 Python protocol message to nil raises
	UnboundLocalError, not MessageNotUnderstood."

	self should: [nil @env1:__bool__] raise: UnboundLocalError.

]

{ #category : 'Grail-Tests-Load-Site Check' }
UnboundLocalErrorTestCase >> test_guard_allocates_no_block [
	"``read_maybe_unbound'' is a guarded read plus an ``if'', both of
	which the compiler inlines, so its compiled method has a block
	literal if and only if the guard's ifNil: was compiled as a real
	send instead of being inlined."

	| m |
	m := self unboundGuardFixture class
		compiledMethodAt: #'read_maybe_unbound:' environmentId: 1.
	self assert: (m sourceString includesString: 'ifNil: [UnboundLocalError').
	self assert: m _blockLiterals isNil.

]

{ #category : 'Grail-Tests-Load-Site Check' }
UnboundLocalErrorTestCase >> test_guard_emits_inlined_ifNil [
	"The emitted guard is the ifNil: form, not a ___checkLocal:named: send."

	| src |
	src := (self unboundGuardFixture class
		compiledMethodAt: #'read_maybe_unbound:' environmentId: 1) sourceString.
	self assert: (src includesString:
		'ifNil: [UnboundLocalError ___signalUnbound___: #later]').
	self deny: (src includesString: '___checkLocal:').

]

{ #category : 'Grail-Tests-Load-Site Check' }
UnboundLocalErrorTestCase >> test_guard_message_matches_cpython [
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

]

{ #category : 'Grail-Tests-UnboundLocalError' }
UnboundLocalErrorTestCase >> test_inheritance [
	"Test that UnboundLocalError inherits from NameError."

	| exc |
	exc := UnboundLocalError ___new___:  UnboundLocalError .
	self assert: (exc isKindOf: NameError).

]

{ #category : 'Grail-Tests-Load-Site Check' }
UnboundLocalErrorTestCase >> test_nested_nonlocal_del_keeps_guard_and_raises [
	"``nonlocal value; del value'' in a NESTED def unbinds the OUTER
	def's parameter, so the outer read must keep its guard."

	| src |
	src := (self unboundGuardFixture class
		compiledMethodAt: #'nested_nonlocal_del:' environmentId: 1) sourceString.
	self assert: (src includesString:
		'ifNil: [UnboundLocalError ___signalUnbound___: #value]').
	self
		should: [self unboundGuardFixture
			perform: #'nested_nonlocal_del:' env: 1 withArguments: { 5 }]
		raise: UnboundLocalError.

]

{ #category : 'Grail-Tests-Load-Site Check' }
UnboundLocalErrorTestCase >> test_parameter_read_emits_no_guard [
	"A plain parameter read carries no guard at all."

	| src |
	src := (self unboundGuardFixture class
		compiledMethodAt: #'read_parameter:' environmentId: 1) sourceString.
	self deny: (src includesString: 'ifNil: [UnboundLocalError').

]

{ #category : 'Grail-Tests-DNU Backstop' }
UnboundLocalErrorTestCase >> test_perform_env1_to_nil_raises [
	"Reflective dispatch via perform:env:withArguments: on nil also goes
	through the backstop (cantPerform:withArguments:env:)."

	self should: [nil perform: #__bool__ env: 1 withArguments: #()]
		raise: UnboundLocalError.

]

{ #category : 'Grail-Tests-Load-Site Check' }
UnboundLocalErrorTestCase >> test_python_assigned_local_does_not_raise [
	"A local that is unconditionally assigned before use reads cleanly —
	the codegen still emits a check, but it always passes."

	self assert: (self eval: 'def f():
    x = 42
    return x
f()') equals: 42.

]

{ #category : 'Grail-Tests-Load-Site Check' }
UnboundLocalErrorTestCase >> test_python_aug_assign_unbound_raises [
	"Augmented assignment ``x += 1`` reads x first, so an unbound
	augmented target raises UnboundLocalError on the implicit read."

	self
		should: [self eval: 'def f():
    x += 1
    return x
f()']
		raise: UnboundLocalError.

]

{ #category : 'Grail-Tests-Load-Site Check' }
UnboundLocalErrorTestCase >> test_python_explicit_none_does_not_raise [
	"Sanity: a local assigned to None — the singleton — does not trigger
	the check. Only nil (genuine undefined) does."

	self assert: (self eval: 'def f():
    x = None
    return x is None
f()') == true.

]

{ #category : 'Grail-Tests-Load-Site Check' }
UnboundLocalErrorTestCase >> test_python_parameter_does_not_raise [
	"Function parameters are bound by the call. The codegen emits a check
	but it always passes."

	self assert: (self eval: 'def f(p):
    return p
f(7)') equals: 7.

]

{ #category : 'Grail-Tests-Load-Site Check' }
UnboundLocalErrorTestCase >> test_python_unbound_local_names_the_variable [
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

]

{ #category : 'Grail-Tests-DNU Backstop' }
UnboundLocalErrorTestCase >> test_python_unbound_local_use_raises [
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

]

{ #category : 'Grail-Tests-DNU Backstop' }
UnboundLocalErrorTestCase >> test_unbound_local_inherits_from_name_error [
	"The DNU backstop raises a real Python UnboundLocalError, which is
	itself a NameError subclass — so generic ``except NameError:`` catches
	it just like in CPython."

	self should: [nil @env1:__bool__] raise: NameError.

]

{ #category : 'Grail-helpers' }
UnboundLocalErrorTestCase >> unboundGuardFixture [
	"tests/python/unbound_local_guard.py, loaded fresh -- on the TEXT path
	whatever the IR flag says.  Four tests here read the compiled methods'
	sourceString for the ``ifNil: [UnboundLocalError ...]'' guard and one checks
	the method has no block literal: they measure the TEXT emitter's guard
	shape, which an IR-built method (Python source, cut 72 guards the same
	reads through an inlined ifNil: node) cannot show.  The flag is restored
	in the ensure:, as TracebackTestCase does for its line-cache fixture."

	| savedIRFlag |
	(importlib @env1:modules) removeKey: #'unbound_local_guard' ifAbsent: [].
	savedIRFlag := importlib ___irCodegenFlag___.
	importlib ___irCodegenForce___: false.
	^ [importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unbound_local_guard.py')
		name: 'unbound_local_guard']
			ensure: [importlib ___irCodegenForce___: savedIRFlag]

]
