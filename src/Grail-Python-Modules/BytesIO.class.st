Class {
	#name : 'BytesIO',
	#superclass : 'Object',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Introspection' }
BytesIO class >> ___pythonValueAttrs___ [
	^ IdentitySet new
		add: #closed;
		yourself

]
