Class {
	#name : 'StringIO',
	#superclass : 'Object',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Introspection' }
StringIO class >> ___pythonValueAttrs___ [
	"TextIOBase's properties, which a StringIO answers as values: closed,
	encoding, errors, line_buffering and newlines."

	^ IdentitySet new
		add: #closed;
		add: #encoding;
		add: #errors;
		add: #line_buffering;
		add: #newlines;
		yourself

]
