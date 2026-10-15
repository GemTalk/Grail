Class {
	#name : 'PyCoroutineWrapper',
	#superclass : 'Object',
	#instVars : [
		'coro'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance Creation' }
PyCoroutineWrapper class >> ___on___: aCoroutine [
	^ self @env0:new @env0:___setCoro___: aCoroutine

]

{ #category : 'Grail-Private' }
PyCoroutineWrapper >> ___setCoro___: aCoroutine [
	coro := aCoroutine

]
