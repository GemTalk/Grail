Extension { #name : 'WeakReference' }

{ #category : 'Grail-Weak-Python' }
WeakReference class >> __new__: anObject [
	"weakref.ref(obj) — create a weak reference."

	^self @env0:on: anObject

]

{ #category : 'Grail-Weak-Python' }
WeakReference class >> __new__: anObject _: aCallback [
	"weakref.ref(obj, callback) — create a weak reference whose callback runs
	 when obj is reclaimed. The Python callable (an ExecBlock taking
	 (positional, kwargs)) is wrapped in a 1-arg Smalltalk block so #mourn's
	 simple `callback value: self` invocation routes through Python's
	 (positional, kwargs) calling convention."

	aCallback == None ifTrue: [^self @env0:on: anObject].
	^self @env0:on: anObject
		callback: [:r | aCallback @env0:value: (Array @env0:with: r) value: nil]

]

{ #category : 'Grail-Weak-Python' }
WeakReference class >> _collect [
	"Grail extension exposed to Python as `weakref._collect()`. Force GemStone
	 in-memory collection and drain the ephemeron finalization queue so weak
	 refs fire and callbacks run synchronously. The Python equivalent of
	 CPython's `gc.collect()` for the purpose of weakref tests."

	WeakReference @env0:_flushProcessStackAreas.
	System @env0:_generationScavenge_vmMarkSweep.
	GcFinalizeNotification @env0:new @env0:_finalizeEphemerons.
	FinalizerEphemeron @env0:_runPending

]

{ #category : 'Grail-Weak-Python' }
WeakReference >> __call__ [
	"r() — return the referent or None."

	| v |
	v := self @env0:value.
	v == nil ifTrue: [^None].
	^v

]

{ #category : 'Grail-Weak-Python' }
WeakReference >> __eq__: other [
	^self @env0:= other

]

{ #category : 'Grail-Weak-Python' }
WeakReference >> __hash__ [
	^self @env0:hash

]

{ #category : 'Grail-Weak-Python' }
WeakReference >> __ne__: other [
	^(self @env0:= other) @env0:not

]

{ #category : 'Grail-Weak-Python' }
WeakReference >> value: positional value: kwargs [
	"Python `r()` — legacy callable form. CallAst falls back to
	 `obj value: {args} value: kwargs` for instance calls, so route to
	 __call__ here. (Python's weakref.ref(obj)() expects to return the
	 referent or None; we ignore args since ref calls take no arguments.)"

	^self @env1:__call__

]
