"The awaitable that advances an async generator by one step -- CPython's
async_generator_asend.  Returned by __anext__ / asend / athrow / aclose.

A STATE MACHINE rather than a generator: one step is a single decision about
what the body handed back, and ___yieldFrom___: (which is what ``await'
delegates through) drives any object offering __iter__ / __next__ / send: /
throw: / close.  Building it as a generator instead forked a GsProcess per
iteration step and exhausted VM temporary memory.

"
Class {
	#name : 'PyAsyncGenASend',
	#superclass : 'Object',
	#instVars : [
		'agen',
		'kind',
		'arg',
		'started',
		'finished'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance Creation' }
PyAsyncGenASend class >> ___on___: anAsyncGen kind: aKind arg: anArg [
	"aKind is #send, #throw or #close -- HOW the body is first resumed.  Every
	step after the first is a plain send, which is why one class covers all
	four entry points.

	Each one is watched for collection, for CPython's never-awaited warning
	(___warnIfNeverAwaited___).  The action is a clean block: the step
	travels in the ephemeron's key slot, never in a closure."

	| step |
	step := self new ___setAgen___: anAsyncGen kind: aKind arg: anArg.
	FinalizerEphemeron
		on: step
		do: [:aStep :unused | aStep ___warnIfNeverAwaited___]
		with: nil.
	^ step

]

{ #category : 'Grail-Instance Creation' }
PyAsyncGenASend class >> ___unwatchedOn___: anAsyncGen kind: aKind arg: anArg [
	"A step with no never-awaited watch, for a caller that drives it on the
	spot -- the compiled ``async for'' (PythonCoroutine class >>
	___grailAnext___:).  Only such a caller: a step handed to user code
	unwatched could be dropped undriven without the warning CPython gives."

	^ self new ___setAgen___: anAsyncGen kind: aKind arg: anArg

]

{ #category : 'Grail-Private' }
PyAsyncGenASend >> ___setAgen___: anAsyncGen kind: aKind arg: anArg [
	agen := anAsyncGen.
	kind := aKind.
	arg := anArg.
	started := false.
	finished := false.
	^ self

]

{ #category : 'Grail-Private' }
PyAsyncGenASend >> ___warnIfNeverAwaited___ [
	"The step's destructor, run by its FinalizerEphemeron when it is collected:
	CPython's async_gen_asend_finalize / async_gen_athrow_finalize.  A step
	collected in its INITIAL state -- never sent to, thrown into or closed --
	is ``g.asend(v)'' (or athrow / aclose) without the ``await'', the async
	twin of calling a coroutine function and dropping the result:

	    RuntimeWarning: coroutine method 'asend' of 'gen' was never awaited

	The method is named as CPython names it -- __anext__ is asend underneath
	and says so -- and both names are quoted, as CPython's %R formats them.
	close() on an undriven step marks it finished, so a closed one stays
	quiet, as CPython's does (TestUnawaitedWarnings).

	The undriven COROUTINE is the same warning from the same kind of
	destructor, registered by PythonCoroutine class >> withBlock: and run by
	PythonCoroutine >> ___finalizeUnawaited___."

	| word q |
	(started or: [finished]) ifTrue: [^ self].
	word := kind == #'close'
		ifTrue: ['aclose']
		ifFalse: [kind == #'throw' ifTrue: ['athrow'] ifFalse: ['asend']].
	q := agen dynamicInstVarAt: #'__qualname__'.
	(q isKindOf: CharacterCollection) ifFalse: [q := '?'].
	(Python at: #warnings otherwise: nil) ifNotNil: [:wm |
		wm @env1:instance
			@env1:___warn___: 'coroutine method ''' , word , ''' of ''' , q asString
				, ''' was never awaited'
			category: (Python at: #RuntimeWarning otherwise: nil)
			stacklevel: 1]

]
