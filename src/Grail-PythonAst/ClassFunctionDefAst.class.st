"Grail-specific subclass of FunctionDefAst for class methods.

This is not a standard Python AST node, but a Grail implementation detail for distinguishing class methods (decorated with @classmethod) from regular functions and instance methods.

Inherits all fields from FunctionDefAst:
- name is the function name as a raw string
- args is an arguments node
- body is a list of nodes
- decorator_list is a list of decorator expressions
- returns is the return annotation (can be None)

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        FunctionDefAst(name args body decorator_list returns type_comment)
          ClassFunctionDefAst

"
Class {
	#name : 'ClassFunctionDefAst',
	#superclass : 'FunctionDefAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-code generation' }
ClassFunctionDefAst >> ___decoratorBaseIsClassMethod___ [
	^ true

]

{ #category : 'Grail-code generation' }
ClassFunctionDefAst >> ___decoratorBaseIsClassSide___ [
	"A @classmethod compiles onto the metaclass, with ``cls'' as the Smalltalk
	receiver -- so a class-body decorator's base must be a BoundMethod on the
	class, not an instance-side UnboundMethod."

	^ true

]
