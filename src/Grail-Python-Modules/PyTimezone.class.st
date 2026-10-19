Class {
	#name : 'PyTimezone',
	#superclass : 'PyTzinfo',
	#classVars : [
		'_utc'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Introspection' }
PyTimezone class >> ___pythonValueAttrs___ [
	^ IdentitySet new
		add: #utc;
		yourself

]

{ #category : 'Grail-Private' }
PyTimezone >> _offset: tdelta _name: nameOrNil [
	self dynamicInstVarAt: #_offset put: (tdelta).
	self dynamicInstVarAt: #_name put: (nameOrNil).
	^ self

]
