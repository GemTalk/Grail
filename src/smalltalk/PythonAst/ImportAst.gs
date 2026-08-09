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
ImportAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ImportAst
removeallmethods ImportAst
removeallclassmethods ImportAst

set compile_env: 0

category: 'Grail-other'
method: ImportAst
printSmalltalkOn: aStream
	"Emit Smalltalk for `import a, b.c, d as alias`. Each clause becomes
	an assignment from a `___import__:kw:` call on the builtins singleton.
	The varargs fast path is used directly here so that ImportAst does
	not depend on `__import__` being resolvable through the symbol list."

	names doWithIndex: [:each :index |
		| importName targetName nameParts asName isModuleStore |
		importName := each name.
		asName := each asName.
		nameParts := $. split: importName asString.
		targetName := asName ifNil: [nameParts first asSymbol].
		"Phase A: when the binding lands at module scope (we're
		compiling the module body or a top-level def, and the parser
		recorded targetName as a module variable), emit the store as
		``self dynamicInstVarAt: #name put: ...'' so the import lands
		in the module instance's dynamic-instVar storage rather than
		a non-existent Smalltalk temp."
		isModuleStore := CallAst moduleClassBeingCompiled notNil
			and: [CallAst classBeingCompiled isNil
			and: [CallAst moduleVariableNames notNil
			and: [CallAst moduleVariableNames includes: targetName asSymbol]]].
		"`__import__('a.b.c')` returns the TOP-level package (`a`).
		Python's `import a.b.c` statement binds the top-level name
		unaliased (so `a` is bound to the top), while
		`import a.b.c as x` binds the LEAF to the alias.  Mirror
		that here: for the aliased form, follow the dotted path
		after the import to reach the leaf."
		isModuleStore
			ifTrue: [
				aStream
					nextPutAll: 'self @env0:dynamicInstVarAt: #''';
					nextPutAll: targetName;
					nextPutAll: ''' put: ('
			]
			ifFalse: [
				aStream
					nextPutAll: targetName;
					nextPutAll: ' := '
			].
		aStream nextPutAll: (self valueSourceFor: each).
		isModuleStore ifTrue: [aStream nextPut: $)].
		aStream nextPut: $..
		index < names size ifTrue: [aStream lf].
	].
%
method: ImportAst
names
	^names
%
method: ImportAst
names: newValue
	names := newValue
%

category: 'Grail-code generation'
method: ImportAst
valueSourceFor: anAlias
	"Smalltalk source for the VALUE ``import <anAlias>'' binds.

	``import a.b.c`` returns and binds the TOP-level package; only
	``import a.b.c as x`` binds the leaf, reached by walking the dotted
	segments after the import.  Shared by printSmalltalkOn: and by the
	class-body attribute path so the two cannot drift."

	| importName nameParts stream walks |
	importName := anAlias name asString.
	nameParts := $. split: importName.
	walks := anAlias asName notNil and: [nameParts size > 1].
	stream := WriteStream on: String new.
	walks ifTrue: [stream nextPut: $(].
	stream
		nextPutAll: '((Python @env0:at: #builtins) instance) ___import__: { ''';
		nextPutAll: importName;
		nextPutAll: ''' } kw: nil'.
	walks ifTrue: [
		stream nextPut: $).
		2 to: nameParts size do: [:i |
			stream nextPutAll: ' @env1:'; nextPutAll: (nameParts at: i)]].
	^ stream contents
%

category: 'Grail-Class Body'
method: ImportAst
classBodyAttributePairs
	"``name -> value'' pairs for an import written in a CLASS BODY.

	CPython executes a class body as a namespace: ``import json'' there
	binds ``json'' in the class namespace, so it becomes a class attribute
	(werkzeug's EnvironBuilder relies on exactly this, then ``del json''
	once it has taken json.dumps).  Grail's class-attribute pipeline is
	driven by name -> value-AST pairs, so wrap the importer call."

	^ names collect: [:each |
		(self boundNameFor: each) -> (RawSmalltalkAst source: (self valueSourceFor: each))]
%

category: 'Grail-Class Body'
method: ImportAst
boundNameFor: anAlias
	"The single name ``import <anAlias>'' binds: the alias if given,
	otherwise the TOP-level package of a dotted path."

	anAlias asName ifNotNil: [:a | ^ a asSymbol].
	^ ($. split: anAlias name asString) first asSymbol
%

category: 'Grail-Class Body'
method: ImportAst
___boundTargetNames___
	"Every name this import binds -- the same shape AssignAst answers, so
	ClassDefAst can record binding positions for imports too.  Without it
	a later class-body statement does not see the imported name as bound
	and falls back to module scope."

	^ names collect: [:each | self boundNameFor: each]
%
