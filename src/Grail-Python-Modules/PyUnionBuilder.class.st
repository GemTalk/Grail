"CPython's unionbuilder (Objects/unionobject.c:131-200): the members of a
union being built, each kept once.  A member that hashes is a repeat when an
equal member with its hash is already there, as a set's membership asks; one
that does not hash -- CPython clears the error -- is a repeat when an equal
unhashable member is, as a list's.  Errors from == propagate, so ``bt | bt2''
over a metaclass whose __eq__ raises raises too.  The union it builds keeps
which members did not hash, which is what its hash and its == read."
Class {
	#name : 'PyUnionBuilder',
	#superclass : 'Object',
	#instVars : [
		'members',
		'hashed',
		'unhashable'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance Creation' }
PyUnionBuilder class >> empty [

	^ self new initializeEmpty

]

{ #category : 'Grail-Initialization' }
PyUnionBuilder >> initializeEmpty [

	members := OrderedCollection new.
	hashed := OrderedCollection new.
	unhashable := OrderedCollection new

]
