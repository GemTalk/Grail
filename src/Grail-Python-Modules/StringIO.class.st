Class {
	#name : 'StringIO',
	#superclass : 'Object',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Introspection' }
StringIO class >> ___pythonValueAttrs___ [
	^ IdentitySet new
		add: #closed;
		yourself

]
