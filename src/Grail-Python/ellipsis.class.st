"Python 'ellipsis' — the type of the singleton ``Ellipsis``.

There is exactly one instance, reached via ``ellipsis instance' (the class-side
singleton accessor) or as the global ``Ellipsis' in the Python dictionary.  A
``...' literal compiles to that global — see ConstantAst >> printSmalltalkOn:.

The Smalltalk class name is LOWERCASE on purpose: ``type(...).__name__' must
answer 'ellipsis', and for a Python class in the Python dictionary Grail
reports the Smalltalk name verbatim.  CPython does not expose the type as a
builtin name either (``types.EllipsisType' is the public spelling), so nothing
is gained by capitalising it and the round trip through __name__ would be lost."
Class {
	#name : 'ellipsis',
	#superclass : 'object',
	#classInstVars : [
		'instance'
	],
	#category : 'Grail-Singleton'
}

{ #category : 'Grail-Singleton' }
ellipsis class >> ___instance___ [
	"env-0 entry point for the singleton accessor (callable from C/GciPerform)."
	^ self @env1:instance

]

{ #category : 'Grail-Python protocol' }
ellipsis >> < other [
	"Smalltalk sort blocks send env-0 #< directly; route to the catchable
	TypeError instead of an uncatchable MNU.  Same reason NoneType carries these:
	a heterogeneous list containing ``...'' is exactly what CPython's dir()
	refuses to sort, and the refusal has to be a Python exception."
	^ self @env1:__lt__: other

]

{ #category : 'Grail-Python protocol' }
ellipsis >> <= other [
	^ self @env1:__le__: other

]

{ #category : 'Grail-Python protocol' }
ellipsis >> > other [
	^ self @env1:__gt__: other

]

{ #category : 'Grail-Python protocol' }
ellipsis >> >= other [
	^ self @env1:__ge__: other

]

{ #category : 'Grail-Printing' }
ellipsis >> printOn: aStream [
	"Smalltalk-side debugging output."
	aStream nextPutAll: 'Ellipsis'

]
