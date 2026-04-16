! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportAst
expectvalue /Class
doit
StatementAst subclass: 'ImportAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ImportAst comment:
'https://docs.python.org/3/library/ast.html#ast.Import

An import statement.

names is a list of alias nodes.

Example:
>>> print(ast.dump(ast.parse(''import x''), indent=4))
Module(
    body=[
        Import(
            names=[alias(name=''x'')])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        ImportAst(names)
'
%

expectvalue /Class
doit
ImportAst category: 'Parser'
%

! ------------------- Remove existing behavior from ImportAst
removeallmethods ImportAst
removeallclassmethods ImportAst

set compile_env: 0

category: 'other'
method: ImportAst
printSmalltalkOn: aStream
	"Emit Smalltalk for `import a, b.c, d as alias`. Each clause becomes
	an assignment from a `___import__:kw:` call on the builtins singleton.
	The varargs fast path is used directly here so that ImportAst does
	not depend on `__import__` being resolvable through the symbol list."

	names doWithIndex: [:each :index |
		| importName targetName nameParts |
		importName := each name.
		targetName := each asName ifNil: [
			(importName includes: $.)
				ifTrue: [
					nameParts := $. split: importName asString.
					nameParts first asSymbol
				]
				ifFalse: [importName]
		].
		aStream
			nextPutAll: targetName;
			nextPutAll: ' := ((Python @env0:at: #builtins) instance) ___import__: { ''';
			nextPutAll: importName asString;
			nextPutAll: ''' } kw: nil.'.
		index < names size ifTrue: [aStream lf].
	].
%
