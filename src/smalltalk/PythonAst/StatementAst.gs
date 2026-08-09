! ------------------- Superclass check
run
AbstractLocationNode ifNil: [self error: 'AbstractLocationNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for StatementAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'StatementAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
StatementAst comment:
'https://docs.python.org/3/library/ast.html#ast.stmt

Statement base class.

This is an abstract base class for all statement nodes in the Python AST. Statements are nodes that can appear in the body of a module, function, class, or control structure.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
'
%

expectvalue /Class
doit
StatementAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from StatementAst
removeallmethods StatementAst
removeallclassmethods StatementAst

set compile_env: 0

category: 'Grail-Class Body'
method: StatementAst
___boundTargetNames___
	"Every name this statement binds in the enclosing namespace, as Symbols.

	A statement ANNOUNCES what it binds; the parent decides what that
	position means.  ClassDefAst's class-body scans consult this to build
	source-order name resolution, so a new binding form becomes visible to
	later siblings by implementing this one method -- it does not have to be
	added to a list of isKindOf: tests at every scan.

	Most statements bind nothing, hence the empty default."

	^ #()
%

category: 'Grail-Class Body'
method: StatementAst
classBodyAttributePairs
	"``name -> valueAst'' pairs this statement contributes when it appears
	in a CLASS BODY, in source order.

	CPython executes a class body as a namespace, so every binding form
	there produces a class attribute.  Grail compiles the body
	STRUCTURALLY, so each form must say which attributes it yields; the
	parent (ClassDefAst >> classBodyAttributes) collects them and applies
	whatever cross-statement rules it owns.

	Statements that bind no attribute -- including ``def'' and a nested
	``class'', which bind a NAME but contribute no attribute value -- answer
	the empty default."

	^ #()
%
