! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportFromAst
expectvalue /Class
doit
StatementAst subclass: 'ImportFromAst'
  instVarNames: #( module names level wasStarImport starNamesGuessed)
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

category: 'Grail-accessing'
method: ImportFromAst
starNamesGuessed: aBoolean
	"Set by importlib >> expandStarImports: when a star import's names were
	GUESSED from the module's top-level variables because it has no literal
	__all__.  A guessed name may never be bound -- a ``global'' only declared
	inside a function -- so it is bound only if present (#1416).  Names from
	an __all__ stay strict: CPython raises when __all__ lists a missing one."

	starNamesGuessed := aBoolean
%

category: 'Grail-accessing'
method: ImportFromAst
___starNameMayBeAbsent___
	"True for the names of an expanded star import that were guessed, not
	listed in an __all__ (see starNamesGuessed:)."

	^ self wasStarImport and: [starNamesGuessed == true]
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

	"A STAR IMPORT IN A DOIT is the runtime merge alone, with CPython's rule
	(builtins >> ___doitStarImport___:into:).  The parse-time expansion is not
	emitted: without a literal ``__all__'' it falls back to every public
	top-level name, which binds names the module's real __all__ leaves out,
	and a module whose names all arrive by its own star import expands to
	nothing."
	(self wasStarImport and: [ModuleAst compilingDoitScope notNil]) ifTrue: [
		aStream
			nextPutAll: '(((Python @env0:at: #builtins) @env0:___instance___) ___doitStarImport___: (((Python @env0:at: #builtins) @env0:___instance___) ';
			nextPutAll: self ___importSelectorPrefix___;
			nextPutAll: ': ';
			nextPutAll: (self ___importArgsSourceFor___: '{ ''*'' }');
			nextPutAll: ' kw: nil) into: ___pyGlobals___).'.
		^ self].
	names doWithIndex: [:each :index |
		| targetName needsClose |
		targetName := self boundNameFor: each.
		"A STAR-EXPANDED name is bound only if the module has it (#1416):
		valueSourceFor: reads it with ___importFromStar___:, which answers a
		marker rather than raising, and the binding is skipped on the marker.
		The parse-time list can name something the module never binds -- a
		``global'' declared only inside a function -- and CPython's import-all
		simply does not see it.  Only GUESSED names: an __all__'s stay strict."
		self ___starNameMayBeAbsent___ ifTrue: [aStream nextPutAll: '[:___starValue___ | ___starValue___ == #''___starNameMissing___'' ifFalse: ['].
		"Where the binding LANDS -- module dynamic-instVar storage, a
		class-body definitional store, or a plain temp -- is
		printImportBindingOpenOn:name:'s decision, shared with ImportAst."
		needsClose := self printImportBindingOpenOn: aStream name: targetName.
		aStream nextPutAll: (self ___starNameMayBeAbsent___
			ifTrue: ['___starValue___']
			ifFalse: [self valueSourceFor: each]).
		needsClose ifTrue: [aStream nextPut: $)].
		self ___starNameMayBeAbsent___ ifTrue: [
			aStream nextPutAll: ']] value: '; nextPutAll: (self valueSourceFor: each)].
		aStream nextPut: $..
		index < names size ifTrue: [aStream lf].
	].
	"For statements that were originally `from X import *`, emit
	a runtime merge step that copies any public attribute from X
	into self.  Catches dynamic names that parse-time expansion
	missed (e.g. opcodes injected via globals().update())."
	self wasStarImport ifTrue: [
		"A doit never gets here: it has no module instance to send this to, and
		its star import returned above with a merge of its own."
		names isEmpty ifFalse: [aStream lf].
		"Pass `('*',)` as fromlist so the importer returns the leaf
		submodule (matches CPython semantics for `from X import *`)
		rather than the top-level package, which is what an empty
		fromlist on a dotted name would yield."
		aStream
			nextPutAll: 'self @env1:___mergePublicAttrsFrom___: (((Python @env0:at: #builtins) @env0:___instance___) ';
			nextPutAll: self ___importSelectorPrefix___;
			nextPutAll: ': ';
			nextPutAll: (self ___importArgsSourceFor___: '{ ''*'' }');
			nextPutAll: ' kw: nil).'.
	].
%

category: 'Grail-code generation'
method: ImportFromAst
___isRelativeInDoit___
	"A relative import (``from .. import util'') compiled as a DOIT -- exec'd
	source.  See ___importArgsSourceFor___:."

	^ (level notNil and: [level > 0]) and: [ModuleAst compilingDoitScope notNil]
%

category: 'Grail-code generation'
method: ImportFromAst
___importArgsSourceFor___: fromlistSource
	"Smalltalk source for the argument array of the __import__ call this
	statement compiles to: { name. globals. locals. fromlist. level }.

	Ordinarily the name is resolved here, at compile time, against the
	enclosing ModuleAst (resolvedModuleName), and passed with level 0.  A
	relative import in a DOIT cannot be: exec'd source has no module name of
	its own, so ``from .. import util'' resolved to '' and died with
	``ValueError: Empty module name''.  pytest execs every test module whose
	asserts it rewrites, so a test package's relative imports failed
	(soupsieve, python-multipart).  There the name goes UNRESOLVED, with the
	doit's globals and the level, and __import__ resolves it at run time from
	their __package__ / __spec__ / __name__, as CPython's IMPORT_NAME always
	does."

	self ___isRelativeInDoit___ ifTrue: [
		^ '{ ''' , (module isNil ifTrue: [''] ifFalse: [module asString])
			, '''. (PyModuleDict @env0:on: ' , self ___globalsViewReceiverExpr___
			, '). nil. ' , fromlistSource , '. ' , level printString , ' }'].
	^ '{ ''' , self resolvedModuleName , '''. nil. nil. ' , fromlistSource , '. 0 }'
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

	| moduleClass attrName stream |
	moduleClass := (module isNil or: [self ___isRelativeInDoit___])
		ifTrue: [nil]
		ifFalse: [CallAst resolveModuleClassForName: module asSymbol].
	attrName := anAlias name asString.
	stream := WriteStream on: String new.
	(moduleClass notNil
		and: [NameAst isFastPathBuiltinName: attrName asSymbol on: moduleClass])
		ifTrue: [
			"Callable on a converted module — wrap in BoundMethod."
			stream
				nextPutAll: '(BoundMethod receiver: (((Python @env0:at: #builtins) @env0:___instance___) ';
				nextPutAll: self ___importSelectorPrefix___;
				nextPutAll: ': ';
				nextPutAll: (self ___importArgsSourceFor___: '{ ''' , attrName , ''' }');
				nextPutAll: ' kw: nil) selector: #';
				nextPutAll: attrName;
				nextPutAll: ')'.
		]
		ifFalse: [
			"Stored attribute or unconverted module — go through
			___importFrom___ (object >>), CPython's IMPORT_FROM: the
			___pyAttrLoad___ read, so dynamicInstVar entries (the canonical
			home for module attributes assigned at init time) are read directly
			without invoking a same-named unary method -- ``from enum import
			auto'' depends on this: ``auto'' is pre-stored as a BoundMethod
			and a bare unary send would dispatch the env-1 ``auto'' method,
			returning an integer -- and on a miss the sys.modules retry and
			the ``cannot import name'' ImportError, which __import__ no longer
			raises (issue #1223)."
			stream
				nextPutAll: '((((Python @env0:at: #builtins) @env0:___instance___) ';
				nextPutAll: self ___importSelectorPrefix___;
				nextPutAll: ': ';
				nextPutAll: (self ___importArgsSourceFor___: '{ ''' , attrName , ''' }');
				nextPutAll: ' kw: nil) @env1:';
				"A star import reads M's namespace, as CPython's import-all does,
				never sys.modules.  A GUESSED name may be absent (see
				printSmalltalkOn:); one an __all__ lists raises CPython's
				``module 'M' has no attribute 'x''' when it is, which is the
				plain attribute read's own error -- not IMPORT_FROM's
				``cannot import name''."
				nextPutAll: (self ___starNameMayBeAbsent___
					ifTrue: ['___importFromStar___: #''']
					ifFalse: [self wasStarImport
						ifTrue: ['___pyAttrLoad___: #''']
						ifFalse: ['___importFrom___: #''']]);
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

category: 'Grail-code generation'
method: ImportFromAst
___storesModuleSlot___: aSymbol
	"A STAR import may store ANY module slot, so a later top-level def of any
	name has to clear its slot (FunctionDefAst >>
	___rebindsAnEarlierModuleBinding___).  Which names it binds is decided by
	the runtime merge (module >> ___mergePublicAttrsFrom___:), from X's __all__ or
	its public names, and parse time cannot know them.

	    from _signal import *       # binds signal, getsignal, ...
	    def signal(signalnum, handler): ...

	is CPython's signal.py.  The star-merged _signal.signal sat in the slot,
	the slot out-ranks the def's method, so ``signal.signal'' stayed the raw
	function and the def was never reached.  The cost of answering true for
	every name is one removeDynamicInstVar: per later top-level def, in a
	module that has a star import."

	self wasStarImport ifTrue: [^ true].
	^ super ___storesModuleSlot___: aSymbol
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

category: 'Grail-IR Codegen'
method: ImportFromAst
___irBoundNames___
	"The locals this statement binds, one per alias, as Strings (boundNameFor:)."

	^ names collect: [:a | (self boundNameFor: a) asString]
%

category: 'Grail-IR Codegen'
method: ImportFromAst
___irEligibleStatementLocals___: localNames
	"``from m import a, b as c'' inside a def, every bound name a body local:
	printImportBindingOpenOn:name:'s plain ``name := ...'' branch with
	valueSourceFor:'s value.  A star import is module-level only (a SyntaxError
	in a def) and is refused anyway.  resolvedModuleName walks to the ModuleAst
	for a relative import; guarded, since eligibility must never raise."

	self wasStarImport ifTrue: [^ false].
	"A relative import in exec'd source resolves at run time -- see
	___importArgsSourceFor___: -- which only the text emit does."
	self ___isRelativeInDoit___ ifTrue: [^ false].
	(names isNil or: [names isEmpty]) ifTrue: [^ false].
	(self ___irBoundNames___ allSatisfy: [:n | localNames includes: n])
		ifFalse: [^ false].
	^ [self resolvedModuleName notNil] on: Error do: [:ex | false]
%

category: 'Grail-IR Codegen'
method: ImportFromAst
___emitIRStatementOn___: aBuilder
	"valueSourceFor:'s two shapes, one statement per alias.  The imported name
	is the one-element fromlist so the importer answers the LEAF module:
	  name := ((builtins instance) ___import__: { 'abs.name'. nil. nil. { 'attr' }. 0 } kw: nil)
	            @env1:___importFrom___: #attr
	or, when the module class is known at compile time and ``attr'' is one of
	its env-1 fast-path methods (a callable on a converted module), the
	BoundMethod wrap the text emits instead of the attribute load:
	  name := BoundMethod receiver: (<the import>) selector: #attr"

	| absoluteName moduleClass |
	absoluteName := self resolvedModuleName.
	moduleClass := module isNil
		ifTrue: [nil]
		ifFalse: [CallAst resolveModuleClassForName: module asSymbol].
	names do: [:alias |
		| attrName imported v |
		attrName := alias name asString.
		aBuilder atNode: self.
		imported := aBuilder
			send: #'___import__:kw:' to: (self ___emitIRBuiltinsInstanceOn___: aBuilder)
			with: { aBuilder arrayOf: {
					aBuilder obj: absoluteName asString.
					aBuilder nilLit.
					aBuilder nilLit.
					aBuilder arrayOf: { aBuilder obj: attrName }.
					aBuilder obj: 0 }.
				aBuilder nilLit }
			env: 1.
		v := (moduleClass notNil
			and: [NameAst isFastPathBuiltinName: attrName asSymbol on: moduleClass])
				ifTrue: [aBuilder
					send: #receiver:selector: to: (aBuilder globalNamed: #BoundMethod)
					with: { imported. aBuilder obj: attrName asSymbol } env: 1]
				ifFalse: [aBuilder
					send: #'___importFrom___:' to: imported
					with: { aBuilder obj: attrName asSymbol } env: 1].
		aBuilder atNode: self.
		aBuilder add: (aBuilder
			assign: (aBuilder leafFor: (self boundNameFor: alias) asSymbol)
			from: v)].
	^ self
%

category: 'Grail-IR Codegen'
method: ImportFromAst
___irWriteLocalNamesInto___: aSet locals: localSet
	self ___irBoundNames___ do: [:n |
		(localSet includes: n) ifTrue: [aSet add: n]].
	^ self
%

category: 'Grail-IR Codegen'
method: ImportFromAst
___irTopLevelWriteNames___: localSet
	"Every alias binds its name when the statement completes."

	^ self ___irBoundNames___ select: [:n | localSet includes: n]
%
