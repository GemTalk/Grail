Extension { #name : 'PyCoroutineWrapper' }

{ #category : 'Grail-Coroutine Protocol' }
PyCoroutineWrapper >> __iter__ [
	"The wrapper IS the iterator __await__ promised."

	^ self

]

{ #category : 'Grail-Coroutine Protocol' }
PyCoroutineWrapper >> __next__ [
	^ coro send: None

]

{ #category : 'Grail-Coroutine Protocol' }
PyCoroutineWrapper >> __reduce_ex__: aProtocol [
	"Same refusal as the family it fronts -- ``cannot pickle
	'coroutine_wrapper' object'' (test_copy checks the wrapper too)."

	^ TypeError ___signal___:
		('cannot pickle ''' @env0:, (bytes ___pyTypeNameOf___: self)
			@env0:, ''' object')

]

{ #category : 'Grail-Coroutine Protocol' }
PyCoroutineWrapper >> close [
	^ coro close

]

{ #category : 'Grail-Coroutine Protocol' }
PyCoroutineWrapper >> send: aValue [
	^ coro send: aValue

]

{ #category : 'Grail-Coroutine Protocol' }
PyCoroutineWrapper >> throw: anException [
	^ coro throw: anException

]

{ #category : 'Grail-Coroutine Protocol' }
PyCoroutineWrapper >> throw: aType _: aValue [
	^ coro throw: aType _: aValue

]

{ #category : 'Grail-Coroutine Protocol' }
PyCoroutineWrapper >> throw: aType _: aValue _: aTb [
	^ coro throw: aType _: aValue _: aTb

]
