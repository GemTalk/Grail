"A built-in type's class method as its type's __dict__ holds it -- CPython's
``classmethod_descriptor'', ``dict.__dict__['fromkeys']'' or
``int.__dict__['from_bytes']'' (Objects/descrobject.c).  It binds only to its
type or a subtype, is callable with the class as the first argument, and
reprs as ``<method 'fromkeys' of 'dict' objects>''.

Grail answered a classmethod wrapping the Smalltalk method, which bound to
anything -- ``descr.__get__(42)'' answered a method of 42 -- was not callable,
and printed the Smalltalk class: ``<classmethod(<method 'fromkeys' of
'KeyValueDictionary class' objects>)>''."
Class {
	#name : 'PyClassMethodDescriptor',
	#superclass : 'Object',
	#instVars : [
		'type',
		'method'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
PyClassMethodDescriptor class >> ___pythonValueAttrs___ [
	^ IdentitySet new
		add: #'__doc__';
		add: #'__name__';
		add: #'__objclass__';
		add: #'__qualname__';
		yourself

]

{ #category : 'Grail-Instance Creation' }
PyClassMethodDescriptor class >> type: aType method: anUnboundMethod [
	"The class method anUnboundMethod -- a class-side method of aType's
	implementation -- as aType's __dict__ holds it."

	^ self new initializeType: aType method: anUnboundMethod

]

{ #category : 'Grail-Initialization' }
PyClassMethodDescriptor >> initializeType: aType method: anUnboundMethod [

	type := aType.
	method := anUnboundMethod

]
