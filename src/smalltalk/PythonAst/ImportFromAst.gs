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
ImportFromAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ImportFromAst
removeallmethods ImportFromAst
removeallclassmethods ImportFromAst
set compile_env: 0

category: 'Grail-other'
method: ImportFromAst
printSmalltalkOn: aStream
	"Generate Smalltalk for 'from module import name1, name2 as alias2, ...'.

	Each imported name is resolved by importing the module via the
	`___import__:kw:` varargs selector on builtins, and then accessing
	the attribute on the returned module object.

	Callable attributes on module classes no longer have unary getters
	(the unary selector is reserved for the keyword-form method). When
	the imported name is a callable on a module, emit a BoundMethod
	wrapper instead of a bare unary send. For stored attributes, the
	unary getter still exists, so the bare send works."

	| moduleClass |
	moduleClass := CallAst resolveModuleClassForName: module asSymbol.

	names doWithIndex: [:each :index |
		| targetName attrName |
		targetName := each asName ifNil: [each name].
		attrName := each name asString.
		aStream nextPutAll: targetName.

		(moduleClass notNil and: [NameAst isFastPathBuiltinName: attrName asSymbol on: moduleClass]) ifTrue: [
			"Callable on a converted module — wrap in BoundMethod."
			aStream
				nextPutAll: ' := (BoundMethod receiver: (((Python @env0:at: #builtins) instance) ___import__: { ''';
				nextPutAll: module asString;
				nextPutAll: ''' } kw: nil) selector: #';
				nextPutAll: attrName;
				nextPutAll: ').'.
		] ifFalse: [
			"Stored attribute or unconverted module — use bare unary send."
			aStream
				nextPutAll: ' := (((Python @env0:at: #builtins) instance) ___import__: { ''';
				nextPutAll: module asString;
				nextPutAll: ''' } kw: nil) ';
				nextPutAll: attrName;
				nextPutAll: '.'.
		].
		index < names size ifTrue: [aStream lf].
	].
%
