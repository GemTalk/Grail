Extension { #name : 'PyAnextAwaitable' }

{ #category : 'Grail-Awaitable Protocol' }
PyAnextAwaitable >> ___inner___ [
	"The awaitable ait.__anext__() answered, resolved to something drivable:
	the generator family directly, an __await__-bearing object through its
	iterator.  Computed on the FIRST drive -- anext() itself advances
	nothing."

	inner @env0:ifNil: [ | aw it |
		aw := anextResult.
		inner := ((aw @env0:isKindOf: PythonCoroutine)
			@env0:or: [bareGenOk == true
				@env0:and: [aw @env0:isKindOf: PythonGenerator]])
			ifTrue: [aw]
			ifFalse: [
				(aw ___respondsTo___: #'__await__')
					ifTrue: [
						"Mirror of PythonGenerator >> ___checkedAwaitIterator___
						and ___isRealIterator___: -- this object is not a
						generator, so it cannot inherit them.  An __await__
						answering 42 must be CPython's non-iterator TypeError
						(test_anext_bad_await greps __await__.*iterator), not
						an uncatchable MNU when the drive sends it send:."
						it := aw @env1:__await__.
						(it @env0:isKindOf: PythonCoroutine) ifTrue: [
							^ TypeError @env1:___signal___:
								'__await__() returned a coroutine'].
						(self ___isRealIterator___: it) ifFalse: [
							^ TypeError @env1:___signal___:
								('__await__() returned non-iterator of type '''
									@env0:, (bytes ___pyTypeNameOf___: it)
									@env0:, '''')].
						it]
					ifFalse: [
						"GET_AWAITABLE clause three
						(test_anext_return_iterator)."
						^ TypeError @env1:___signal___:
							('''' @env0:, (bytes ___pyTypeNameOf___: aw)
								@env0:, ''' object can''t be awaited')]]].
	^ inner

]

{ #category : 'Grail-Private' }
PyAnextAwaitable >> ___isRealIterator___: anObject [
	"Verbatim twin of PythonGenerator >> ___isRealIterator___: (see there for
	the PythonInstance-fallback story); duplicated only because this class is
	not a generator."

	| defining |
	defining := anObject @env0:class
		@env0:whichClassIncludesSelector: #'__next__' environmentId: 1.
	defining @env0:isNil ifTrue: [^ false].
	(defining @env0:name @env0:asString @env0:= 'PythonInstance') ifTrue: [
		^ (anObject ___classAttrDunder___: #'__next__') @env0:notNil].
	^ true

]

{ #category : 'Grail-Awaitable Protocol' }
PyAnextAwaitable >> __await__ [
	^ self

]

{ #category : 'Grail-Awaitable Protocol' }
PyAnextAwaitable >> __iter__ [
	^ self

]

{ #category : 'Grail-Awaitable Protocol' }
PyAnextAwaitable >> __next__ [
	^ self send: None

]

{ #category : 'Grail-Awaitable Protocol' }
PyAnextAwaitable >> close [
	"Niladic, so close(1) is the arity TypeError test_await_17 asserts.
	Undriven means nothing to shut down."

	inner @env0:ifNil: [^ None].
	^ inner @env1:close

]

{ #category : 'Grail-Awaitable Protocol' }
PyAnextAwaitable >> send: aValue [
	"Drive the underlying __anext__ awaitable; exhaustion becomes
	StopIteration carrying the default -- the whole reason the two-argument
	form exists."

	| in |
	in := self ___inner___.
	^ [(in @env0:isKindOf: PythonGenerator)
			ifTrue: [in send: aValue]
			ifFalse: [aValue == None
				ifTrue: [in @env1:__next__]
				ifFalse: [in @env1:send: aValue]]]
		@env0:on: StopAsyncIteration
		do: [:e |
			"No default (the one-arg form, Smalltalk-nil sentinel): exhaustion
			is the caller's to see, as StopAsyncIteration."
			defaultValue @env0:isNil
				ifTrue: [e @env0:pass]
				ifFalse: [StopIteration ___signalReturn___: defaultValue]]

]

{ #category : 'Grail-Awaitable Protocol' }
PyAnextAwaitable >> throw: anException [
	| in |
	in := self ___inner___.
	^ [in @env1:throw: anException]
		@env0:on: StopAsyncIteration
		do: [:e |
			defaultValue @env0:isNil
				ifTrue: [e @env0:pass]
				ifFalse: [StopIteration ___signalReturn___: defaultValue]]

]
