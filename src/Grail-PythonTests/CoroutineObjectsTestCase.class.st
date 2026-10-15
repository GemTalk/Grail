Class {
	#name : 'CoroutineObjectsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
CoroutineObjectsTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
CoroutineObjectsTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'coroutine_objects' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/coroutine_objects.py')
		name: 'coroutine_objects'.

]

{ #category : 'Grail-Tests - The object' }
CoroutineObjectsTestCase >> testACallAnswersACoroutine [
	self assert: (self resultAt: 'has_coroutine_protocol') asString
		equals: '[True, True, True, True]'.

]

{ #category : 'Grail-Tests - Class members' }
CoroutineObjectsTestCase >> testAnAsyncMethodIsACoroutineToo [
	"The flag rather than the node class is what makes this work: a class-body
	async def is an InstanceFunctionDefAst AND async."

	self assert: (self resultAt: 'async_method_is_a_coroutine') asString equals: 'True'.

]

{ #category : 'Grail-Tests - Driving it' }
CoroutineObjectsTestCase >> testAnExceptionInTheBodyPropagatesOutOfSend [
	self assert: (self resultAt: 'exception_propagates') asString equals: '''inside'''.

]

{ #category : 'Grail-Tests - Driving it' }
CoroutineObjectsTestCase >> testAwaitDrivesItInline [
	"``await'' can no longer be the identity now that a call answers a coroutine
	-- it has to run the thing.  With nothing to suspend on, that means running
	straight through and taking the value."

	self assert: (self resultAt: 'await_yields_the_value') asString equals: '''v'''.

]

{ #category : 'Grail-Tests - Driving it' }
CoroutineObjectsTestCase >> testCloseOnAnUndrivenCoroutineIsQuiet [
	self assert: (self resultAt: 'close_is_quiet') asString equals: 'ok'.

]

{ #category : 'Grail-Tests - Never awaited' }
CoroutineObjectsTestCase >> testDroppingAnUnawaitedCoroutineWarnsWhenCollected [
	"Formerly the known-gap pin testDroppingAnUnawaitedCoroutineIsSilent, whose
	comment asked to be turned round the day someone built the warning.
	CPython's ``RuntimeWarning: coroutine ... was never awaited'' now fires
	from the coroutine's destructor -- a FinalizerEphemeron registered at
	creation -- so it arrives when the collector reclaims the coroutine, which
	is why the check collects -- and why it collects FIRST as well: a
	coroutine an earlier test dropped would otherwise report inside this
	capture.  CoroutineNeverAwaitedTestCase covers the rest."

	self assert: (self eval: 'import warnings
from test.support import gc_collect
async def orphan():
    return 1
gc_collect()
with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter(''always'')
    orphan()
    gc_collect()
repr([str(w.message) for w in caught if issubclass(w.category, RuntimeWarning)])')
		equals: '["coroutine ''orphan'' was never awaited"]'

]

{ #category : 'Grail-Tests - Driving it' }
CoroutineObjectsTestCase >> testSendReportsTheReturnValue [
	"send(None) runs a non-suspending coroutine straight through and reports its
	return value as StopIteration's value -- the generator machinery's existing
	behaviour for a body with no yield, which is what makes PythonCoroutine a
	PythonGenerator rather than a new runtime."

	self assert: (self resultAt: 'send_reports_return_value') asString equals: '''v'''.

]

{ #category : 'Grail-Tests - The object' }
CoroutineObjectsTestCase >> testTheBodyDoesNotRunUntilDriven [
	"The behavioural change, and the whole reason the object is needed: a call
	used to run the body to completion.  A coroutine that is never driven runs
	nothing -- which is why CPython warns about one that is never awaited."

	self assert: (self resultAt: 'body_does_not_run_until_driven') asString
		equals: '[]'.

]

{ #category : 'Grail-Tests - Identity' }
CoroutineObjectsTestCase >> testTheTypeNameIsCoroutine [
	"Formerly the known-gap pin ('PythonCoroutine', with the note that
	whatever fixed the generator spelling should fix both).  The type-name
	remap in Object.gs >> ___pythonBuiltinTypeName___ fixed all three lazy
	call kinds at once -- generator, coroutine, async_generator -- so the pin
	now asserts CPython's answer."

	self assert: (self resultAt: 'coroutine_type_name') asString
		equals: '''coroutine'''.

]
