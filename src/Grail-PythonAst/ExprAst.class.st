"https://docs.python.org/3/library/ast.html#ast.Expr

An expression statement (when an expression is used as a statement).

value holds the expression node (often a Call node).

Example:
>>> print(ast.dump(ast.parse('print(x)'), indent=4))
Module(
    body=[
        Expr(value=Call(func=Name(id='print', ctx=Load()), args=[Name(id='x', ctx=Load())]))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        ExprAst(value)

"
Class {
	#name : 'ExprAst',
	#superclass : 'StatementAst',
	#instVars : [
		'value'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
ExprAst >> ___emitIRStatementOn___: aBuilder [
	"Evaluate the expression for effect and discard the result."
	| v |
	v := value ___emitIRValueOn___: aBuilder.
	aBuilder atNode: self.
	aBuilder add: v.
	^ self

]

{ #category : 'Grail-IR Codegen' }
ExprAst >> ___irEligibleStatementLocals___: localNames [
	"An expression statement is emittable when its value is."
	^ value ___irEligibleValueLocals___: localNames

]

{ #category : 'Grail-IR Codegen' }
ExprAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	value ___irReadLocalNamesInto___: aSet locals: localSet.
	^ self

]

{ #category : 'Grail-other' }
ExprAst >> messagePrecendence [

	
	^3

]

{ #category : 'Grail-other' }
ExprAst >> printSmalltalkOn: aStream [

	value printSmalltalkOn: aStream.
	aStream nextPut: $..

]

{ #category : 'Grail-accessing' }
ExprAst >> value [
	"The wrapped expression node.  Read by FunctionDefAst
	___docString___, which recognises a leading bare string literal as the
	def's docstring."

	^ value

]

{ #category : 'Grail-IR Codegen' }
ExprAst >> value: newValue [
	value := newValue

]
