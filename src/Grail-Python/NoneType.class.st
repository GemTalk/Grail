"Python 'NoneType' — the type of the singleton ``None``.

There is exactly one instance, accessible via ``NoneType instance`` (the
class-side singleton accessor) or as the global ``None`` in the Python
dictionary. Constructing a fresh instance is forbidden.

`None` is conceptually distinct from Smalltalk ``nil``. ``nil`` represents
an undefined / unbound variable; ``None`` is an actual Python value with
its own type and identity. Code generated from a Python ``None`` literal
emits a reference to the global ``None``, not ``nil``."
Class {
	#name : 'NoneType',
	#superclass : 'object',
	#classInstVars : [
		'instance'
	],
	#category : 'Grail-Singleton'
}

{ #category : 'Grail-Singleton' }
NoneType class >> ___instance___ [
	"env-0 entry point for the singleton accessor (callable from C/GciPerform)."
	^ self @env1:instance

]

{ #category : 'Grail-Singleton' }
NoneType class >> new [
	"Block env-0 ``NoneType new`` so it cannot bypass the env-1 method that
	raises TypeError. Allocation of the sole instance still goes through
	``basicNew`` from inside ``instance``."
	^ self @env1:new

]

{ #category : 'Grail-Python protocol' }
NoneType >> < other [
	"Smalltalk sort blocks send env-0 #< directly; route to the
	catchable TypeError instead of an uncatchable MNU."
	^ self @env1:__lt__: other

]

{ #category : 'Grail-Python protocol' }
NoneType >> <= other [
	^ self @env1:__le__: other

]

{ #category : 'Grail-Python protocol' }
NoneType >> > other [
	^ self @env1:__gt__: other

]

{ #category : 'Grail-Python protocol' }
NoneType >> >= other [
	^ self @env1:__ge__: other

]

{ #category : 'Grail-Printing' }
NoneType >> printOn: aStream [
	"Smalltalk-side debugging output."
	aStream nextPutAll: 'None'

]
