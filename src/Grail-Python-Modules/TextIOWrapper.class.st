Class {
	#name : 'TextIOWrapper',
	#superclass : 'FileIO',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Introspection' }
TextIOWrapper class >> ___pythonValueAttrs___ [
	| attrs |
	attrs := super ___pythonValueAttrs___.
	attrs add: #encoding.
	^ attrs

]
