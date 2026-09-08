! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for NonlocalAst
expectvalue /Class
doit
StatementAst subclass: 'NonlocalAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
NonlocalAst comment:
'https://docs.python.org/3/library/ast.html#ast.Nonlocal

A nonlocal statement.

names is a list of raw strings.

Example:
>>> print(ast.dump(ast.parse(''nonlocal x, y''), indent=4))
Module(
    body=[
        Nonlocal(names=[''x'', ''y''])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        NonlocalAst(names)
'
%

expectvalue /Class
doit
NonlocalAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from NonlocalAst
removeallmethods NonlocalAst
removeallclassmethods NonlocalAst

set compile_env: 0

category: 'Grail-other'
method: NonlocalAst
printSmalltalkOn: aStream
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
%
method: NonlocalAst
names
	^names
%
method: NonlocalAst
names: newValue
	names := newValue
%

category: 'Grail-IR Codegen'
method: NonlocalAst
___irEligibleStatementLocals___: localNames
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

	A ``del'' of a declared name is refused for the enclosing side of the same
	problem: the delete UNBINDS the enclosing binding, and the enclosing
	method's own flow proof has no way to record that -- cut 64's
	___irWriteLocalNamesInto___:locals: reports the nested body's writes as
	BINDINGS, which is the opposite -- so a later read in the enclosing body is
	emitted bare and answers nil where CPython raises UnboundLocalError
	(UnboundLocalErrorTestCase>>test_nested_nonlocal_del_keeps_guard_and_raises,
	tests/python/unbound_local_guard.py's ``nested_nonlocal_del'')."

	| declared owner deleted |
	declared := names ifNil: [#()].
	(declared anySatisfy: [:n | n asString = '__class__']) ifTrue: [^ false].
	(declared allSatisfy: [:n | localNames includes: n asString]) ifFalse: [^ false].
	owner := self ___irNonlocalOwnerDef___.
	owner isNil ifTrue: [^ false].
	deleted := owner deletedNamesInSubtree.
	^ (declared anySatisfy: [:n | deleted includes: n asSymbol]) not
%

category: 'Grail-IR Codegen'
method: NonlocalAst
___irNonlocalOwnerDef___
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
%

category: 'Grail-IR Codegen'
method: NonlocalAst
___irRefusalDetail___: localSet
	"Census: which of the three exits above refused this declaration."

	| declared owner |
	declared := names ifNil: [#()].
	(declared anySatisfy: [:n | n asString = '__class__'])
		ifTrue: [^ #'NonlocalAst:classCell'].
	(declared allSatisfy: [:n | localSet includes: n asString])
		ifFalse: [^ #'NonlocalAst:notLocal'].
	owner := self ___irNonlocalOwnerDef___.
	owner isNil ifTrue: [^ #'NonlocalAst:noOwner'].
	(declared anySatisfy: [:n | owner deletedNamesInSubtree includes: n asSymbol])
		ifTrue: [^ #'NonlocalAst:del'].
	^ #'NonlocalAst:other'
%

category: 'Grail-IR Codegen'
method: NonlocalAst
___emitIRStatementOn___: aBuilder
	"Nothing: the declaration has no run-time effect (see the text's emit)."

	^ self
%
