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
		| importName targetName nameParts asName needsClose |
		importName := each name.
		asName := each asName.
		nameParts := $. split: importName asString.
		targetName := asName ifNil: [nameParts first asSymbol].
		"Where the binding LANDS -- module dynamic-instVar storage, a
		class-body definitional store, or a plain temp -- is
		printImportBindingOpenOn:name:'s decision; see there for why a
		class body has to be one of the three."
		"`__import__('a.b.c')` returns the TOP-level package (`a`).
		Python's `import a.b.c` statement binds the top-level name
		unaliased (so `a` is bound to the top), while
		`import a.b.c as x` binds the LEAF to the alias.  Mirror
		that here: for the aliased form, follow the dotted path
		after the import to reach the leaf."
		needsClose := self printImportBindingOpenOn: aStream name: targetName.
		aStream nextPutAll: (self valueSourceFor: each).
		needsClose ifTrue: [aStream nextPut: $)].
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

category: 'Grail-IR Codegen'
method: ImportAst
___irBoundName___
	"The local ONE alias binds, as a String -- see ___irBoundNameFor___:.  nil
	for a multi-alias statement; ___irBoundNames___ is the general form."

	names size == 1 ifFalse: [^ nil].
	^ self ___irBoundNameFor___: names first
%

category: 'Grail-IR Codegen'
method: ImportAst
___irEligibleStatementLocals___: localNames
	"An import inside a def whose every bound name is a body local (the parser
	declares each as a write, so it is): printImportBindingOpenOn:name:'s plain
	``name := ...'' branch, once per alias.  A module-scope or class-body
	binding never occurs in an IR-eligible def."

	names isEmpty ifTrue: [^ false].
	^ self ___irBoundNames___ allSatisfy: [:n | localNames includes: n]
%

category: 'Grail-IR Codegen'
method: ImportAst
___emitIRStatementOn___: aBuilder
	"printSmalltalkOn: + valueSourceFor:'s shape, one statement per alias:
	  name := (((Python @env0:at: #builtins) instance) ___import__: { 'a.b.c' } kw: nil)
	and, for ``import a.b.c as x'', the leaf reached by walking the dotted
	segments after the import: ``(...) @env1:b @env1:c''.  The varargs fast
	path is used directly so the import does not depend on ``__import__''
	being resolvable through the symbol list."

	names do: [:alias |
		| v parts |
		aBuilder at: self beginPosition.
		v := aBuilder
			send: #'___import__:kw:' to: (self ___emitIRBuiltinsInstanceOn___: aBuilder)
			with: { aBuilder arrayOf: { aBuilder obj: alias name asString }. aBuilder nilLit }
			env: 1.
		parts := $. split: alias name asString.
		(alias asName notNil and: [parts size > 1]) ifTrue: [
			2 to: parts size do: [:i |
				v := aBuilder send: (parts at: i) asSymbol to: v with: { } env: 1]].
		aBuilder at: self beginPosition.
		aBuilder add: (aBuilder
			assign: (aBuilder leafFor: (self ___irBoundNameFor___: alias) asSymbol)
			from: v)].
	^ self
%

category: 'Grail-IR Codegen'
method: ImportAst
___irWriteLocalNamesInto___: aSet locals: localSet
	self ___irBoundNames___ do: [:n |
		(localSet includes: n) ifTrue: [aSet add: n]].
	^ self
%

category: 'Grail-IR Codegen'
method: ImportAst
___irTopLevelWriteNames___: localSet
	"Every alias binds its name when the statement completes."

	^ self ___irBoundNames___ select: [:n | localSet includes: n]
%

category: 'Grail-IR Codegen'
method: ImportAst
___irBoundNameFor___: anAlias
	"The local anAlias binds, as a String: ``import a.b.c'' binds the TOP name
	``a''; ``import a.b.c as x'' binds ``x'' -- the parser's declareWrite: rule."

	anAlias asName ifNotNil: [:n | ^ n asString].
	^ (($. split: anAlias name asString) first) asString
%

category: 'Grail-IR Codegen'
method: ImportAst
___irBoundNames___
	"The locals this statement binds, one per alias, as Strings."

	^ names collect: [:a | self ___irBoundNameFor___: a]
%
