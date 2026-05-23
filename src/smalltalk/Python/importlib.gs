! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- importlib class (Python 'importlib' module)
expectvalue /Class
doit
module subclass: 'importlib'
  instVarNames: #()
  classVars: #()
  classInstVars: #('grailDir')
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
importlib comment:
'Python importlib module.

This class provides the implementation of the import statement.
It enables programmatic importing of modules.

Key functions:
- import_module(name, package=None): Import a module by name
- reload(module): Reload a previously imported module
- invalidate_caches(): Invalidate finder caches
- __import__(name, globals, locals, fromlist, level): Low-level import function

Class methods for loading modules from files:
- astForPath: - Create a ModuleAst from a Python file
- astForSource: - Create a ModuleAst from Python source
- runPath: - Execute a Python file as __main__

The module registry is maintained in sys.modules (accessed via sys class>>modules).

See https://docs.python.org/3/library/importlib.html for documentation.
'
%

expectvalue /Class
doit
importlib category: 'Grail-Modules'
%

! ===============================================================================
! importlib Module (Python 'importlib' module)
! ===============================================================================
! This file contains the Python importlib module implementation.
! The importlib module provides the implementation of the import statement.
! ===============================================================================

! ------------------- Remove existing Python methods from importlib
expectvalue /Metaclass3
doit
importlib removeAllMethods.
importlib class removeAllMethods.
%

set compile_env: 0

category: 'Grail-For Tests'
classmethod: importlib
___lookupModule___: aName
	^ self @env1:lookupModule: aName
%

category: 'Grail-AST-Generation'
classmethod: importlib
astForPath: pathString
	"Create a ModuleAst from a Python file path.

	importlib astForPath: '/path/to/file.py'.
	"
		| file sourceString module |
		file := GsFile open: pathString mode: 'rb' onClient: false.
		sourceString := file contentsAsUtf8 decodeToUnicode.
		file close.
		module := ModuleAst parseSource: sourceString.
		module path: pathString.
		^module
%

category: 'Grail-AST-Generation'
classmethod: importlib
astForSource: aString
	"Create a ModuleAst from Python source code.

	importlib astForSource: '1 == 1'.
	"
		^ModuleAst parseSource: aString
%

category: 'Grail-Naming'
classmethod: importlib
___asSmalltalkClassName___: aPythonName
	"Encode a Python module or class name into a GemStone class name.
	GemStone class names must start with a letter (any case is accepted
	in practice, but uppercase is conventional) and contain only letters,
	digits, and underscores.  Dots are not legal.

	Rules:
	  * Replace every `.` with `_`  (e.g. ``re._parser`` → ``re__parser``).
	  * Capitalize the first character if it is a lowercase ASCII letter
	    (e.g. ``hello`` → ``Hello``).  Other first characters (uppercase,
	    underscore, digit) pass through unchanged; GemStone accepts an
	    underscore as the first character of a class name.

	Examples:
	  ``hello``         → ``Hello``
	  ``re._parser``    → ``Re__parser``
	  ``MyClass``       → ``MyClass``  (already valid)
	  ``_constants``    → ``_constants``"

	| s first |
	s := aPythonName @env0:asString @env0:copyReplaceAll: '.' with: '_'.
	s @env0:isEmpty ifTrue: [^ s @env0:asSymbol].
	first := s @env0:at: 1.
	(first @env0:isLetter and: [first @env0:isLowercase]) ifTrue: [
		s := first @env0:asUppercase @env0:asString @env0:,
			(s @env0:copyFrom: 2 to: s @env0:size).
	].
	^ s @env0:asSymbol
%

category: 'Grail-For Tests'
classmethod: importlib
grailDir
	"Return the absolute path to the Grail project directory."
	^ grailDir
%

category: 'Grail-Configuration'
classmethod: importlib
grailDir: aString
	"Set the absolute path to the Grail project directory."
	grailDir := aString
%

category: 'Grail-Demo'
classmethod: importlib
hello

	[
		| module function hello |
		module := importlib @env1:instance.
		function := module @env1:import_module.
		hello := function value: { 'python.hello' } value: nil.
		^hello
	] on: AbstractException do: [:ex |
		ex halt.
	].
%

category: 'Grail-Module Loading'
classmethod: importlib
expandStarImports: aModuleAst
	"Rewrite every `from X import *` in aModuleAst's body into
	`from X import a, b, c, ...` where the names are X's top-level
	module variables.  Mutates the AliasAst list in-place and declares
	each name on the importing body so it surfaces in body.variables.

	X is resolved against the importing module's package by reusing
	ImportFromAst's `resolvedModuleName`, which walks the parent chain
	to find the ModuleAst (set up immediately above this call site).
	If X's source file can't be located we leave the star alone — the
	resulting Smalltalk compile-error gives a more useful diagnostic
	than silently skipping the import would."

	| body |
	body := aModuleAst body.
	body body do: [:stmt |
		((stmt isKindOf: ImportFromAst) and: [
			stmt names size = 1 and: [(stmt names first name) == #'*']])
		ifTrue: [
			| absName path subAst expandedNames newAliases |
			"Mark the statement as a star import even before we know
			whether parse-time expansion succeeds — codegen emits a
			runtime merge step too, which picks up dynamic names that
			static analysis can't see (e.g. ``globals().update(...)``
			from a helper like re._constants._makecodes)."
			stmt wasStarImport: true.
			absName := stmt resolvedModuleName.
			path := self @env1:___moduleNameToPath___: absName.
			path notNil ifTrue: [
				subAst := self astForPath: path.
				"Names exported by a star-import: every top-level variable
				that isn't underscore-prefixed (matches CPython's default
				when __all__ isn't set).  __all__ handling is a future
				refinement."
				expandedNames := subAst body variables asArray
					select: [:n | (n size > 0) and: [(n at: 1) ~= $_]].
				newAliases := expandedNames collect: [:n |
					AliasAst buildWithFields: (IdentityKeyValueDictionary new
						at: #name put: n asSymbol;
						at: #asName put: nil;
						yourself)].
				stmt names: newAliases.
				expandedNames do: [:n | body declareVariable: n asSymbol].
			] ifFalse: [
				"Source not on the loader search path — drop the bogus
				`*` alias.  The runtime merge step is the only thing
				that runs for this case, and per-name codegen for `*`
				would emit invalid Smalltalk."
				stmt names: #()
			]
		]
	]
%

category: 'Grail-Module Loading'
classmethod: importlib
loadModuleFromPath: pathString name: moduleName
	"Load a module from a file path and register it.
	Returns the module instance.

	Creates a real Smalltalk class per Python module.  Module-level
	globals become instance variables on the generated class.  Top-level
	`def` statements compile as real env-1 methods with arity-specialized
	selectors.  The remaining module body compiles as an `initialize`
	method on the class.

	The generated class lives in the ``PythonModules`` SymbolDictionary,
	keyed by an encoded form of the Python name (``moduleName
	asSmalltalkClassName``).  Re-import returns the cached instance from
	sys.modules; the Smalltalk class is only consulted to allocate
	new instances when the cache is missed."

	| moduleAst moduleClass moduleClassName moduleInstance nameParts packageName
	  variables variableNames stream methodSource sl
	  topLevelDefs functionNames lf |
	moduleAst := self astForPath: pathString.
	moduleAst name: moduleName.
	moduleAst useTempsForBlock: false.

	"Parent linkage must happen before star-import expansion so the
	ImportFromAst nodes can find their enclosing ModuleAst (for relative
	import resolution)."
	moduleAst setParent: nil.

	"Expand `from X import *` into explicit `from X import a, b, c`.
	Done by parsing the target module's source, collecting its top-level
	names, and rewriting the star AliasAst into one AliasAst per name.
	Each name is also declared on the body so it shows up in body.variables
	below (and therefore in the generated class's inst vars)."
	self expandStarImports: moduleAst.

	"Collect declared variable names from the module body"
	variables := moduleAst body variables.
	variableNames := variables asArray.

	"Build the Smalltalk class name from the Python module name."
	moduleClassName := self ___asSmalltalkClassName___: moduleName.

	"Create or recreate the Smalltalk class for this module.  Always go
	through ``module subclass:`` rather than reusing a previously-
	registered binding — when the Grail class hierarchy has shifted
	(e.g. a new instVar on ``module``), Smalltalk's ``subclass:``
	re-parents the existing class on the current ``module``, sweeping
	up the orphan and restoring the singleton invariant for any code
	path that flows through this class."
	moduleClass := module subclass: moduleClassName
		instVarNames: variableNames
		classVars: #()
		classInstVars: #()
		poolDictionaries: #()
		inDictionary: PythonModules
		options: #().

	"Compile top-level `def` statements as real methods on the
	module class. Scan for FunctionDefAst nodes, pre-register stubs so
	inter-function calls resolve, then compile real methods."
	lf := Character lf asString.
	sl := System myUserProfile symbolList copy.
	topLevelDefs := moduleAst body body select: [:stmt |
		stmt isKindOf: FunctionDefAst].
	functionNames := IdentitySet new.
	topLevelDefs do: [:stmt | functionNames add: stmt name asSymbol].

	"Pre-register stub methods for each function so inter-function calls
	resolve during codegen (avoids forward-reference timing issues)."
	topLevelDefs do: [:stmt |
		moduleClass compileMethod: stmt generateStubMethodSource
			dictionaries: sl
			category: 'Grail-Methods'
			environmentId: 1.
	].

	"Class definitions are emitted as runtime statements in the module
	body; no install-time class creation is required."

	"Set compile-time context so CallAst and FunctionDefAst emit module-
	aware code (self-sends, BoundMethod assignments)."
	CallAst moduleClassBeingCompiled: moduleClass.
	CallAst moduleFunctionNames: functionNames.
	[
		| debugStream debugClassName |
		"When running as __main__ (``grail file.py``) accumulate every
		method source we hand to compileMethod: into a single Topaz-
		style input file so the user can see what was actually compiled
		— and could replay it through topaz to reproduce.  Ordinary
		imports skip the capture.

		The file is NOT a literal replay of what loadModuleFromPath:
		does — the module class is created here at runtime via
		``module subclass: ...'', not via a topaz ``doit''.  The
		``category:'' / ``method:'' / ``%'' framing is a debugging aid
		that mirrors what GemStone would see if you compiled the
		methods by hand."
		debugStream := moduleName = '__main__'
			ifTrue: [PrettyWriteStream on: Unicode7 new]
			ifFalse: [nil].
		debugClassName := moduleClassName asString.
		debugStream ifNotNil: [
			debugStream
				nextPutAll: '! /tmp/grail.tpz — methods compiled by loadModuleFromPath:'; lf;
				nextPutAll: '! Module: '; nextPutAll: moduleName;
				nextPutAll: '   Class: '; nextPutAll: debugClassName; lf; lf;
				"The subclass: call that loadModuleFromPath: makes to create
				the module class.  Emitting it here makes the file self-
				describing — a reader can see exactly which names become
				instVars on the class (and therefore which Python parameters
				will get the ``_X'' transport rename to avoid shadowing)."
				nextPutAll: 'doit'; lf;
				nextPutAll: 'module subclass: '''; nextPutAll: debugClassName; nextPutAll: ''''; lf;
				nextPutAll: '  instVarNames: #('.
			variableNames do: [:n |
				debugStream space; nextPutAll: n asString].
			debugStream
				nextPutAll: ' )'; lf;
				nextPutAll: '  classVars: #()'; lf;
				nextPutAll: '  classInstVars: #()'; lf;
				nextPutAll: '  poolDictionaries: #()'; lf;
				nextPutAll: '  inDictionary: PythonModules'; lf;
				nextPutAll: '  options: #()'; lf;
				nextPutAll: '%'; lf; lf;
				nextPutAll: 'set compile_env: 1'; lf; lf.
		].

		"Compile real methods for each top-level def.
		Resume CompileWarning because function params may shadow module-
		level instVars (e.g. `def f(x)` where `x` is also a module var).
		Block temps can shadow instVars in GemStone but produce a warning."
		topLevelDefs do: [:stmt |
			| methodStream methodSource2 |
			methodStream := PrettyWriteStream on: Unicode7 new.
			stmt generateMethodSourceOn: methodStream.
			methodSource2 := methodStream contents.
			debugStream ifNotNil: [
				debugStream
					nextPutAll: 'category: ''Grail-Methods'''; lf;
					nextPutAll: 'method: '; nextPutAll: debugClassName; lf.
				self ___writeMethodSource: methodSource2 on: debugStream.
				debugStream nextPutAll: '%'; lf; lf.
			].
			[moduleClass compileMethod: methodSource2
				dictionaries: sl
				category: 'Grail-Methods'
				environmentId: 1.
			] on: CompileWarning do: [:ex | ex resume].
		].

		"Generate the module body as Smalltalk source for the initialize method.
		Top-level defs emit BoundMethod assignments; calls emit self-sends."
		stream := PrettyWriteStream on: Unicode7 new.
		moduleAst printSmalltalkOn: stream.

		"Compile the body as an env-1 `initialize` method on the new class.
		Resume CompileWarning the same way the per-def compilation above
		does — module-level docstrings and other expression statements
		that the Smalltalk compiler flags as `statement with no effect`
		are valid Python (Python evaluates the expression and discards
		the result)."
		methodSource := 'initialize' , lf , stream contents.
		debugStream ifNotNil: [
			| tpzFile |
			debugStream
				nextPutAll: 'category: ''Grail-Module Body'''; lf;
				nextPutAll: 'method: '; nextPutAll: debugClassName; lf.
			self ___writeMethodSource: methodSource on: debugStream.
			debugStream nextPutAll: '%'; lf.
			"Write as UTF-8 bytes so editors that don't auto-detect
			UTF-16 (most of them) render the file correctly."
			tpzFile := GsFile open: '/tmp/grail.tpz' mode: 'wb' onClient: false.
			tpzFile nextPutAll: debugStream contents encodeAsUTF8.
			tpzFile close.
		].
		[moduleClass compileMethod: methodSource
			dictionaries: sl
			category: 'Grail-Module Body'
			environmentId: 1.
		] on: CompileWarning do: [:ex | ex resume].

		"Debug aid: when running as __main__, capture the IR tree for the
		body's initialize method (the last thing compiled here, before the
		accessor sweep below).  Snapshot now so subsequent compileMethod:
		calls don't overwrite __sessionStateAt: 19."
		moduleName = '__main__' ifTrue: [
			| irFile |
			irFile := GsFile open: '/tmp/grail.ir' mode: 'w' onClient: false.
			irFile nextPutAll: (System __sessionStateAt: 19) printString.
			irFile close.
		].
	] ensure: [
		CallAst moduleClassBeingCompiled: nil.
		CallAst moduleFunctionNames: nil.
	].

	"Generate unary accessor methods for each module-level variable so
	attribute access like `module.x` resolves to an instVar read.
	Skip function names — they have real `name:` / `_name:kw:` methods
	and adding a unary `name` accessor would steal the 0-arg call-site
	dispatch (`f()` would return the BoundMethod instead of calling).
	Class-method free-name reads handle functions specially in NameAst
	by emitting a fresh BoundMethod."
	variableNames do: [:varName |
		| accessorSource setterSource |
		(functionNames includes: varName asSymbol) ifFalse: [
			accessorSource := varName , lf , '	^ ' , varName.
			moduleClass compileMethod: accessorSource
				dictionaries: sl
				category: 'Grail-Accessors'
				environmentId: 1.
			setterSource := varName , ': ___1' , lf , '	' , varName , ' := ___1.'.
			moduleClass compileMethod: setterSource
				dictionaries: sl
				category: 'Grail-Accessors'
				environmentId: 1.
		].
	].

	"Create an instance, set metadata, register, then run.
	Must use @env0:new (not basicNew) because module inherits from
	SymbolDictionary, which requires internal structure initialization."
	moduleInstance := moduleClass @env0:new.
	nameParts := $. split: moduleName.
	packageName := (nameParts size > 1)
		ifTrue: ['.' @env1:join: (nameParts copyFrom: 1 to: nameParts size - 1)]
		ifFalse: [None].
	moduleInstance
		@env1:__name__: moduleName;
		@env1:__package__: packageName.
	(pathString endsWith: '__init__.py') ifTrue: [
		| dirPath |
		dirPath := pathString copyFrom: 1 to: pathString size - '/__init__.py' size.
		moduleInstance @env1:__path__: { dirPath }.
		moduleInstance @env1:__package__: moduleName.
	].
	"Register BEFORE execution so circular imports resolve"
	self registerModule: moduleName with: moduleInstance.
	"Execute the module body"
	moduleInstance @env1:initialize.
	^ moduleInstance
%

category: 'Grail-Module Loading'
classmethod: importlib
loadDynamicModuleNamed: moduleName fromPath: pathString
	"Load a .so C extension module via CPythonShim and register it."

	| moduleInstance |
	moduleInstance := CPythonShim loadDynamicModule: moduleName fromPath: pathString.
	self registerModule: moduleName with: moduleInstance.
	^ moduleInstance
%

category: 'Grail-Module Registry'
classmethod: importlib
registerModule: aName with: aModule
	"Register a module in sys.modules and synchronise parent/child
	attribute bindings.  CPython's import machinery sets ``pkg.sub``
	on ``pkg`` implicitly as it imports; we centralise it here so
	every entry point that registers a module (loadModuleFromPath:,
	loadDynamicModuleNamed:, the recursive parent-loader inside
	___import__:, test setUps) gets the binding for free, regardless
	of whether parent or child is registered first.

	Two cases:
	  - This module's name is dotted (``pkg.sub``): if its parent
	    package is already in sys.modules, bind self on the parent.
	  - Otherwise: this module could be the parent of one or more
	    previously-registered orphan submodules.  Scan sys.modules
	    for any name that prefixes with ``aName + '.'`` and bind
	    the leaf component as an attribute on aModule."

	| parts parentName parent mods prefix |
	mods := self @env1:modules.
	mods @env0:at: aName @env0:asSymbol put: aModule.
	parts := $. @env0:split: aName.
	parts @env0:size @env0:> 1 ifTrue: [
		parentName := '.' @env0:join: (parts @env0:copyFrom: 1 to: parts @env0:size - 1).
		parent := self @env1:lookupModule: parentName.
		parent notNil ifTrue: [
			self @env0:___bind: aModule onParent: parent as: parts @env0:last
		].
	].
	"Rescue previously-orphaned children: any sys.modules key of
	form ``aName.child`` should be bound on aModule as `child`."
	prefix := aName @env0:, '.'.
	mods @env0:keysAndValuesDo: [:key :child |
		| kStr |
		kStr := key @env0:asString.
		((kStr @env0:size @env0:> prefix @env0:size)
			and: [(kStr @env0:copyFrom: 1 to: prefix @env0:size) @env0:= prefix
			and: [(kStr @env0:indexOf: $. startingAt: prefix @env0:size + 1) @env0:= 0]])
			ifTrue: [
				| childLeafName |
				childLeafName := kStr @env0:copyFrom: prefix @env0:size + 1 to: kStr @env0:size.
				self @env0:___bind: child onParent: aModule as: childLeafName
			]
	].
%

category: 'Grail-Module Registry'
classmethod: importlib
___bind: aChildModule onParent: aParent as: anAttrName
	"Bind aChildModule on aParent under anAttrName.  Writes to
	BOTH the parent's SymbolDictionary slot (so dynamic
	`getattr`/`self at:` paths see it) AND, if the parent's class
	has a same-named instVar (the generated module's static
	accessor), the instVar slot too.  The instVar write is
	necessary because Grail compiles a unary `name ^ name`
	accessor for every declared module variable, and that accessor
	would otherwise return the still-nil instVar — which is
	exactly the scenario that defeats `from . import sub` inside
	a package's __init__.py when `sub` was pre-registered."

	| sym ivars idx |
	sym := anAttrName @env0:asSymbol.
	aParent @env0:at: sym put: aChildModule.
	ivars := aParent @env0:class @env0:allInstVarNames.
	idx := ivars @env0:indexOf: sym.
	idx @env0:> 0 ifTrue: [
		aParent @env0:instVarAt: idx put: aChildModule
	].
%

category: 'Grail-Module Loading'
classmethod: importlib
runPath: pathString
	"Execute a Python file as __main__ (like running 'python3 file.py').

	Routes through loadModuleFromPath: so class definitions, top-level
	`def`s, and module body share one codegen path.  As a side effect,
	loadModuleFromPath: (when name = '__main__') captures every method
	source it compiles to /tmp/grail.tpz (Topaz-style framing with
	``category:'' / ``method:'' / ``%'') and the body initialize IR
	tree to /tmp/grail.ir for post-mortem inspection.

	importlib runPath: '/path/to/script.py'.
	"
	^ self loadModuleFromPath: pathString name: '__main__'
%

category: 'Grail-Module Loading'
classmethod: importlib
smalltalkForPath: pathString
	"Generate Smalltalk code from a Python file.
	Useful for debugging the transpiler.

	importlib smalltalkForPath: '/path/to/script.py'.
	"
	| module stream |
	module := self astForPath: pathString.
	stream := PrettyWriteStream on: Unicode7 new.
	module printSmalltalkOn: stream.
	^ stream contents
%

category: 'Grail-Module Loading'
classmethod: importlib
smalltalkForSource: aString
	"Generate Smalltalk code from Python source code.
	Useful for debugging the transpiler.

	importlib smalltalkForSource: '1 + 2'.
	"
	| module stream |
	module := self astForSource: aString.
	stream := PrettyWriteStream on: Unicode7 new.
	module printSmalltalkOn: stream.
	^ stream contents
%

category: 'Grail-Module Loading'
classmethod: importlib
irForPath: pathString
	"Compile (but do not execute) a Python file and return the last IR
	tree produced by the Smalltalk compiler.  Useful for debugging
	the transpiler's downstream codegen.

	importlib irForPath: '/path/to/script.py'.
	"
	| module stream mySymbolList |
	module := self astForPath: pathString.
	stream := PrettyWriteStream on: Unicode7 new.
	module printSmalltalkOn: stream.
	mySymbolList := SymbolList with: Python.
	stream contents
		_compileInContext: nil
		symbolList: mySymbolList
		oldLitVars: nil
		environmentId: 1
		flags: 0.
	^ System __sessionStateAt: 19
%

category: 'Grail-Class Compilation'
classmethod: importlib
___writeMethodSource: aSource on: aStream
	"Emit a Smalltalk method source onto aStream — a PrettyWriteStream
	whose ``increaseIndent'' / ``decreaseIndent'' we use to indent the
	body.  Format:

	  <selector>
	  (blank)
	  <indented body>

	Called by the /tmp/grail.tpz debug capture in loadModuleFromPath:
	so each method written to that file reads like a hand-written
	Topaz method definition rather than a flat source dump."

	| firstLf |
	firstLf := aSource @env0:indexOf: Character lf @env0:ifAbsent: [0].
	firstLf @env0:= 0 ifTrue: [
		"Degenerate: source has no body, just the selector."
		^ aStream nextPutAll: aSource; lf.
	].
	aStream
		nextPutAll: (aSource @env0:copyFrom: 1 to: firstLf - 1);
		lf; lf.
	aStream @env0:increaseIndent.
	firstLf + 1 to: aSource @env0:size do: [:i |
		| ch |
		ch := aSource @env0:at: i.
		ch @env0:== Character lf
			ifTrue: [aStream lf]
			ifFalse: [aStream nextPut: ch]
	].
	"Ensure the body ends on its own line — the caller emits ``%''
	right after this on what should be a fresh line."
	(aSource @env0:isEmpty
		or: [aSource @env0:last @env0:== Character lf])
		ifFalse: [aStream lf].
	aStream @env0:decreaseIndent.
%

category: 'Grail-Class Compilation'
classmethod: importlib
___compilationSymbolList___
	"Symbol list used as the `dictionaries:` argument for compileMethod
	calls emitted by ClassDefAst codegen."

	^ System myUserProfile symbolList copy
%

category: 'Grail-Class Compilation'
classmethod: importlib
___inheritClassAttrs___: aClass exclude: ownAttrs
	"Copy parent metaclass class-side instVar values into aClass's
	matching slot for every name the parent declares (via env-1
	accessor) that aClass did NOT redeclare in its own class body.
	Smalltalk class-side instVars are per-class storage, so without
	this an unredeclared inherited Python class attr stays nil.
	Filter against env-1 accessor presence so Smalltalk system slots
	(superClass / format / userId / classCategory / ...) don't
	participate.  __module__ is handled separately by ClassDefAst.

	Factored out of inline emit so each generated class only pays a
	single send instead of ~600 chars of inlined code (keeps the
	gem's transient doits_meths code space from overflowing on heavy
	imports like itsdangerous + Werkzeug)."

	aClass superclass class allInstVarNames do: [:n |
		(((aClass superclass class whichClassIncludesSelector: n environmentId: 1) notNil)
			and: [n ~= #'__module__'
			and: [(ownAttrs includes: n) not]]) ifTrue: [
			| v |
			v := aClass superclass perform: n env: 1.
			aClass perform: (n asString , ':') asSymbol env: 1 withArguments: { v }
		]
	]
%

set compile_env: 1

category: 'Grail-Module Loading'
classmethod: importlib
___moduleNameToPath___: aName
	"Convert a module name (e.g., 'python.hello' or 're') to a file path.
	Search order: grailDir/<name> first, then grailDir/src/python/stdlib/<name>
	(the bundled Python standard library ports). For each search root,
	check name.py before name/__init__.py."
	| pathParts joined searchRoots |
	grailDir == nil ifTrue: [^ nil].
	pathParts := $. @env0:split: aName.
	joined := '/' @env0:join: pathParts.
	searchRoots := Array @env0:with: grailDir
		with: (grailDir @env0:, '/src/python/stdlib').
	searchRoots @env0:do: [:root | | base pyPath initPath |
		base := (root @env0:, '/') @env0:, joined.
		pyPath := base @env0:, '.py'.
		(GsFile @env0:existsOnServer: pyPath) ifTrue: [^ pyPath].
		initPath := base @env0:, '/__init__.py'.
		(GsFile @env0:existsOnServer: initPath) ifTrue: [^ initPath].
	].
	^ nil
%

category: 'Grail-Module Loading'
classmethod: importlib
___moduleNameToSoPath___: aName
	"Search for a .so extension module in the lib/ directory.
	Returns the full path if found, or nil if not found."
	| filePath |
	grailDir == nil ifTrue: [^ nil].
	filePath := ((grailDir @env0:, '/lib/') @env0:, aName) @env0:, '.so'.
	(GsFile @env0:existsOnServer: filePath) ifTrue: [^ filePath].
	^ nil
%

category: 'Grail-Module Registry'
classmethod: importlib
lookupModule: aName
	"Look up a module by name in the registry.
	Returns the module class or nil if not found."
	^ self modules @env0:at: aName @env0:asSymbol ifAbsent: [nil]
%

category: 'Grail-Module Registry'
classmethod: importlib
modules
	"Return the module registry (delegates to sys.modules).
	This is a SymbolDictionary mapping module names to module instances."
	^ sys modules
%

category: 'Grail-Private'
method: importlib
___resolve_name___: name package: package
	"Resolve a relative module name to an absolute name"
	| dots remaining parentParts |
	dots := 0.
	name do: [:c | c = $. ifTrue: [dots := dots + 1] ifFalse: [^ self error: 'Invalid relative import']].
	remaining := name copyFrom: dots + 1 to: name size.
	parentParts := $. @env0:split: package.
	(dots > parentParts __len__) ifTrue: [
		ImportError ___signal___: 'attempted relative import beyond top-level package'
	].
	parentParts := parentParts __getitem__: (0 @env0:to: (parentParts __len__ - dots)).
	remaining isEmpty
		ifTrue: ['.' join: parentParts]
		ifFalse: [('.' join: parentParts parentParts) @env0:, '.' @env0:, remaining]
%

category: 'Grail-Private'
method: importlib
___resolve_name___: name package: package level: level
	"Resolve a relative module name to an absolute name with explicit level"
	| parentParts |
	parentParts := $. @env0:split: package.
	(level > parentParts __len__) ifTrue: [
		ImportError ___signal___: 'attempted relative import beyond top-level package'
	].
	parentParts := parentParts __getitem__: (0 @env0:to: (parentParts __len__ - level + 1)).
	name isEmpty
		ifTrue: ['.' join: parentParts parentParts]
		ifFalse: [('.' join: parentParts parentParts) @env0:, '.' @env0:, name]
%


category: 'Grail-Initialization'
method: importlib
initialize
	"No-op — all methods are real fast-path methods."
%

! ===============================================================================
! Fast-path callable methods
! ===============================================================================

category: 'Grail-Built-in Functions'
method: importlib
___import__: positional kw: kwargs
	"Low-level import function (__import__).
	__import__(name, globals=None, locals=None, fromlist=(), level=0) -> module"

	| name globals locals fromlist level absoluteName moduleInstance filePath result nameParts isDotted prefix parentFilePath |
	name := positional @env0:at: 1.
	globals := (positional __len__ @env0:> 1)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [kwargs ifNotNil: [kwargs __getitem__: 'globals'] ifNil: [None]].
	locals := (positional __len__ @env0:> 2)
		ifTrue: [positional @env0:at: 3]
		ifFalse: [kwargs ifNotNil: [kwargs __getitem__: 'locals'] ifNil: [None]].
	fromlist := (positional __len__ @env0:> 3)
		ifTrue: [positional @env0:at: 4]
		ifFalse: [kwargs ifNotNil: [kwargs __getitem__: 'fromlist'] ifNil: [{}]].
	level := (positional __len__ @env0:> 4)
		ifTrue: [positional @env0:at: 5]
		ifFalse: [kwargs ifNotNil: [kwargs __getitem__: 'level'] ifNil: [0]].

	"Handle relative imports"
	absoluteName := (level @env0:> 0)
		ifTrue: [
			| package |
			package := globals ifNotNil: [globals __getitem__: '__package__'] ifNil: [None].
			package == None ifTrue: [
				ImportError ___signal___: 'attempted relative import with no known parent package'
			].
			self ___resolve_name___: name package: package level: level
		]
		ifFalse: [name].

	"Split the name into parts; detect dotted names"
	nameParts := $. @env0:split: absoluteName.
	isDotted := nameParts __len__ @env0:> 1.

	"Ensure parent packages are loaded for dotted names"
	isDotted ifTrue: [
		prefix := nameParts @env0:at: 1.
		(self @env0:class lookupModule: prefix) ifNil: [
			parentFilePath := self @env0:class ___moduleNameToPath___: prefix.
			parentFilePath notNil ifTrue: [
				self @env0:class @env0:loadModuleFromPath: parentFilePath name: prefix.
			].
		].
		2 @env0:to: nameParts __len__ - 1 do: [:i |
			prefix := (prefix @env0:, '.') @env0:, (nameParts @env0:at: i).
			(self @env0:class lookupModule: prefix) ifNil: [
				parentFilePath := self @env0:class ___moduleNameToPath___: prefix.
				parentFilePath notNil ifTrue: [
					self @env0:class @env0:loadModuleFromPath: parentFilePath name: prefix.
				].
			].
		].
	].

	"Look up the module"
	moduleInstance := self @env0:class lookupModule: absoluteName.
	moduleInstance notNil ifTrue: [
		result := moduleInstance
	] ifFalse: [
		"Module not found in registry - search filesystem for .py"
		filePath := self @env0:class ___moduleNameToPath___: absoluteName.
		filePath notNil ifTrue: [
			result := self @env0:class @env0:loadModuleFromPath: filePath name: absoluteName.
		] ifFalse: [
			"Search filesystem for .so (C extension module)"
			filePath := self @env0:class ___moduleNameToSoPath___: absoluteName.
			filePath notNil ifTrue: [
				result := self @env0:class @env0:loadDynamicModuleNamed: absoluteName fromPath: filePath.
			] ifFalse: [
				"Module not found in filesystem either"
				ModuleNotFoundError ___signal___: (('No module named ''' @env0:, absoluteName) @env0:, '''')
			]
		]
	].

	"Parent-binding of the just-loaded module is now handled inside
	``registerModule:with:`` (which loadModuleFromPath: calls), so
	the dotted-name binding here is no longer necessary.

	For `from PKG import name1, name2`, ensure each name in fromlist
	that is an as-yet-unloaded submodule is loaded so the subsequent
	attribute access in the importer finds something.  Once
	loadModuleFromPath: returns, the parent-binding has already
	happened via registerModule:."
	fromlist __len__ @env0:> 0 ifTrue: [
		fromlist @env0:do: [:fromName |
			| subName subPath |
			subName := (absoluteName @env0:, '.') @env0:, fromName @env0:asString.
			(self @env0:class lookupModule: subName) ifNil: [
				subPath := self @env0:class ___moduleNameToPath___: subName.
				subPath notNil ifTrue: [
					self @env0:class
						@env0:loadModuleFromPath: subPath name: subName.
				]
			]
		]
	].

	"Return the correct module per CPython semantics"
	^ (isDotted and: [fromlist __len__ == 0])
		ifTrue: [self @env0:class lookupModule: (nameParts @env0:at: 1)]
		ifFalse: [result]
%

category: 'Grail-Built-in Functions'
method: importlib
_import_module: positional kw: kwargs
	"import_module(name, package=None) -> module.
	Delegates to ___import__:kw:."

	| name package absoluteName |
	name := positional @env0:at: 1.
	package := (positional __len__ @env0:> 1)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [kwargs ifNotNil: [kwargs __getitem__: 'package'] ifNil: [None]].

	absoluteName := (name @env0:beginsWith: '.')
		ifTrue: [
			package == None ifTrue: [
				ImportError ___signal___: 'attempted relative import with no known parent package'
			].
			self ___resolve_name___: name package: package
		]
		ifFalse: [name].

	^ self ___import__: {absoluteName} kw: nil
%

category: 'Grail-Built-in Functions'
method: importlib
import_module: name
	"import_module(name) -> module. 1-arg fast path."
	^ self _import_module: { name } kw: nil
%

category: 'Grail-Built-in Functions'
method: importlib
invalidate_caches
	"invalidate_caches() -> None. No-op for built-in modules."
	^ None
%

category: 'Grail-Built-in Functions'
method: importlib
reload: aModule
	"reload(module) -> module. Clears and reinitializes the module."
	| moduleClass |
	moduleClass := aModule @env0:class.
	moduleClass clearInstance.
	^ moduleClass instance
%

set compile_env: 0
