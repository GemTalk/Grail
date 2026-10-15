Extension { #name : 'numbers_Real' }

{ #category : 'Grail-Mixins' }
numbers_Real class >> ___grailBuiltinPropertyNames___ [
	"The same names, as builtin ``property'' objects: what the class
	__dict__ (object >> ___classDict___) enters for them."

	^ #( #real #imag )

]

{ #category : 'Grail-Mixins' }
numbers_Real class >> ___grailOwnPropertyNames___ [
	"real and imag are properties in CPython's numbers.Real, so a class read
	(``numbers.Real.real'', ``vars(numbers.Real)'') answers a property object,
	as it does for a Python class's own @property (ClassDefAst emits the same
	record)."

	^ #( #real #imag )

]

{ #category : 'Grail-Mixins' }
numbers_Real >> __complex__ [
	"PEP 3141 concrete mixin: ``complex(float(self))''."

	^ complex @env1:__new__: (float @env1:__new__: self)

]

{ #category : 'Grail-Mixins' }
numbers_Real >> __divmod__: other [
	"PEP 3141 concrete mixin: ``(self // other, self % other)''."

	^ tuple @env0:withAll: { self ___binOpFloorDiv___: other. self ___binOpMod___: other }

]

{ #category : 'Grail-Mixins' }
numbers_Real >> __rdivmod__: other [
	"PEP 3141 concrete mixin: ``(other // self, other % self)''."

	^ tuple @env0:withAll: { other ___binOpFloorDiv___: self. other ___binOpMod___: self }

]

{ #category : 'Grail-Mixins' }
numbers_Real >> conjugate [
	"PEP 3141 concrete mixin: a real number is its own conjugate, ``+self''."

	^ self __pos__

]

{ #category : 'Grail-Mixins' }
numbers_Real >> imag [
	"PEP 3141 concrete mixin: a real number's imaginary part is 0."

	^ 0

]

{ #category : 'Grail-Property-ReadOnly' }
numbers_Real >> imag: ___1 [
	"A read-only property, as CPython's is: assigning raises AttributeError."

	^ self ___raiseReadOnlyProperty___: 'imag'

]

{ #category : 'Grail-Mixins' }
numbers_Real >> real [
	"PEP 3141 concrete mixin: a real number is its own real part, ``+self''."

	^ self __pos__

]

{ #category : 'Grail-Property-ReadOnly' }
numbers_Real >> real: ___1 [
	"A read-only property, as CPython's is: assigning raises AttributeError."

	^ self ___raiseReadOnlyProperty___: 'real'

]
