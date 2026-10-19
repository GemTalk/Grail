"Python 'NotImplementedType' — the type of the singleton ``NotImplemented``.

There is exactly one instance, reached via ``NotImplementedType instance' (the
class-side singleton accessor) or as the global ``NotImplemented' in the Python
dictionary.

Returned by a binary dunder that declines its operand, so the operator layer can
reflect to the other side and then raise TypeError.  It is NOT a Boolean and must
never be treated as one: ``__bool__' raises, as in CPython."
Class {
	#name : 'NotImplementedType',
	#superclass : 'object',
	#classInstVars : [
		'instance'
	],
	#category : 'Grail-Singleton'
}

{ #category : 'Grail-Singleton' }
NotImplementedType class >> ___instance___ [
	"env-0 entry point for the singleton accessor (callable from C/GciPerform)."
	^ self @env1:instance

]

{ #category : 'Grail-Python protocol' }
NotImplementedType >> < other [
	"Smalltalk sort blocks send env-0 #< directly; route to the catchable
	TypeError instead of an uncatchable MNU.  Same reason NoneType carries these."
	^ self @env1:__lt__: other

]

{ #category : 'Grail-Python protocol' }
NotImplementedType >> <= other [
	^ self @env1:__le__: other

]

{ #category : 'Grail-Python protocol' }
NotImplementedType >> > other [
	^ self @env1:__gt__: other

]

{ #category : 'Grail-Python protocol' }
NotImplementedType >> >= other [
	^ self @env1:__ge__: other

]

{ #category : 'Grail-Printing' }
NotImplementedType >> printOn: aStream [
	"Smalltalk-side debugging output."
	aStream nextPutAll: 'NotImplemented'

]
