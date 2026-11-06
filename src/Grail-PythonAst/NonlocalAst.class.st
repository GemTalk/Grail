"https://docs.python.org/3/library/ast.html#ast.Nonlocal

A nonlocal statement.

names is a list of raw strings.

Example:
>>> print(ast.dump(ast.parse('nonlocal x, y'), indent=4))
Module(
    body=[
        Nonlocal(names=['x', 'y'])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        NonlocalAst(names)

"
Class {
	#name : 'NonlocalAst',
	#superclass : 'StatementAst',
	#instVars : [
		'names'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
NonlocalAst >> ___emitIRStatementOn___: aBuilder [
	"Nothing: the declaration has no run-time effect (see the text's emit)."

	^ self

]

{ #category : 'Grail-IR Codegen' }
NonlocalAst >> ___irEligibleStatementLocals___: localNames [
	"``nonlocal x'' inside a nested def (cut 66): a declaration only.  The parser
	strips the declared names from the nested body's variables and writes, so
	its stores and reads of x resolve -- through the closure block's capture --
	to the ENCLOSING scope's temp, which is exactly what the text does (its
	NonlocalAst emits nothing and the block writes the enclosing temp).  Every
	declared name must be an in-scope local, else the def is not emittable.

	Two shapes stay REFUSED, each measured as a regression of the first build:

	``nonlocal __class__'' is the name the parser EXEMPTS from that stripping
	(popScope keeps it local, so the Smalltalk temp is declared and the method
	compiles), because CPython gives it to every method of a class as an
	implicit SHARED cell.  The text answers that by routing the class's
	``__class__'' reads through the cell whenever anything rebinds it
	(ClassDefAst>>___classCellIsRebindable___); the IR has the READ shape
	(NameAst's #dunderClass arm) but no transport for the store, so
	``nonlocal __class__; del __class__'' emptied a fresh local nobody reads
	and left the cell intact -- SuperPreconditionErrorsTestCase's
	empty_class_cell / empty_cell_again / bare_read_after_del, three
	NO-RAISEs where CPython raises.

	A ``del'' of a declared name USED TO BE refused for the enclosing side of
	the same problem: the delete UNBINDS the enclosing binding, and the
	enclosing method's own flow proof has no way to record that -- cut 64's
	___irWriteLocalNamesInto___:locals: reports the nested body's writes as
	BINDINGS, which is the opposite -- so a later read in the enclosing body
	would be emitted bare and answer nil where CPython raises UnboundLocalError
	(UnboundLocalErrorTestCase>>test_nested_nonlocal_del_keeps_guard_and_raises,
	tests/python/unbound_local_guard.py's ``nested_nonlocal_del'').  It is
	admitted now (P1.2, NonlocalAst:del retired) because the enclosing build
	records the unbind the one way that cannot be wrong: every enclosing local
	a nested ``del'' can reach keeps the unbound guard whatever the flow proof
	says (FunctionDefAst>>___irNestedDeletedLocalNames___, unioned into the
	guarded set by ___irMethodBodyCoreOn___:install:; a closure enclosing the
	def already guards all of its own locals)."

	| declared |
	declared := names ifNil: [#()].
	"A CLASS-CELL declaration is emittable without the name being a local: inside
	a method of a method-local class, ``nonlocal x'' names an enclosing
	FUNCTION's local reached past the class, and both halves go through the
	read/setter cell pair ClassDefAst emits at definition time (AssignAst and
	AugAssignAst spell the store).  The owner/del checks below speak about the
	enclosing def's temp, which such a name does not have, so they are skipped
	for it rather than answered wrongly."
	(declared allSatisfy: [:n |
		(localNames includes: n asString)
			or: [self ___enclosingFunctionLocalBeyondClass___: n]])
		ifFalse: [^ false].
	(declared allSatisfy: [:n | self ___enclosingFunctionLocalBeyondClass___: n])
		ifTrue: [^ true].
	^ self ___irNonlocalOwnerDef___ notNil

]

{ #category : 'Grail-IR Codegen' }
NonlocalAst >> ___irNonlocalOwnerDef___ [
	"The innermost enclosing def or lambda -- the scope whose ``del'' of a
	declared name would unbind the ENCLOSING binding.  nil at module scope,
	where ``nonlocal'' is a SyntaxError anyway."

	| node |
	node := parent.
	[node notNil] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [^ node].
		node := node parent].
	^ nil

]

{ #category : 'Grail-IR Codegen' }
NonlocalAst >> ___irRefusalDetail___: localSet [
	"Census: which of the two exits above refused this declaration."

	| declared |
	declared := names ifNil: [#()].

	"A name that is NOT a local of this def may still be emittable: inside a
	method of a METHOD-LOCAL class the declaration names an enclosing
	FUNCTION's local, reached past the class through the read/setter cell pair
	ClassDefAst emits at definition time.  AssignAst and AugAssignAst spell the
	store; the declaration itself still emits nothing."
	(declared allSatisfy: [:n |
		(localSet includes: n asString)
			or: [self ___enclosingFunctionLocalBeyondClass___: n]])
		ifFalse: [^ #'NonlocalAst:notLocal'].
	"Past that test the predicate refuses only for a missing owner, and a
	``nonlocal'' outside every def is the parser's ``nonlocal declaration not
	allowed at module level'': an INVARIANT (P1.3).  The old
	``NonlocalAst:other'' row after it could not be reached."
	^ #'invariant:NonlocalAst-noOwner'

]

{ #category : 'Grail-other' }
NonlocalAst >> names [
	^names

]

{ #category : 'Grail-other' }
NonlocalAst >> names: newValue [
	names := newValue

]

{ #category : 'Grail-other' }
NonlocalAst >> printSmalltalkOn: aStream [
	"Python ``nonlocal x'' is a declaration that ``x'' inside this
	scope refers to the nearest enclosing function's binding (not
	module-global, not local).  Grail's closure mechanism uses
	Smalltalk block lexical capture, which already gives access to
	enclosing-function variables for READS; reassignments inside
	the inner block bind a new local rather than the outer's.  A
	full ``nonlocal'' implementation would track the declared name
	in the AST and route assignments to the outer block's temp.
	For now emit nothing — the declaration is parse-time intent
	only.  Modules with ``nonlocal'' compile cleanly; functions
	that depend on it for mutation share state via a mutable
	container instead.  Werkzeug.routing's converter cache uses
	this pattern."

	"Emit nothing — declaration-only."

]
