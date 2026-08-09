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

category: 'Grail-code generation'
method: StatementAst
___importBindsAtModuleScope___: aSymbol
	"True when a name bound by an IMPORT in this statement lands in the
	module instance's dynamic-instVar storage rather than in a Smalltalk
	temp.

	Same rule AssignAst >> isModuleScopeStoreTarget: applies to an ordinary
	assignment, and for the same reason: an import IS a binding, so it has to
	agree with how NameAst will later READ the name.  Imports used to test
	only ``is this name a module variable'', which is true of a function-local
	import whenever the module ALSO imports that name -- so the write went to
	the module while the read looked at the function's temp, and the name came
	back unbound:

	    import os.path
	    def f():
	        import os.path      # stored on the module...
	        return os.path.sep  # ...read as a local -> UnboundLocalError

	Shared by ImportAst and ImportFromAst so the two cannot drift."

	CallAst moduleClassBeingCompiled ifNil: [^ false].
	"``global x'' in the nearest enclosing function forces the module route,
	even inside a class method -- Python: the declaration binds the name to
	the module for that whole scope."
	(self ___nearestEnclosingFunctionDeclaresGlobal___: aSymbol) ifTrue: [^ true].
	CallAst classBeingCompiled ifNotNil: [^ false].
	CallAst moduleVariableNames ifNil: [^ false].
	(CallAst moduleVariableNames includes: aSymbol) ifFalse: [^ false].
	"A binding anywhere in an enclosing function SHADOWS the module global."
	(self ___pythonLocalInEnclosingFunctions___: aSymbol) ifTrue: [^ false].
	^ true
%

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
