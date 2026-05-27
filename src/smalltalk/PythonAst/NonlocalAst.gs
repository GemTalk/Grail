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
