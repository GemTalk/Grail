! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportFromAst
expectvalue /Class
doit
StatementAst subclass: 'ImportFromAst'
  instVarNames: #( module names level wasStarImport)
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

category: 'Grail-accessing'
method: ImportFromAst
names
	^names
%

category: 'Grail-accessing'
method: ImportFromAst
names: anArray
	"Used by importlib.expandStarImports: to rewrite a `from X import *`
	clause into an explicit list of aliases once X's exported names are
	known."

	names := anArray
%

category: 'Grail-accessing'
method: ImportFromAst
wasStarImport

	^wasStarImport ifNil: [false]
%

category: 'Grail-accessing'
method: ImportFromAst
wasStarImport: aBoolean
	"Set by importlib.expandStarImports: on any statement that
	was originally a star import (`from X import *`), regardless
	of whether the parse-time expansion succeeded.  Codegen then
	emits an additional runtime merge step that copies any
	non-statically-declared public attributes from the source
	module — picks up dynamic names that parse-time analysis
	can't see (e.g. opcodes injected via globals().update())."

	wasStarImport := aBoolean
%

category: 'Grail-other'
method: ImportFromAst
resolvedModuleName
	"Return the absolute module name for this `from` import.
	For absolute imports (level=0) this is just `module`.
	For relative imports (level≥1) we walk the parent chain to find the
	enclosing ModuleAst, derive the importing module's package, and
	resolve the relative target against it.

	Examples (with the importer at module name `re._parser`):
	  `from ._constants import X`  (level=1, module='_constants')
	    → 're._constants'
	  `from . import _constants`   (level=1, module=nil)
	    → 're'
	  `from ..foo import X`        (level=2, module='foo')
	    → 'foo' (parent package of `re`)"

	| node modAst importerName parts packageParts effectiveLevel |
	(level isNil or: [level = 0]) ifTrue: [^ module asString].
	node := parent.
	[node notNil and: [(node isKindOf: ModuleAst) not]] whileTrue: [
		node := node parent
	].
	modAst := node.
	importerName := modAst isNil ifTrue: [''] ifFalse: [modAst name asString].
	parts := $. split: importerName.
	"For an importing module `a.b.c`, the package is `a.b`. `level=1`
	resolves against the package; `level=2` strips one more component.
	BUT if the importer is itself a package's __init__.py, its full
	name IS the package — don't strip the last component for
	level=1.  This matters for `from . import X` inside `re/__init__.py`
	(importer name is `re`, the package is `re`, the resolved
	target is `re.X`)."
	packageParts := (modAst notNil and: [modAst isPackage])
		ifTrue: [parts copy]
		ifFalse: [parts copyFrom: 1 to: ((parts size - 1) max: 0)].
	effectiveLevel := level - 1.
	[effectiveLevel > 0 and: [packageParts notEmpty]] whileTrue: [
		packageParts := packageParts copyFrom: 1 to: packageParts size - 1.
		effectiveLevel := effectiveLevel - 1.
	].
	module isNil
		ifTrue: [^ '.' join: packageParts]
		ifFalse: [
			packageParts isEmpty
				ifTrue: [^ module asString]
				ifFalse: [^ ('.' join: packageParts) , '.' , module asString]
		]
%

category: 'Grail-other'
method: ImportFromAst
printSmalltalkOn: aStream
	"Generate Smalltalk for 'from module import name1, name2 as alias2, ...'.

	For relative imports (leading dots), resolve against the importer's
	package at compile time so the runtime `___import__:` call always
	receives an absolute name.  Each imported name then comes off the
	imported module object via a unary send (stored attribute) or a
	BoundMethod wrap (callable on a converted module).

	Star imports (`from X import *`) are intentionally NOT yet handled
	here — they require a runtime walk of the imported module's
	exported names (`__all__` or every non-underscore attribute) and
	binding each one into the local namespace.  See TODO.md."

	names doWithIndex: [:each :index |
		| targetName isModuleStore |
		targetName := self boundNameFor: each.
		"Phase A: module-scope target binds into the module's dynamic-
		instVar storage rather than a non-existent Smalltalk temp."
		isModuleStore := self ___importBindsAtModuleScope___: targetName.
		isModuleStore
			ifTrue: [
				aStream
					nextPutAll: 'self @env0:dynamicInstVarAt: #''';
					nextPutAll: targetName;
					nextPutAll: ''' put: ('
			]
			ifFalse: [
				aStream nextPutAll: targetName; nextPutAll: ' := '
			].
		aStream nextPutAll: (self valueSourceFor: each).
		isModuleStore ifTrue: [aStream nextPut: $)].
		aStream nextPut: $..
		index < names size ifTrue: [aStream lf].
	].
	"For statements that were originally `from X import *`, emit
	a runtime merge step that copies any public attribute from X
	into self.  Catches dynamic names that parse-time expansion
	missed (e.g. opcodes injected via globals().update())."
	self wasStarImport ifTrue: [
		| absoluteName |
		absoluteName := self resolvedModuleName.
		names isEmpty ifFalse: [aStream lf].
		"Pass `('*',)` as fromlist so the importer returns the leaf
		submodule (matches CPython semantics for `from X import *`)
		rather than the top-level package, which is what an empty
		fromlist on a dotted name would yield."
		aStream
			nextPutAll: 'self @env1:___mergePublicAttrsFrom: (((Python @env0:at: #builtins) instance) ___import__: { ''';
			nextPutAll: absoluteName;
			nextPutAll: '''. nil. nil. { ''*'' }. 0 } kw: nil).'.
	].
%

category: 'Grail-code generation'
method: ImportFromAst
valueSourceFor: anAlias
	"Smalltalk source for the VALUE ``from <module> import <anAlias>'' binds.

	The imported name is passed as a single-element fromlist so the runtime
	importer returns the leaf submodule (``re._parser'') rather than the
	top-level package (``re'').  Without that CPython-standard distinction a
	dotted import would always bind names from the package's __init__.py
	instead of the actual target.

	Shared by printSmalltalkOn: and by the class-body attribute path so the
	two cannot drift."

	| absoluteName moduleClass attrName stream |
	absoluteName := self resolvedModuleName.
	moduleClass := module isNil
		ifTrue: [nil]
		ifFalse: [CallAst resolveModuleClassForName: module asSymbol].
	attrName := anAlias name asString.
	stream := WriteStream on: String new.
	(moduleClass notNil
		and: [NameAst isFastPathBuiltinName: attrName asSymbol on: moduleClass])
		ifTrue: [
			"Callable on a converted module — wrap in BoundMethod."
			stream
				nextPutAll: '(BoundMethod receiver: (((Python @env0:at: #builtins) instance) ___import__: { ''';
				nextPutAll: absoluteName;
				nextPutAll: '''. nil. nil. { ''';
				nextPutAll: attrName;
				nextPutAll: ''' }. 0 } kw: nil) selector: #';
				nextPutAll: attrName;
				nextPutAll: ')'.
		]
		ifFalse: [
			"Stored attribute or unconverted module — go through
			___pyAttrLoad___ so dynamicInstVar entries (the canonical home
			for module attributes assigned at init time) are read directly
			without invoking a same-named unary method.  ``from enum import
			auto'' depends on this: ``auto'' is pre-stored as a BoundMethod
			and a bare unary send would dispatch the env-1 ``auto'' method,
			returning an integer."
			stream
				nextPutAll: '((((Python @env0:at: #builtins) instance) ___import__: { ''';
				nextPutAll: absoluteName;
				nextPutAll: '''. nil. nil. { ''';
				nextPutAll: attrName;
				nextPutAll: ''' }. 0 } kw: nil) @env1:___pyAttrLoad___: #''';
				nextPutAll: attrName;
				nextPutAll: ''')'.
		].
	^ stream contents
%

category: 'Grail-Class Body'
method: ImportFromAst
boundNameFor: anAlias
	"The single name ``from <module> import <anAlias>'' binds: the alias
	when given, otherwise the imported name itself.  Unlike a plain
	``import a.b'', there is no dotted-path case here -- a from-import
	always binds a leaf."

	^ (anAlias asName ifNil: [anAlias name]) asSymbol
%

category: 'Grail-Class Body'
method: ImportFromAst
___boundTargetNames___
	"Every name this from-import binds -- see StatementAst for the protocol.

	``from X import *'' is excluded: CPython makes it a SyntaxError anywhere
	but module level, so it can never reach a class body, and at module
	scope the star names are bound by the runtime merge in
	printSmalltalkOn: rather than as class attributes."

	self wasStarImport ifTrue: [^ #()].
	^ names collect: [:each | self boundNameFor: each]
%

category: 'Grail-Class Body'
method: ImportFromAst
classBodyAttributePairs
	"``name -> value'' pairs for a from-import written in a CLASS BODY.

	CPython executes a class body as a namespace, so ``from os import sep''
	there binds ``sep'' as a class attribute exactly as ``import os'' binds
	``os''.  Grail dropped the statement whole: the name never bound and a
	later reference raised NameError.  It hid for as long as a bare name
	could resolve as a Smalltalk global, which stopped being true when
	bare-name resolution was narrowed to CPython's builtins."

	self wasStarImport ifTrue: [^ #()].
	^ names collect: [:each |
		(self boundNameFor: each) -> (RawSmalltalkAst source: (self valueSourceFor: each))]
%
method: ImportFromAst
module
	^module
%
method: ImportFromAst
module: newValue
	module := newValue
%
method: ImportFromAst
level
	^level
%
method: ImportFromAst
level: newValue
	level := newValue
%
