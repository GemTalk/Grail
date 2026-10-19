Class {
	#name : 'StaticFunctionDefAst',
	#superclass : 'FunctionDefAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-code generation' }
StaticFunctionDefAst >> ___decoratorBaseIsClassSide___ [
	"A @staticmethod compiles onto the metaclass, taking no implicit first
	argument -- so a class-body decorator's base must be a BoundMethod on the
	class, whose receiver the method simply ignores."

	^ true

]
