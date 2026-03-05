! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportFromAst
expectvalue /Class
doit
StatementAst subclass: 'ImportFromAst'
  instVarNames: #( module names level)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ImportFromAst comment:
'https://docs.python.org/3/library/ast.html#ast.ImportFrom

A from x import y statement.

module is a raw string of the ''from'' name, without any leading dots, or None for statements such as from . import foo.
names is a list of alias nodes.
level is an integer holding the level of the relative import (0 means absolute import).

Example:
>>> print(ast.dump(ast.parse(''from y import x, w as z''), indent=4))
Module(
    body=[
        ImportFrom(
            module=''y'',
            names=[alias(name=''x''), alias(name=''w'', asname=''z'')],
            level=0)])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        ImportFromAst(module names level)
'
%

expectvalue /Class
doit
ImportFromAst category: 'Parser'
%

! ------------------- Remove existing behavior from ImportFromAst
removeallmethods ImportFromAst
removeallclassmethods ImportFromAst
set compile_env: 0

category: 'other'
method: ImportFromAst
printSmalltalkOn: aStream
	"Generate Smalltalk for 'from module import name1, name2 as alias2, ...'.

	Each imported name is resolved by importing the module via __import__
	and then accessing the attribute on the returned module object."

	names doWithIndex: [:each :index |
		| targetName |
		targetName := each asName ifNil: [each name].
		aStream
			nextPutAll: targetName;
			nextPutAll: ' := (__import__ value: { ''';
			nextPutAll: module asString;
			nextPutAll: ''' } value: nil) ';
			nextPutAll: each name asString;
			nextPutAll: '.'.
		index < names size ifTrue: [aStream lf].
	].
%
