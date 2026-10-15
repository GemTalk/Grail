"https://docs.python.org/3/library/ast.html#ast.Global

A global statement.

names is a list of raw strings.

Example:
>>> print(ast.dump(ast.parse('global x, y'), indent=4))
Module(
    body=[
        Global(names=['x', 'y'])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        GlobalAst(names)

"
Class {
	#name : 'GlobalAst',
	#superclass : 'StatementAst',
	#instVars : [
		'names'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
GlobalAst >> ___emitIRStatementOn___: aBuilder [
	^ self

]

{ #category : 'Grail-IR Codegen' }
GlobalAst >> ___irEligibleStatementLocals___: localNames [
	"A declaration, not a statement: the text emits nothing for it (the parser
	already routed the names to the module scope), and so does the IR (cut 69)."

	^ true

]

{ #category : 'Grail-other' }
GlobalAst >> names [
	^names

]

{ #category : 'Grail-other' }
GlobalAst >> names: newValue [
	names := newValue

]

{ #category : 'Grail-other' }
GlobalAst >> printSmalltalkOn: aStream [
	"Python ``global x'' is a declaration, not a statement that
	produces runtime code — it tells the parser that assignments to
	``x'' inside the function update the module global rather than
	create a local.

	The semantics are realised entirely at parse time (PythonParser >>
	parseGlobal + popScope): each declared name is stripped from the
	enclosing function's local variable / write sets and registered in
	the module scope, so NameAst codegen resolves its reads and writes
	through the module instance's dynamicInstVarAt: storage.  The
	declaration statement itself therefore emits nothing."

	"Emit nothing — the statement is a parse-time declaration only."

]
