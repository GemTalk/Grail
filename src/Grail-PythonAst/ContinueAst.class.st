"https://docs.python.org/3/library/ast.html#ast.Continue

A continue statement.

Example:
>>> print(ast.dump(ast.parse('continue'), indent=4))
Module(
    body=[Continue()])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        ContinueAst

"
Class {
	#name : 'ContinueAst',
	#superclass : 'StatementAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
ContinueAst >> ___emitIRStatementOn___: aBuilder [
	"``PythonContinue @env0:___signal___.'' -- caught by the per-iteration handler."

	aBuilder atNode: self.
	aBuilder add: (aBuilder
		send: #'___signal___' to: (aBuilder globalNamed: #PythonContinue)
		with: { } env: 0).
	^ self

]

{ #category : 'Grail-IR Codegen' }
ContinueAst >> ___irEligibleStatementLocals___: localNames [
	"Always emittable where it parses -- see BreakAst."

	^ true

]

{ #category : 'Grail-IR Codegen' }
ContinueAst >> ___irFlowBound___: boundIn locals: localSet [
	^ self ___irFlowTerminates___: boundIn locals: localSet

]

{ #category : 'code generation' }
ContinueAst >> printSmalltalkOn: aStream [
	"Signal PythonContinue; the enclosing ForAst (or WhileAst) wraps
	the per-iteration body in `@env0:on: PythonContinue do: [:ex | nil]`,
	so the signal jumps to the next iteration."

	aStream nextPutAll: 'PythonContinue @env0:___signal___.'

]
