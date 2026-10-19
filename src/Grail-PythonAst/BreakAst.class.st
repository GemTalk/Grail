"https://docs.python.org/3/library/ast.html#ast.Break

A break statement.

Example:
>>> print(ast.dump(ast.parse('break'), indent=4))
Module(
    body=[Break()])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        BreakAst

"
Class {
	#name : 'BreakAst',
	#superclass : 'StatementAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
BreakAst >> ___emitIRStatementOn___: aBuilder [
	"``PythonBreak @env0:___signal___.'' -- caught by the loop's outer handler."

	aBuilder atNode: self.
	aBuilder add: (aBuilder
		send: #'___signal___' to: (aBuilder globalNamed: #PythonBreak)
		with: { } env: 0).
	^ self

]

{ #category : 'Grail-IR Codegen' }
BreakAst >> ___irEligibleStatementLocals___: localNames [
	"Always emittable where it parses: the parser only accepts ``break'' inside
	a loop, and the enclosing loop's on:do: handler is part of its own emit."

	^ true

]

{ #category : 'Grail-IR Codegen' }
BreakAst >> ___irFlowBound___: boundIn locals: localSet [
	"A break leaves the loop with boundIn in force: recorded for the loop's
	after-set (cut 71, ``while True'')."
	AbstractNode ___irRecordBreakSet___: boundIn.
	^ self ___irFlowTerminates___: boundIn locals: localSet

]

{ #category : 'code generation' }
BreakAst >> printSmalltalkOn: aStream [
	"Signal PythonBreak; the enclosing ForAst (or WhileAst) wraps the
	whileTrue loop in an `@env0:on: PythonBreak do: [:ex | nil]`
	handler, so the signal cleanly exits the innermost loop."

	aStream nextPutAll: 'PythonBreak @env0:___signal___.'

]
