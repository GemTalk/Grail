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

{ #category : 'Grail-String Representation' }
WeakReference >> ___hexAddress___: anObject [
	"anObject's address as reprs print it, as object.__repr__ does."

	^ (anObject @env0:identityHash @env0:printStringRadix: 16) @env0:asLowercase

]

{ #category : 'Grail-String Representation' }
WeakReference >> ___referentName___: aReferent [
	"The name weakref_repr shows after the referent, or nil.  CPython looks
	__name__ up on the referent's TYPE, which only a class, a function or a
	module answers -- an instance's own ``__name__'' attribute is not seen --
	so only those are asked here."

	| name |
	((aReferent @env0:isBehavior)
		or: [(aReferent @env0:isKindOf: ExecBlock)
		or: [(aReferent @env0:isKindOf: BoundMethod)
		or: [aReferent @env0:isKindOf: module]]]) ifFalse: [^ nil].
	name := [aReferent @env1:___pyAttrLoad___: #'__name__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	^ (name @env0:isKindOf: CharacterCollection)
		ifTrue: [name @env0:asString]
		ifFalse: [nil]

]

{ #category : 'Grail-Weak-Python' }
WeakReference >> __call__ [
	"r() — return the referent or None."

	| v |
	v := self @env0:value.
	v == nil ifTrue: [^None].
	^v

]

{ #category : 'Grail-Introspection' }
WeakReference >> __class_getitem__: item [
	"``weakref.ref[int]'' -- a types.GenericAlias, as CPython's weakref.ref
	answers through its own __class_getitem__.  Grail answered the class
	unchanged.  Run with the CLASS as receiver by Metaclass3 >>
	___grailClassGetitemDispatch___:, as set's is."

	^ (Python @env0:at: #'PyGenericAlias') ___fromSubscript___: item origin: self

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

{ #category : 'Grail-String Representation' }
WeakReference >> __repr__ [
	"CPython's weakref_repr (Objects/weakrefobject.c): ``<weakref at 0x...; to
	'Target' at 0x...>'', with the referent's own name after it when it has
	one -- a class, a function -- or ``<weakref at 0x...; dead>''.  Grail had
	none, so a weakref printed as an object of its own type."

	| referent repr name |
	referent := self @env0:value.
	repr := '<weakref at 0x' @env0:, (self ___hexAddress___: self).
	referent == nil ifTrue: [^ repr @env0:, '; dead>'].
	repr := repr @env0:, '; to ''' @env0:, (referent ___pyTypeNameForError___) @env0:asString
		@env0:, ''' at 0x' @env0:, (self ___hexAddress___: referent).
	name := self ___referentName___: referent.
	name == nil ifFalse: [repr := repr @env0:, ' (' @env0:, name @env0:, ')'].
	^ repr @env0:, '>'

]

{ #category : 'Grail-Weak-Python' }
WeakReference >> value: positional value: kwargs [
	"Python `r()` — legacy callable form. CallAst falls back to
	 `obj value: {args} value: kwargs` for instance calls, so route to
	 __call__ here. (Python's weakref.ref(obj)() expects to return the
	 referent or None; we ignore args since ref calls take no arguments.)"

	^self @env1:__call__

]
