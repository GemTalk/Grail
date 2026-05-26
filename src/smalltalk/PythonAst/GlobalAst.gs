! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for GlobalAst
expectvalue /Class
doit
StatementAst subclass: 'GlobalAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
GlobalAst comment:
'https://docs.python.org/3/library/ast.html#ast.Global

A global statement.

names is a list of raw strings.

Example:
>>> print(ast.dump(ast.parse(''global x, y''), indent=4))
Module(
    body=[
        Global(names=[''x'', ''y''])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        GlobalAst(names)
'
%

expectvalue /Class
doit
GlobalAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from GlobalAst
removeallmethods GlobalAst
removeallclassmethods GlobalAst

set compile_env: 0

category: 'Grail-other'
method: GlobalAst
printSmalltalkOn: aStream
	"Python ``global x'' is a declaration, not a statement that
	produces runtime code — it tells the parser that assignments to
	``x'' inside the function should update the module global rather
	than create a local.

	Grail's parser currently records every assignment as a body-
	local; the ``global'' declaration is dropped on the floor at
	parse time.  Functions that ``global x; x = ...; return x'' will
	read the local (UnboundLocalError before assignment) rather than
	the module slot — but the def itself compiles cleanly, which is
	what import probes need.  Wiring full ``global'' semantics is a
	parser change (skip declareWrite for global-declared names and
	route their NameAst stores through dynamicInstVarAt:put: on the
	module instance) — left for a follow-up branch."

	"Emit nothing — the statement is a parse-time declaration only."
%
