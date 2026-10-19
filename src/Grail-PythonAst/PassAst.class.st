"https://docs.python.org/3/library/ast.html#ast.Pass

A pass statement.

Example:
>>> print(ast.dump(ast.parse('pass'), indent=4))
Module(
    body=[Pass()])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        PassAst

"
Class {
	#name : 'PassAst',
	#superclass : 'StatementAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
PassAst >> ___emitIRStatementOn___: aBuilder [
	"``pass'' is a no-op; emit nothing.  A body that is only ``pass'' still
	returns None -- ___installIRMethodOn___: appends the trailing return."
	^ self

]

{ #category : 'Grail-IR Codegen' }
PassAst >> ___irEligibleStatementLocals___: localNames [
	^ true

]

{ #category : 'Grail-other' }
PassAst >> printSmalltalkOn: aStream [

	aStream nextPutAll: 'nil.'.

]
