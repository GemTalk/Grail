Extension { #name : 'Float' }

{ #category : 'Grail-Python Attribute Hook' }
Float class >> ___pythonValueAttrs___ [
	"real/imag are CPython float properties (value attributes), not
	methods -- see int's hook."

	^ IdentitySet new
		add: #real;
		add: #imag;
		yourself

]
