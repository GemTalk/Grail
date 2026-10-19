Class {
	#name : 'DirectCallsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'registrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DirectCallsTestCase >> assertAllChecksPassIn: aModule [
	"``failures'' is the fixture's own import-time run of every check: the
	names that did not answer True, comma-joined, empty when all passed."

	self assert: (aModule @env1:___pyAttrLoad___: #check_count) equals: 39.
	self assert: (aModule @env1:___pyAttrLoad___: #failures) asString equals: ''.

]

{ #category : 'Grail-Private' }
DirectCallsTestCase >> loadFixtureWithFlag: aBoolean ir: irBoolean as: aName [
	"tests/python/direct_calls.py, freshly compiled with GRAIL_DIRECT_CALLS
	forced to aBoolean (and GRAIL_IR_CODEGEN to irBoolean)."

	(importlib @env1:modules) removeKey: aName asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: aName.
	importlib ___directCallsForce___: aBoolean.
	importlib ___irCodegenForce___: irBoolean.
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/direct_calls.py')
		name: aName

]

{ #category : 'Grail-Setup' }
DirectCallsTestCase >> setUp [
	"Snapshot the canonical-class registry: the fixture is loaded once per flag
	state under distinct module names, and a class minted under one state must
	not be identity-reused under the other."

	"The stage-3 read-accessor flag changes the shapes this case asserts; pin it OFF."
	importlib ___attrAccessorsForce___: false.
	registrySnapshot := importlib ___canonicalRegistrySnapshot___.

]

{ #category : 'Grail-Setup' }
DirectCallsTestCase >> tearDown [
	importlib ___attrAccessorsInvalidate___.
	importlib ___directCallsInvalidate___.
	importlib ___irCodegenEnabledInvalidate___.
	#('direct_calls_on' 'direct_calls_off' 'direct_calls_ir') do: [:n |
		(importlib @env1:modules) removeKey: n asSymbol ifAbsent: [].
		self ___forgetCanonicalModule___: n].
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].

]

{ #category : 'Grail-Tests - Semantics' }
DirectCallsTestCase >> testAllChecksPassWithDirectCallsOff [
	"The control: the same checks hold on the unchanged load-then-call shape,
	so the fixture pins Python semantics rather than a dispatch shape."

	self assertAllChecksPassIn:
		(self loadFixtureWithFlag: false ir: false as: 'direct_calls_off').

]

{ #category : 'Grail-Tests - Semantics' }
DirectCallsTestCase >> testAllChecksPassWithDirectCallsOn [
	"THE TEST THIS EXISTS FOR: every call-semantics check holds when attribute
	calls compile to direct keyword sends with DNU recovery."

	self assertAllChecksPassIn:
		(self loadFixtureWithFlag: true ir: false as: 'direct_calls_on').

]

{ #category : 'Grail-Tests - Semantics' }
DirectCallsTestCase >> testAllChecksPassWithDirectCallsOnIR [
	"The IR backend emits the same direct send (#attrDirect); skipped where the
	kernel cannot build IR at all."

	importlib ___irCodegenSupported___ ifFalse: [^ self].
	self assertAllChecksPassIn:
		(self loadFixtureWithFlag: true ir: true as: 'direct_calls_ir').

]

{ #category : 'Grail-Tests - Structure' }
DirectCallsTestCase >> testFlagChangesTheEmittedShape [
	"``c.foo(i)'' on an unresolved receiver: load-then-call with the flag off,
	one keyword send with it on.  Asserted on the generated source so a silent
	fall-back to the legacy shape cannot pass as a semantic pass."

	| src off on |
	"Inside a def, with a parameter argument: a module-level ``i'' is a global,
	which the lookup could rebind (exclusion 11)."
	src := 'def f(c, i):
    return c.foo(i)'.
	importlib ___directCallsForce___: false.
	off := (importlib smalltalkForSource: src) asString.
	importlib ___directCallsForce___: true.
	on := (importlib smalltalkForSource: src) asString.
	self assert: (off includesString: '___pyAttrLoad___: #''foo''') description: off.
	self assert: (off includesString: 'value: nil') description: off.
	self assert: (on includesString: ' foo: (') description: on.
	self deny: (on includesString: '___pyAttrLoad___: #''foo''') description: on.

]

{ #category : 'Grail-Tests - Structure' }
DirectCallsTestCase >> testOnlyUnobservableArgumentsGetTheDirectSend [
	"Exclusion 11: Python looks the attribute up before evaluating the
	arguments, and a direct send looks it up after them, on a miss.  So the
	send is direct only when the arguments are literals or names bound on
	every path (parameters, earlier-assigned locals, loop and comprehension
	targets); a call, an attribute read, an operator, a global, a
	maybe-unbound local, or a name the lookup could rebind keeps
	load-then-call."

	| shapeOf |
	shapeOf := [:body | | out |
		out := (importlib smalltalkForSource: 'def f(c, p):
' , body) asString.
		(out includesString: '___pyAttrLoad___: #''foo''')
			ifTrue: [#load]
			ifFalse: [(out includesString: ' foo: (') ifTrue: [#direct] ifFalse: [out]]].
	importlib ___directCallsForce___: true.
	{
		{'    c.foo(p)'. #direct}.
		{'    c.foo(1, -2, ''s'', None)'. #direct}.
		{'    x = 1
    c.foo(x)'. #direct}.
		{'    for x in p:
        c.foo(x)'. #direct}.
		{'    return [c.foo(x) for x in p]'. #direct}.
		{'    c.foo(g(p))'. #load}.
		{'    c.foo(p.attr)'. #load}.
		{'    c.foo(p + 1)'. #load}.
		{'    c.foo(glob)'. #load}.
		{'    if p:
        x = 1
    c.foo(x)'. #load}.
		{'    for x in p:
        pass
    c.foo(x)'. #load}.
		{'    x = 1
    def g():
        nonlocal x
        x = 2
    c.foo(x)'. #load}.
		{'    e = 1
    try:
        pass
    except Exception as e:
        pass
    c.foo(e)'. #load}.
	} do: [:pair |
		self assert: (shapeOf value: (pair at: 1)) equals: (pair at: 2)]

]
