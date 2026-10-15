"Internal marker: wraps a value an async generator body handed over with
``yield', so the __anext__ driver can tell it from an ``await' suspension
travelling through on its way to the event loop.

Never visible to Python code -- the driver unwraps it and answers the value.

"
Class {
	#name : 'PyAsyncYield',
	#superclass : 'Object',
	#instVars : [
		'value'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance Creation' }
PyAsyncYield class >> ___value___: aValue [
	"Wrap a yielded value.  The only constructor, and the only place a
	PyAsyncYield is ever made -- which is what makes the tag unforgeable."

	^ self new ___setValue___: aValue

]

{ #category : 'Grail-Private' }
PyAsyncYield >> ___setValue___: aValue [
	value := aValue.
	^ self

]

{ #category : 'Grail-Accessing' }
PyAsyncYield >> ___value___ [
	"The value the body yielded."

	^ value

]
