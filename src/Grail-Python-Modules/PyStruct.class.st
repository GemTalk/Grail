Class {
	#name : 'PyStruct',
	#superclass : 'Object',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Introspection' }
PyStruct class >> ___pythonValueAttrs___ [
	^ IdentitySet new
		add: #format;
		add: #size;
		yourself

]
