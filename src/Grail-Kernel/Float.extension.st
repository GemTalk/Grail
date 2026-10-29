Extension { #name : 'Float' }

{ #category : 'Grail-Attribute Access' }
Float class >> ___grailUnwritableAttributes___ [
	"float's getters -- see Object class >> ___grailUnwritableAttributes___."

	^ #('real' 'imag')

]

{ #category : 'Grail-Attribute Access' }
Float class >> ___grailUnwritableOwnerName___ [

	^ 'float'

]

{ #category : 'Grail-Python Attribute Hook' }
Float class >> ___pythonValueAttrs___ [
	"real/imag are CPython float properties (value attributes), not
	methods -- see int's hook."

	^ IdentitySet new
		add: #real;
		add: #imag;
		yourself

]
