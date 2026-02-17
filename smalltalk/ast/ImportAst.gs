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
			nextPutAll: ' := __import__ value: { ''';
			nextPutAll: importName asString;
			nextPutAll: ''' } value: nil.'.
		index < names size ifTrue: [aStream lf].
	].
%
