Extension { #name : 'numbers_Integral' }

{ #category : 'Grail-Mixins' }
numbers_Integral class >> ___grailBuiltinPropertyNames___ [
	"The same names, as builtin ``property'' objects: what the class
	__dict__ (object >> ___classDict___) enters for them."

	^ #( #numerator #denominator )

]

{ #category : 'Grail-Mixins' }
numbers_Integral class >> ___grailOwnPropertyNames___ [
	"numerator and denominator are properties in CPython's numbers.Integral;
	see numbers_Real class >> ___grailOwnPropertyNames___."

	^ #( #numerator #denominator )

]

{ #category : 'Grail-Mixins' }
numbers_Integral >> __float__ [
	"PEP 3141 concrete mixin: ``float(int(self))'', overriding Rational's ratio."

	^ float @env1:__new__: (int @env1:__new__: self)

]

{ #category : 'Grail-Mixins' }
numbers_Integral >> __index__ [
	"PEP 3141 concrete mixin: ``int(self)''."

	^ int @env1:__new__: self

]

{ #category : 'Grail-Mixins' }
numbers_Integral >> denominator [
	"PEP 3141 concrete mixin: an integer's denominator is 1."

	^ 1

]

{ #category : 'Grail-Property-ReadOnly' }
numbers_Integral >> denominator: ___1 [
	"A read-only property, as CPython's is: assigning raises AttributeError."

	^ self ___raiseReadOnlyProperty___: 'denominator'

]

{ #category : 'Grail-Mixins' }
numbers_Integral >> numerator [
	"PEP 3141 concrete mixin: an integer is its own numerator, ``+self''."

	^ self __pos__

]

{ #category : 'Grail-Property-ReadOnly' }
numbers_Integral >> numerator: ___1 [
	"A read-only property, as CPython's is: assigning raises AttributeError."

	^ self ___raiseReadOnlyProperty___: 'numerator'

]
