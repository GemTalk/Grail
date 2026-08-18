! ------------------- Superclass check
set compile_env: 0
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- importlib class (Python 'importlib' module)
expectvalue /Class
doit
module subclass: 'importlib'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
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
- runModule: - Execute a module by dotted name as __main__ (like python3 -m)

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
	"Encode a Python CLASS name as its GemStone class name (ClassDefAst, the
	type() builtin).  The GemStone class name IS the class's identity, and
	cls.__name__ / cls.__qualname__ read it straight back -- so it must be the
	Python name unchanged.  Grail does NOT change case: GemStone accepts
	lower-case (and even reserved-word) class names, and a Python class is
	anonymous (in no SymbolDictionary) and never referenced by its bare
	Smalltalk name, so a lower-case name collides with nothing.  Capitalizing
	was pure Smalltalk convention; it made cls.__name__ wrong ('Base_set' for
	``base_set'') and forced a session-local mangled->original registry to
	patch it back -- both now gone.

	MODULE names take ___asSmalltalkModuleName___:, which now applies the SAME
	transform (only `.` -> `_`, no case change) so a module's backing class name
	also matches its Python name.  That backing class DOES land in the
	PythonModules SymbolDictionary -- which IS in the compile symbol list -- so
	the single call site (___buildModuleClass:name:) guards the rare name that
	would shadow a builtin or curated kernel class; the module name itself is no
	longer capitalized.

	The one transform GemStone forces on a class name: `.` is illegal, so a
	dotted Python name replaces each `.` with `_`.

	Examples:
	  ``hello``         → ``hello``
	  ``base_set``      → ``base_set``
	  ``re._parser``    → ``re__parser``
	  ``MyClass``       → ``MyClass``
	  ``_constants``    → ``_constants``"

	^ (aPythonName asString copyReplaceAll: '.' with: '_') asSymbol
%

category: 'Grail-Naming'
classmethod: importlib
___asSmalltalkModuleName___: aPythonName
	"Encode a Python MODULE name as its backing GemStone class name in
	PythonModules.  Same transform as a user class (___asSmalltalkClassName___:):
	the only change is the GemStone-required `.` -> `_`, and case is PRESERVED so
	the Smalltalk class name matches the Python module name (``operator`` ->
	``operator``, ``re._parser`` -> ``re__parser``).  Module names used to be
	capitalized to dodge a collision with Globals in the compile symbol list;
	Globals is no longer in that list (see ___grailCompileSymbolList___), so the
	one remaining hazard -- a name that shadows a builtin or curated kernel class
	-- is handled at the call site (___buildModuleClass:name:), not by mangling
	every module name."

	^ self ___asSmalltalkClassName___: aPythonName
%

category: 'Grail-For Tests'
classmethod: importlib
grailDir
	"Return the absolute path to the Grail project directory.
	SESSION-LOCAL (SessionTemps): the path differs per host/checkout,
	and the old classInstVar write dirtied the committed importlib
	class on every session's setup (multi-user commit conflicts).
	The classInstVar declaration remains but is unused.

	RESOLVED LAZILY (___resolveGrailDir___) when no session has set it, so
	a session that never sends ``grailDir:'' can still import.  This used to
	answer nil, and ___moduleNameToPath___: bails on nil BEFORE touching the
	filesystem -- so every .py-backed module raised ``No module named X''
	while the Smalltalk-implemented ones (os, sys, ...) kept working, which
	reads as a missing stdlib module rather than an unconfigured session.
	``PythonTestCase suite run'' in a bare topaz login hit exactly that, on
	the `import shutil` in ShutilTestCase>>setUp -- one line after an
	`import os` that succeeded.

	The runner scripts (tests/scripts/*.gs, scripts/debugTests.gs,
	scripts/deployFrameworks.gs, ...) all still set this explicitly and
	their write always wins; the fallback is only for a session that did
	not.  Memoised, so the probing happens at most once per session."

	| temps d |
	temps := SessionTemps current.
	d := temps at: #GrailDir otherwise: nil.
	d ifNotNil: [^ d].
	d := self ___resolveGrailDir___.
	d ifNotNil: [temps at: #GrailDir put: d].
	^ d
%

category: 'Grail-Configuration'
classmethod: importlib
grailDir: aString
	"Set the absolute path to the Grail project directory (session-local)."
	SessionTemps current at: #GrailDir put: aString
%

category: 'Grail-Configuration'
classmethod: importlib
___resolveGrailDir___
	"Best guess at the checkout root for a session that never sent
	grailDir:.  Two candidates, in preference order:

	  1. GRAIL_DIR from the GEM's environment.  install.sh exports it
	     (derived from its own location), and a LINKED gem IS the topaz
	     process, so it sees the value exported by the shell.  An RPC gem
	     inherits the NetLDI's environment instead -- which is why
	     tests/scripts/runConcurrentImportRpc.gs templates the path into
	     its script text rather than reading the variable.
	  2. The directory topaz was launched from.

	A candidate that actually holds src/python/stdlib beats one that does
	not, so a stale GRAIL_DIR naming another checkout (this host has more
	than one) or a directory that has since moved cannot outrank a correct
	CWD.  If neither validates, the first non-nil candidate is answered
	anyway -- never worse than the nil this used to return, and
	___moduleNotFoundMessage___: then turns the resulting import failure
	into a configuration message instead of a bogus missing-module one.

	No ``^'' out of the do: block: this is reachable from the CPython
	shim's PyInit user-action callback by way of ___moduleNameToPath___:,
	where a non-local return from a real block raises RT_ERR_CANT_RETURN
	(2079).  Same constraint, and same workaround, as that method."

	| candidates result |
	candidates := OrderedCollection new.
	(System gemEnvironmentVariable: 'GRAIL_DIR') ifNotNil: [:e |
		e isEmpty ifFalse: [candidates add: e]].
	GsFile serverCurrentDirectory ifNotNil: [:c |
		c isEmpty ifFalse: [candidates add: c]].
	result := nil.
	candidates do: [:each |
		(result isNil and: [self ___looksLikeGrailDir___: each])
			ifTrue: [result := each]].
	(result isNil and: [candidates isEmpty not])
		ifTrue: [result := candidates first].
	^ result
%

category: 'Grail-Configuration'
classmethod: importlib
___looksLikeGrailDir___: aPath
	"Could aPath serve as grailDir -- does it hold the bundled stdlib that
	___moduleNameToPath___: searches?  Used both to choose between
	candidates and to tell a MISCONFIGURED session from a genuinely missing
	module.

	existsOnServer: answers nil (not false) when the probe itself errors, so
	compare == true and let nil route to false -- the same guard
	___moduleNameToPath___: applies to its own probes."

	| probe |
	aPath isNil ifTrue: [^ false].
	probe := GsFile existsOnServer: aPath , '/src/python/stdlib'.
	^ probe == true
%

category: 'Grail-Configuration'
classmethod: importlib
grailTmpDir
	"The scratch directory this checkout's fixtures may write to:
	``/tmp/Grail<N>'', created on demand.

	Fixture paths used to be absolute and shared -- /tmp/grail_glob_test,
	/tmp/grail_shutil_test, /tmp/grail_fileio_*.txt, /tmp/grail (the codegen
	capture).  Several checkouts run against one stone on this host as
	separate users (Claude0..Claude3), so concurrent runs collided in the
	filesystem even though their Smalltalk was fully isolated: ShutilTestCase
	and GlobTestCase both `rmtree' their fixture root in setUp, deleting
	another checkout's fixture mid-test, and ImportlibTestCase COUNTS files
	under the codegen-capture directory and asserts deltas.  Nothing about
	that shows up when a suite is run alone.

	The path is memoised, but existence is re-probed on every call: a
	fixture that rmtree's its way up to the root must not leave every later
	test writing into a directory that is no longer there."

	| temps dir |
	temps := SessionTemps current.
	dir := temps at: #GrailTmpDir otherwise: nil.
	dir == nil ifTrue: [
		dir := '/tmp/Grail' , self ___grailTmpIndex___.
		temps at: #GrailTmpDir put: dir].
	(GsFile existsOnServer: dir) == true
		ifFalse: [GsFile createServerDirectory: dir].
	^ dir
%

category: 'Grail-Configuration'
classmethod: importlib
___grailTmpIndex___
	"The N in /tmp/Grail<N>.  Taken from the trailing digits of the GemStone
	USER (Claude0..Claude3), because the concurrently-running gems are what
	must not collide and they differ by user -- one stone, one netldi, four
	users.  Falls back to the trailing digits of the checkout directory
	(Grail-1 -> 1), then to 0.

	CI logs in as DataCurator from a single checkout, so it lands on 0 and
	has nothing to collide with."

	| n |
	n := self ___trailingDigitsOf___:
		([System myUserProfile userId asString]
			on: Error do: [:ex | ex return: '']).
	n isEmpty ifFalse: [^ n].
	n := self ___trailingDigitsOf___: (self ___lastPathComponentOf___: self grailDir).
	n isEmpty ifFalse: [^ n].
	^ '0'
%

category: 'Grail-Configuration'
classmethod: importlib
___trailingDigitsOf___: aString
	"The run of digits at the end of aString, or '' if it ends in a
	non-digit.  'Claude12' -> '12', 'DataCurator' -> ''."

	| i |
	aString isNil ifTrue: [^ ''].
	i := aString size.
	[i > 0 and: [(aString at: i) isDigit]] whileTrue: [i := i - 1].
	^ aString copyFrom: i + 1 to: aString size
%

category: 'Grail-Configuration'
classmethod: importlib
___lastPathComponentOf___: aPath
	"'/a/b/Grail-1' -> 'Grail-1'.  Trailing slashes are ignored so
	'/a/b/Grail-1/' answers the same."

	| p i |
	aPath isNil ifTrue: [^ ''].
	p := aPath.
	[p isEmpty not and: [(p at: p size) = $/]]
		whileTrue: [p := p copyFrom: 1 to: p size - 1].
	i := p size.
	[i > 0 and: [(p at: i) ~= $/]] whileTrue: [i := i - 1].
	^ p copyFrom: i + 1 to: p size
%

category: 'Grail-Module Loading'
classmethod: importlib
___moduleNotFoundMessage___: aName
	"CPython's ``No module named 'x''' wording, plus a configuration hint
	when this session's Grail directory cannot satisfy ANY filesystem
	import.

	The hint is appended only when grailDir holds no src/python/stdlib -- in
	which case no .py-backed module can possibly be found and the bare
	CPython wording actively misleads, naming whichever module happened to
	be imported first.  A correctly configured session gets the CPython text
	unchanged, so conformance tests that match on it are unaffected."

	| msg gd |
	msg := 'No module named ''' , aName , ''''.
	gd := self grailDir.
	(self ___looksLikeGrailDir___: gd) ifTrue: [^ msg].
	^ msg , ' -- and this session''s Grail directory (' , gd printString ,
		') holds no src/python/stdlib, so NO .py-backed module can be found.' ,
		'  Send `importlib grailDir: ''<checkout>''` first (every runner script' ,
		' does), or export GRAIL_DIR, or launch topaz from the checkout root.'
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
		self pause "signal Halt to the GCI debugger"
	].
%

category: 'Grail-Module Loading'
classmethod: importlib
___starExportNamesFor___: aModuleAst
	"Answer the Array of names from a top-level ``__all__ = [ 'a',
	'b' ]'' literal (list or tuple of plain string constants), or nil
	when the module doesn't declare one statically."

	aModuleAst body body do: [:stmt |
		((stmt isKindOf: AssignAst)
			and: [(stmt ___boundTargetNames___) includes: #'__all__']) ifTrue: [
			| valNode elts names ivars idx ok |
			ivars := stmt class allInstVarNames.
			idx := ivars indexOf: #value.
			valNode := stmt instVarAt: idx.
			((valNode isKindOf: ListAst) or: [valNode isKindOf: TupleAst]) ifTrue: [
				elts := valNode elts.
				names := OrderedCollection new.
				ok := true.
				elts do: [:e |
					((e isKindOf: ConstantAst)
						and: [(e value isKindOf: CharacterCollection)])
						ifTrue: [names add: e value asString]
						ifFalse: [ok := false]].
				ok ifTrue: [^ names asArray]
			]
		]
	].
	^ nil
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
				"Names exported by a star-import: the module's top-level
				``__all__ = [...]'' literal when present (CPython
				semantics — django.db.models.enums exports only three
				names while conditionally defining more), else every
				top-level variable that isn't underscore-prefixed."
				expandedNames := self ___starExportNamesFor___: subAst.
				expandedNames isNil ifTrue: [
					expandedNames := subAst body variables asArray
						select: [:n | (n size > 0) and: [(n at: 1) ~= $_]]].
				newAliases := expandedNames collect: [:n |
					AliasAst new
						name: n asSymbol;
						asName: nil;
						yourself ].
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
___buildModuleClass: moduleAst name: moduleName
	"Announce the module's source path to codegen for the duration of the
	compile, then do the work.

	This is the single seam where a ModuleAst carrying a path reaches codegen
	(both loadModuleFromPath: and reload: come through here), so it is the one
	place that has to set CallAst >> sourcePath -- which the PyCode emitters
	read for ``co_filename''.  Restored in an ensure: so a failed compile cannot
	leak a stale path into an unrelated one, and so a nested compile (a module
	whose body imports another) puts its parent's path back on the way out.

	A thin wrapper rather than an indented block around the 260-line body: the
	re-indent would have swamped the change."

	| saved |
	saved := CallAst sourcePath.
	CallAst sourcePath: moduleAst path.
	^ [self ___buildModuleClassBody: moduleAst name: moduleName]
		ensure: [CallAst sourcePath: saved]
%

category: 'Grail-Module Loading'
classmethod: importlib
___buildModuleClassBody: moduleAst name: moduleName
	"Compile a Python module's parsed AST into its Smalltalk class and return
	the class.  Creating the class via ``module subclass:`` re-parents (reuses)
	an existing class of the same name, so calling this again on reload
	recompiles the SAME class in place -- preserving the module instance's
	identity.  Shared by loadModuleFromPath: and reload:."

	| moduleClass moduleClassName variables variableNames stream methodSource sl topLevelDefs functionNames lf |
	"Collect declared variable names from the module body"
	variables := moduleAst body variables.
	variableNames := variables asArray.

	"Build the Smalltalk class name from the Python module name -- the same
	encoding as a user class, so the class name matches the Python module name.
	Guard the ONE hazard a module class has that a user class does not: it lands
	in PythonModules, which IS in the Grail compile symbol list, so a module
	whose encoded name matches a Python builtin or one of the curated kernel
	classes that generated code references by bare name would shadow it -- e.g.
	a module named 'Array' would capture the tuple instantiator's Array
	reference.  In that rare case prefix 'Py'.  (User classes -- ClassDefAst --
	are anonymous, in no dictionary, so they never shadow; Globals is
	deliberately NOT in the compile list, so kernel names Python never sees
	cannot be shadowed.)"
	moduleClassName := self ___asSmalltalkModuleName___: moduleName.
	(self ___moduleNameShadowsCompileScope___: moduleClassName) ifTrue: [
		moduleClassName := ('Py' , moduleClassName asString) asSymbol].

	"Create or recreate the Smalltalk class for this module.  Always go
	through ``module subclass:`` rather than reusing a previously-
	registered binding — when the Grail class hierarchy has shifted
	(e.g. a new instVar on ``module``), Smalltalk's ``subclass:``
	re-parents the existing class on the current ``module``, sweeping
	up the orphan and restoring the singleton invariant for any code
	path that flows through this class.

	Phase A: module globals live in dynamicInstVarAt: storage on the
	instance — NOT in static instVar slots.  This matches Python's
	module-as-dict semantics: setattr/delattr/hasattr all reach the
	same backing store, and `del x` truly removes the binding rather
	than nilling a slot."
	moduleClass := module subclass: moduleClassName
		instVarNames: #()
		classVars: #()
		classInstVars: #()
		poolDictionaries: #()
		inDictionary: PythonModules
		options: #().

	"Compile top-level `def` statements as real methods on the
	module class. Scan for FunctionDefAst nodes, pre-register stubs so
	inter-function calls resolve, then compile real methods."
	lf := Character lf asString.
	sl := self ___grailCompileSymbolList___.
	topLevelDefs := moduleAst body body select: [:stmt |
		stmt isKindOf: FunctionDefAst].
	functionNames := IdentitySet new.
	topLevelDefs do: [:stmt | functionNames add: stmt name asSymbol].

	"Pre-register stub methods for each function so inter-function calls
	resolve during codegen (avoids forward-reference timing issues)."
	topLevelDefs do: [:stmt |
		moduleClass compileMethod: stmt generateModuleMethodStubSource
			dictionaries: sl
			category: 'Grail-Methods'
			environmentId: 1.
	].

	"Class definitions are emitted as runtime statements in the module
	body; no install-time class creation is required."

	"Set compile-time context so CallAst and FunctionDefAst emit module-
	aware code (self-sends, BoundMethod assignments).  Phase A:
	moduleVariableNames tells NameAst/AssignAst/DeleteAst which bare
	names are module-scope (route through dynamicInstVarAt:) versus
	function-local (Smalltalk temps).  Include function names too —
	their BoundMethod handles live in the same dynamic-instVar store
	as plain values, so bare-name reads of ``add'' (`f = add`) emit
	the same dynamicInstVarAt:ifAbsent: probe.  Direct call sites
	`add(...)` are intercepted by CallAst's bare-call dispatcher
	separately and rewritten to ``self add:'' self-sends."
	CallAst moduleClassBeingCompiled: moduleClass.
	"The Python module NAME as well: FunctionDefAst stamps it onto a closure's
	__module__, which a closure cannot otherwise know.  The class's Smalltalk
	name is mangled from the dotted Python one, so the class alone will not do."
	CallAst moduleNameBeingCompiled: moduleName.
	CallAst moduleFunctionNames: functionNames.
	CallAst moduleVariableNames: variables.
	[
		| debugStream debugClassName tpzPath irPath traceDir |
		"Accumulate every method source we hand to compileMethod: into a
		Topaz-style input file under <traceDir>/.  One file per module
		(``__main__'' for the script under runPath:, plus every
		transitively imported module), keyed by Python name, so a
		reader can see all the generated Smalltalk in one place.

		The file is NOT a literal replay of what loadModuleFromPath:
		does — the module class is created here at runtime via
		``module subclass: ...'', not via a topaz ``doit''.  The
		``category:'' / ``method:'' / ``%'' framing is a debugging aid
		that mirrors what GemStone would see if you compiled the
		methods by hand.

		Tracing is OPT-IN: ``___codegenTraceDir___'' returns the value
		of the ``GRAIL_CODEGEN_TRACE_DIR'' env var, or nil if unset.
		When nil, every ``traceDir ifNotNil:'' block below is skipped —
		no debug-stream writes, no file I/O, no IR snapshot.  The
		compile path is unaffected."
		traceDir := self ___codegenTraceDir___.
		traceDir ifNotNil: [
			tpzPath := traceDir , '/' , moduleName , '.tpz'.
			irPath := traceDir , '/' , moduleName , '.ir'.
			debugStream := PrettyWriteStream on: Unicode7 new.
			debugClassName := moduleClassName asString.
			debugStream
				nextPutAll: '! '; nextPutAll: tpzPath;
				nextPutAll: ' — methods compiled by loadModuleFromPath:'; lf;
				nextPutAll: '! Module: '; nextPutAll: moduleName;
				nextPutAll: '   Class: '; nextPutAll: debugClassName; lf; lf;
				"The subclass: call that loadModuleFromPath: makes to create
				the module class.  Phase A: instVarNames is empty — module
				globals live in dynamicInstVarAt: storage.  The parser-seen
				names are emitted as a header comment for reference."
				nextPutAll: '! Phase A module-scope names ('.
			variableNames do: [:n |
				debugStream space; nextPutAll: n asString].
			debugStream
				nextPutAll: ' ) — stored via dynamicInstVarAt:put:'; lf;
				nextPutAll: 'doit'; lf;
				nextPutAll: 'module subclass: '''; nextPutAll: debugClassName; nextPutAll: ''''; lf;
				nextPutAll: '  instVarNames: #()'; lf;
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
			stmt generateModuleMethodSourceOn: methodStream.
			methodSource2 := methodStream contents.
			traceDir ifNotNil: [
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
			"Keyword-call companion: a simple-positional module function
			also gets a varargs ``_name:kw:'' forwarder so a keyword
			call site (django's URL dispatcher passes captured groups as
			kwargs: ``view(request, name='x')'') binds by name instead of
			DNU-ing on the missing varargs selector."
			stmt needsVarargsForwarder ifTrue: [
				| fwdSource |
				fwdSource := stmt generateModuleMethodVarargsForwarderSource.
				traceDir ifNotNil: [
					debugStream
						nextPutAll: 'category: ''Grail-Methods'''; lf;
						nextPutAll: 'method: '; nextPutAll: debugClassName; lf.
					self ___writeMethodSource: fwdSource on: debugStream.
					debugStream nextPutAll: '%'; lf; lf.
				].
				[moduleClass compileMethod: fwdSource
					dictionaries: sl
					category: 'Grail-Methods'
					environmentId: 1.
				] on: CompileWarning do: [:ex | ex resume].
			].
		].

		"Class-side ``___methodCodeTable___'' (function name -> PyCode) for the
		module's top-level defs, the module-scope twin of the table ClassDefAst
		compiles for a class body.  A top-level def is compiled just above as a
		real method on the module class, so -- like a class-body def, and unlike
		a nested def -- it has no ExecBlock to carry the def-time
		``___pyCode___:'' cascade, and ``f.__code__'' would raise AttributeError.
		BoundMethod >> __code__ finds this by walking from the receiver's class,
		which for a module-level function IS this module class."
		topLevelDefs isEmpty ifFalse: [
			| codeTblSrc |
			codeTblSrc := WriteStream on: String new.
			codeTblSrc nextPutAll: '___methodCodeTable___'; nextPutAll: lf.
			codeTblSrc nextPutAll: '	^ ((KeyValueDictionary @env0:new)'.
			topLevelDefs do: [:stmt |
				codeTblSrc nextPutAll: ' @env0:at: '''; nextPutAll: stmt name asString;
					nextPutAll: ''' put: '.
				stmt emitPyCodeExprOn: codeTblSrc qualname: stmt name asString.
				codeTblSrc nextPut: $;].
			codeTblSrc nextPutAll: ' @env0:yourself)'.
			traceDir ifNotNil: [
				debugStream
					nextPutAll: 'category: ''Grail-Tracebacks'''; lf;
					nextPutAll: 'classmethod: '; nextPutAll: debugClassName; lf.
				self ___writeMethodSource: codeTblSrc contents on: debugStream.
				debugStream nextPutAll: '%'; lf; lf.
			].
			[moduleClass class compileMethod: codeTblSrc contents
				dictionaries: sl
				category: 'Grail-Tracebacks'
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
		traceDir ifNotNil: [
			debugStream
				nextPutAll: 'category: ''Grail-Module Body'''; lf;
				nextPutAll: 'method: '; nextPutAll: debugClassName; lf.
			self ___writeMethodSource: methodSource on: debugStream.
			debugStream nextPutAll: '%'; lf.
			"Write as UTF-8 bytes so editors that don't auto-detect
			UTF-16 (most of them) render the file correctly."
			(GsFile open: tpzPath mode: 'wb' onClient: false)
				nextPutAll: debugStream contents encodeAsUTF8;
				close.
		].
		[moduleClass compileMethod: methodSource
			dictionaries: sl
			category: 'Grail-Module Body'
			environmentId: 1.
		] on: CompileWarning do: [:ex | ex resume].

		"Debug aid: capture the IR tree for the body's initialize method
		(the last thing compiled here, before the accessor sweep below).
		Snapshot now so subsequent compileMethod: calls don't overwrite
		__sessionStateAt: 19.  One IR file per module under <traceDir>/."
		traceDir ifNotNil: [
			(GsFile open: irPath mode: 'w' onClient: false)
				nextPutAll: (System __sessionStateAt: 19) printString;
				close.
		].
	] ensure: [
		CallAst moduleClassBeingCompiled: nil.
		CallAst moduleNameBeingCompiled: nil.
		CallAst moduleFunctionNames: nil.
		CallAst moduleVariableNames: nil.
	].
	^ moduleClass
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___canonicalSubclassOf: aParent name: aName module: aModuleName instVarNames: ivNames classInstVarNames: civNames
	"Phase 1 of persistent modules (docs/Persistent_Modules_and_Classes.md).
	MINT (or identity-reuse) the backing class for a module-scope class
	definition.  Runs only on the BUILD path -- when the class-build guard's
	___canonicalClassProbe___:name: missed (flag off, no registry entry, or
	stale source hash).

	FLAG-GUARDED and OFF by default: when disabled this is byte-for-byte the
	old ``aParent ___subclass___: aName ...'', so system-wide behaviour is
	unchanged.  NEVER commits -- import must not own the commit boundary (see
	the doc); the registry entry (and the class) persist only when the
	developer, or an explicit deploy action, next commits.

	When the registry already holds a CLASS for this key (a stale-source
	rebuild, or an eval redefinition), reuse its IDENTITY when it still
	descends from the same parent -- the emitted compiles then refresh its
	methods in place, so already-persisted instances see the updated
	behaviour rather than being stranded on a divergent old class.  A
	changed base (or a non-class registry value, e.g. a decorator wrapper)
	means a changed definition: re-mint.  The final post-decorator object is
	(re)registered by the guard's ___canonicalClassRegister___ epilogue.

	Reuse is a HYBRID -- reused structure, re-executed body -- and the two
	halves have to be reconciled, in opposite directions, or the class ends
	up describing neither revision (docs/Persistent_Modules_and_Classes.md
	Sect. 9.2):

	  - an attribute the new body DROPS has to go.  Nothing in the rebuild
	    removes it: the accessor pair and its slot value are both still
	    there from the previous body, so ``C.doomed'' kept answering the
	    old revision's value.  ___grailResetClassNamespace___ clears the
	    class's own attribute namespace here, BEFORE the emitted accessor
	    compiles and attr stores repopulate it, which is the point in the
	    rebuild that corresponds to CPython handing the class statement a
	    fresh namespace.

	  - an attribute the new body ADDS needs a classInstVar slot, and a
	    reused class CANNOT GROW ONE.  A class attribute is backed by a slot
	    on the metaclass, and a metaclass is never modifiable (``addInstVar:''
	    answers rtErrClassNotModifiable; a modifiable class cannot have
	    instances at all, and a metaclass has one -- the class).  So the
	    accessor ``added ^ added'' does not compile and the class gets a
	    raising stub: the whole class came back as ``NameError: Grail could
	    not compile this method (codegen gap)''.  ___canonicalSlotsSatisfied___
	    tests for it and declines the reuse, which re-mints -- the same
	    answer a changed base gets, and for the same reason: the definition
	    changed in a way the old object cannot represent.  Identity is lost
	    (persisted instances stay on the old class, as they do in CPython,
	    where re-executing a class statement always makes a new type), which
	    is a worse outcome than reuse but a far better one than a class that
	    will not build."

	| key reg existing minted |
	self ___canonicalClassesEnabled___ ifFalse: [
		^ aParent @env1:___subclass___: aName instVarNames: ivNames classInstVarNames: civNames].
	key := aModuleName asString , '.' , aName asString.
	reg := self ___canonicalClassRegistry___.
	existing := reg at: key otherwise: nil.
	"Identity-reuse applies ACROSS body executions (the edit workflow, and
	class stability for re-imports) -- never WITHIN one: a second ``class
	Bar`` statement in the same body run must mint a distinct class, as
	CPython does (each statement is a fresh type).  ___mintedThisLoad___:
	is reset by loadModuleFromPath:/reload: right before the body runs."
	minted := self ___mintedThisLoad___: aModuleName.
	((existing isKindOf: Behavior)
		and: [(minted includes: key) not
		and: [existing superclass == aParent
		and: [self ___canonicalSlotsSatisfied___: existing names: civNames]]])
			ifTrue: [
				minted add: key.
				"Reused structure, fresh namespace -- see the comment above."
				existing @env1:___grailResetClassNamespace___.
				^ existing].
	existing := aParent @env1:___subclass___: aName instVarNames: ivNames classInstVarNames: civNames.
	reg at: key put: existing.
	minted add: key.
	^ existing
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___canonicalSlotsSatisfied___: aClass names: civNames
	"Can aClass's EXISTING structure back every class attribute the new body
	declares?  Answers false as soon as one requested classInstVar slot is
	missing, which is ___canonicalSubclassOf:'s signal to re-mint instead of
	reusing the identity.

	A Grail class attribute (``class C: x = 1'') is a getter/setter pair on the
	metaclass over a real classInstVar slot, so the slot has to exist before the
	rebuild's accessor compiles run.  A reused class cannot acquire one: the
	slots live on the metaclass, GemStone refuses ``addInstVar:'' on a class that
	is not modifiable, and a metaclass is never modifiable -- nor could it be
	made so, since a modifiable class may not have instances and the class IS its
	metaclass's instance.  Without this test the accessor failed to compile and
	the class came back as a raising stub for the whole definition.

	Compares AS STRINGS: allInstVarNames answers Symbols and the caller's civNames
	are the codegen's mangled slot names, which reach here as Strings.  The same
	trap Class >> ___subclass___: documents at its own filter, where an
	identity/equality mismatch made the filter silently do nothing.

	Only the slots MISSING matter.  Extra slots left over from the previous body
	(an attribute the edit deleted) are harmless once
	___grailResetClassNamespace___ has removed their accessors: with no getter
	the value is unreachable from Python, which is exactly the AttributeError the
	deletion should produce."

	| have |
	have := aClass class allInstVarNames collect: [:n | n asString].
	civNames do: [:n |
		(have includes: n asString) ifFalse: [^ false]].
	^ true
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___mintedThisLoad___: aModuleName
	"Per-module set of registry keys already bound by class statements
	DURING THE CURRENT body execution (a plain equality Set -- the keys
	are freshly built strings).  Session-local; reset before each body
	run so cross-execution identity-reuse is unaffected."

	| st map set |
	st := SessionTemps current.
	map := st at: #'GrailMintedThisLoad' otherwise: nil.
	map isNil ifTrue: [
		map := SymbolKeyValueDictionary new.
		st at: #'GrailMintedThisLoad' put: map].
	set := map at: aModuleName asString asSymbol otherwise: nil.
	set isNil ifTrue: [
		set := Set new.
		map at: aModuleName asString asSymbol put: set].
	^ set
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___resetMintedThisLoad___: aModuleName
	"Called right before a module body executes (cold import / reload)."

	| map |
	map := SessionTemps current at: #'GrailMintedThisLoad' otherwise: nil.
	map isNil ifFalse: [
		map removeKey: aModuleName asString asSymbol ifAbsent: []].
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___canonicalClassProbe___: aModuleName name: aClassName
	"Fast-path probe for the emitted class-build guard: return the canonical
	(final, post-decorator) object for module.class when it can be reused
	WITHOUT re-running any of the build -- else nil, which sends the emitted
	code down the full build path.

	Reusable means: the feature flag is on, THIS session's load of the
	module found its source hash equal to the committed hash (recorded by
	loadModuleFromPath: in the session-local hash-state map -- an edited
	source, or a module that never recorded a hash, probes nil and
	rebuilds), and the registry has the key.  On a hit the class binds with
	ZERO ___compileMethod: sends, so a warm import never modifies the
	committed class -- no write-write conflicts between concurrent
	importers, and nothing new for the developer's next commit to sweep up."

	| state |
	self ___canonicalClassesEnabled___ ifFalse: [^ nil].
	state := SessionTemps current at: #'GrailModuleHashState' otherwise: nil.
	state isNil ifTrue: [^ nil].
	((state at: aModuleName asString asSymbol otherwise: nil) == #'match')
		ifFalse: [^ nil].
	^ self ___canonicalClassRegistry___
		at: (aModuleName asString , '.' , aClassName asString)
		otherwise: nil
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___canonicalClassRegister___: aModuleName name: aClassName value: anObject
	"Record the FINAL object a module-scope class statement bound -- after
	the ___pyClassDefined___: metaclass hook and any class decorators (which
	may return a wrapper rather than the class).  Emitted at the end of the
	class-build guard, so the probe hands back exactly what the original
	build produced.  No-op when the flag is off; never commits."

	self ___canonicalClassesEnabled___ ifFalse: [^ anObject].
	self ___canonicalClassRegistry___
		at: (aModuleName asString , '.' , aClassName asString)
		put: anObject.
	"Membership in the canonical-class set is what routes RUNTIME
	class-attribute stores into the session-local overlay
	(object >> ___classAttrOverlayStore___).  Added HERE -- at the end of
	the build, after the class body / metaclass hook / decorators ran --
	so definitional class-body stores land on (and commit with) the class,
	while post-definition mutation stays session-local."
	(anObject isKindOf: Behavior) ifTrue: [
		| set |
		set := UserGlobals at: #'GrailCanonicalClassSet' otherwise: nil.
		set isNil ifTrue: [
			"Reduced-conflict (doc par.10.7 phase 8): concurrent sessions
			cold-importing DIFFERENT modules must not conflict on the shared
			membership structure.  A bag admits duplicates; the only consumer
			is includes: (___classAttrOverlayStore___), so duplicates are
			harmless -- the includes:-guard below merely bounds same-session
			re-registration growth."
			set := RcIdentityBag new.
			UserGlobals at: #'GrailCanonicalClassSet' put: set].
		(set includes: anObject) ifFalse: [set add: anObject]].
	^ anObject
%

category: 'Grail-Deploy Audit'
classmethod: importlib
___deployCheck___: aModuleName
	"Pre-deploy audit (docs/Persistent_Modules_and_Classes.md par.10.4):
	walk the NOT-YET-COMMITTED object graph reachable from module
	aModuleName's instance and report every reachable instance of a
	SESSION-BOUND class -- open GsFile/GsSocket handles,
	Semaphore/GsProcess, a raw CPointer, an SrePattern that cannot
	recompile (no compileArgs), an SreMatch, a WeakReference -- each with
	a short class-path from the module.  These are the values a deploy
	commit would sweep into the repository, where they fault dead / NULL
	in a later session.  Run it BEFORE committing a module you intend to
	deploy; an empty result means the module's new closure is
	commit-clean.

	Bounded to the deploy's NEW closure by following only NON-committed
	references -- an already-committed object is the existing image, not
	this deploy's concern.  Known limitation (v1): a NEW session resource
	held through a pre-committed-but-dirty object is not reached (that
	needs the VM dirty-set); the common case (new resources in new module
	globals / the new class closure) is covered.  Returns a Python list of
	description strings.  Never commits, never mutates."

	| mod worklist visited parents findings count |
	mod := self @env1:lookupModule: aModuleName.
	mod isNil ifTrue: [
		^ list withAll: {
			('deploy_check: module ''' , aModuleName asString
				, ''' is not imported in this session') }].
	worklist := OrderedCollection with: mod.
	visited := IdentitySet new.
	parents := IdentityKeyValueDictionary new.
	findings := OrderedCollection new.
	count := 0.
	[worklist isEmpty] whileFalse: [ | obj |
		obj := worklist removeFirst.
		(visited includes: obj) ifFalse: [
			visited add: obj.
			count := count + 1.
			count > 300000
				ifTrue: [
					findings add: '... deploy_check truncated at 300000 objects'.
					^ list withAll: findings].
			(self ___deploySessionBound___: obj) ifTrue: [
				findings add:
					((self ___deployPathFor___: obj parents: parents)
						, ' -> ' , (self ___deployDescribe___: obj))].
			"Do NOT descend into Behavior (walks whole class/method graph, and
			classes are committed anyway); bytes hold no object refs."
			(obj isKindOf: Behavior) ifFalse: [
				self ___deployRefsOf: obj do: [:ref |
					(ref ~~ nil
						and: [(ref isSpecial) not
						and: [(ref isCommitted) not
						and: [(visited includes: ref) not]]]) ifTrue: [
							(parents includesKey: ref)
								ifFalse: [parents at: ref put: obj].
							worklist add: ref]]]]].
	^ list withAll: findings
%

category: 'Grail-Deploy Audit'
classmethod: importlib
___deploySessionBound___: obj
	"True when obj is an instance of a class that cannot survive a
	commit + fault into a later session (see ___deployCheck___)."

	| cn |
	(obj isKindOf: Semaphore) ifTrue: [^ true].
	(obj isKindOf: GsProcess) ifTrue: [^ true].
	(obj isKindOf: GsFile) ifTrue: [^ true].
	(obj isKindOf: CPointer) ifTrue: [^ true].
	cn := obj class name asString.
	(cn = 'GsSocket') ifTrue: [^ true].
	(cn = 'SreMatch') ifTrue: [^ true].
	(cn = 'WeakReference') ifTrue: [^ true].
	"An SrePattern is fine IF it remembers its compile args (it recompiles
	on first use next session); flag only the un-recompilable ones."
	(cn = 'SrePattern') ifTrue: [
		^ (obj instVarAt: (obj class allInstVarNames indexOf: 'compileArgs')) isNil].
	^ false
%

category: 'Grail-Deploy Audit'
classmethod: importlib
___deployRefsOf: obj do: aBlock
	"Evaluate aBlock with each object directly referenced by obj: named
	instVars, collection contents (dict keys+values), indexed slots of a
	non-collection variable object, and dynamic instVars (module globals /
	PythonInstance attrs).  Bytes objects hold no references."
  | pairs |
	obj class isBytes ifTrue: [^ self].
	1 to: obj class instSize do: [:i |
		aBlock value: (obj instVarAt: i)].
	(obj isKindOf: Collection) ifTrue: [
		(obj respondsTo: #'keysAndValuesDo:')
			ifTrue: [[obj keysAndValuesDo: [:k :v | aBlock value: k. aBlock value: v]]
				on: AbstractException do: [:e | e return: nil]]
			ifFalse: [[obj do: [:e | aBlock value: e]]
				on: AbstractException do: [:e | e return: nil]]]
	ifFalse: [
		(obj class isVariable) ifTrue: [
			1 to: obj size do: [:i | aBlock value: (obj at: i)]]].
	pairs := obj dynamicInstVarPairs .
	1 to: (pairs size - 1) by: 2 do: [:i |
		aBlock value: (pairs at: i + 1)]
%

category: 'Grail-Deploy Audit'
classmethod: importlib
___deployPathFor___: obj parents: parents
	"A short class-name breadcrumb from the module root down to obj, using
	the BFS parent map."

	| chain walker steps |
	chain := OrderedCollection new.
	walker := obj.
	steps := 0.
	[walker notNil and: [steps < 40]] whileTrue: [
		chain addFirst: (walker class name asString).
		walker := parents at: walker otherwise: nil.
		steps := steps + 1].
	^ '.' @env1:join: (list withAll: chain)
%

category: 'Grail-Deploy Audit'
classmethod: importlib
___deployDescribe___: obj
	"A one-line description of a flagged session-bound object."

	| cn |
	cn := obj class name asString.
	(cn = 'SrePattern') ifTrue: [
		^ 'SrePattern (no compileArgs -- cannot recompile in a later session)'].
	(cn = 'GsFile') ifTrue: [^ 'GsFile (open OS file handle -- dead after commit/logout)'].
	(cn = 'GsSocket') ifTrue: [^ 'GsSocket (open socket -- dead after commit/logout)'].
	((obj isKindOf: Semaphore)) ifTrue: [^ 'Semaphore (non-persistable -- commit will FAIL, error 2407)'].
	((obj isKindOf: GsProcess)) ifTrue: [^ 'GsProcess (session thread -- not persistable)'].
	((obj isKindOf: CPointer)) ifTrue: [^ 'CPointer (raw C address -- NULL after commit/logout)'].
	(cn = 'SreMatch') ifTrue: [^ 'SreMatch (match object -- has no recompile path)'].
	(cn = 'WeakReference') ifTrue: [^ 'WeakReference (faults in DEAD in a later session)'].
	^ cn , ' (session-bound)'
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___resetClassAttrOverlay___: aClass
	"Warm-reuse hygiene (docs/Persistent_Modules_and_Classes.md par.7).  Drop
	any session-local class-attr overlay entries recorded for aClass on a
	PRIOR import in this session, so re-executing the module body -- e.g. a
	test that removed the module from sys.modules to force a fresh import, or
	the in-run re-imports the warm-reuse path is built to make cheap -- starts
	the class's runtime attribute state clean instead of inheriting the
	previous run's ``Cls.x = v'' overlay.  Removes only aClass's OWN entry
	(superclass overlay entries belong to other classes); committed
	definitional state on the class itself is untouched.  No-op when the
	canonical-classes flag is off -- the overlay is only ever populated with
	the flag on -- so the emit is behaviour-neutral by default.  Returns
	aClass so it can sit inline in the class-build emit."

	| st ov |
	self ___canonicalClassesEnabled___ ifFalse: [^ aClass].
	st := SessionTemps current.
	ov := st at: #'GrailClassAttrOverlay' otherwise: nil.
	ov == nil ifTrue: [^ aClass].
	(ov includesKey: aClass) ifTrue: [ov removeKey: aClass].
	^ aClass
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___canonicalGenerationCheck___
	"RUNTIME-GENERATION GUARD (docs/Persistent_Modules_and_Classes.md).
	install.gs bumps ``GrailRuntimeGeneration'' on every install: the
	install RECREATES the Python runtime classes (exceptions, builtins),
	so every previously-deployed canonical module's compiled methods still
	reference the OLD class objects -- a warm-bound module then raises
	exceptions no ``except'' clause can match (the class identities
	diverged; uncatchable).  When the committed registries were deployed
	under a different generation, discard them IN-TRANSACTION (a
	non-committing session simply acts cold; the next deploy commits the
	reset) and stamp the deploy generation current so imports re-record
	freshly.

	Memoised per session via SessionTemps -- one check per gem, not one
	per import."

	| st runtimeGen deployGen |
	st := SessionTemps current.
	(st at: #'GrailCanonicalGenChecked' otherwise: nil) == true ifTrue: [^ self].
	st at: #'GrailCanonicalGenChecked' put: true.
	runtimeGen := UserGlobals at: #'GrailRuntimeGeneration' otherwise: 0.
	deployGen := UserGlobals at: #'GrailCanonicalDeployGeneration' otherwise: nil.
	deployGen == runtimeGen ifTrue: [^ self].
	"Stale (or first-ever) deployment: drop every canonical registry."
	#( #'GrailCanonicalModules' #'GrailCanonicalModuleHashes'
	   #'GrailCanonicalClasses' #'GrailCanonicalClassSet' ) do: [:k |
		UserGlobals removeKey: k ifAbsent: []].
	UserGlobals at: #'GrailCanonicalDeployGeneration' put: runtimeGen.
	^ self
%

category: 'Grail-Session'
classmethod: importlib
resetSessionForReinstall
	"Post-install refresh for a LONG-LIVED session (e.g. an MCP / topaz
	session that stays logged in across an ``install.sh'' run).

	install.sh commits recompiled code and bumps ``GrailRuntimeGeneration'',
	but a session that already ran its one-shot ___canonicalGenerationCheck___
	(memoised in SessionTemps as #GrailCanonicalGenChecked) never notices, and
	already-imported module instances stay cached in sys.modules (also
	SessionTemps).  A bare ``abort'' refreshes the DB VIEW -- so recompiled
	Smalltalk methods (AST codegen, Object, ...) are picked up -- but touches
	NEITHER cache, so canonical/built-in Python MODULE instances (operator,
	math, a vendored .py, ...) keep serving their old committed code.  A fresh
	login would rebuild everything; this reproduces that WITHOUT reconnecting.

	Run it from the MCP after each install.sh:
	  importlib resetSessionForReinstall

	Steps: abort (refresh view) -> un-memoise + re-run the generation guard
	(drops the stale canonical registries so imports rebuild cold) -> evict
	every non-bootstrap module from sys.modules, clearing each one's hash-state
	verdict and SessionDict caches, so the next import re-reads it from disk.

	Returns the number of modules evicted."

	| st mods keep hashState toEvict |
	System @env0:abortTransaction.
	"Rebuild the session's transient method dictionaries from the (now
	refreshed) committed GsPackage, so recompiled env-1 kernel extensions
	installed as session methods are picked up without a fresh login.  Guarded:
	only when a session-method policy is enabled for this user."
	(GsPackagePolicy @env0:currentOrNil) @env0:ifNotNil: [:pol |
		pol @env0:enabled @env0:ifTrue: [pol @env0:refreshSessionMethodDictionary]].
	st := SessionTemps @env0:current.
	"1. Un-memoise + re-run the generation guard.  With the deploy generation
	now behind the freshly-installed runtime generation, it drops the stale
	canonical registries; imports then rebuild cold from disk."
	st @env0:removeKey: #'GrailCanonicalGenChecked' ifAbsent: [].
	self ___canonicalGenerationCheck___.
	"2. Evict cached module instances so the next import rebuilds from source.
	Keep the bootstrap modules the import machinery itself rides on -- their
	Smalltalk methods already refreshed via the abort above."
	keep := Set @env0:withAll: #('sys' 'builtins' 'importlib' '_imp' '_thread' 'gc').
	mods := self @env1:modules.
	hashState := st @env0:at: #'GrailModuleHashState' otherwise: nil.
	toEvict := OrderedCollection @env0:new.
	mods @env0:keysDo: [:k |
		(keep @env0:includes: k @env0:asString) @env0:ifFalse: [toEvict @env0:add: k]].
	toEvict @env0:do: [:k |
		self removeModule: k @env0:asString.
		hashState @env0:ifNotNil: [:hs |
			hs @env0:removeKey: k ifAbsent: [].
			hs @env0:removeKey: k @env0:asString ifAbsent: []]].
	^ toEvict @env0:size
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___canonicalModuleHashes___
	"Committed (module dotted-name -> source sha1Sum) map.  A later
	session's import compares the current source hash against this to
	decide warm (reuse committed classes, skip parse) vs cold (rebuild,
	re-register, update hash).  Lives beside the class registry in
	UserGlobals; persists only when the developer / deploy action commits."

	| reg |
	self ___canonicalGenerationCheck___.
	reg := UserGlobals at: #'GrailCanonicalModuleHashes' otherwise: nil.
	reg isNil ifTrue: [
		"Reduced-conflict (doc par.10.7 phase 8): non-overlapping module
		keys from concurrent first importers merge instead of conflicting."
		reg := RcKeyValueDictionary new.
		UserGlobals at: #'GrailCanonicalModuleHashes' put: reg].
	^ reg
%

category: 'Grail-Persistent State'
classmethod: importlib
___persistentModuleState___
	"Committed (module dotted-name -> (global-name -> value)) store backing
	the ``__persistent__ = [...]'' module marker
	(docs/Persistent_Modules_and_Classes.md par.6).  Module globals are
	session-local by default; a name listed in a module's ``__persistent__''
	list is bound from here on import and flushed back here by
	gemstone.system.commit().  Lazily created in the current transaction;
	persists only when the developer / deploy action commits.  Concurrency
	is the developer's concern: Grail imposes no RC* policy -- a plain
	shared value that conflicts is the signal to choose a conflict-safe one."

	| store |
	store := UserGlobals at: #'GrailPersistentModuleState' otherwise: nil.
	store isNil ifTrue: [
		store := KeyValueDictionary new.
		UserGlobals at: #'GrailPersistentModuleState' put: store].
	^ store
%

category: 'Grail-Persistent State'
classmethod: importlib
___syncPersistentState___: aModule
	"Bind-or-capture pass run after a module's body executes.  For each
	name in the module's ``__persistent__'' list: when the committed store
	already holds the name, REBIND the module global to the committed value
	(the body's initializer ran, but the committed value wins -- CPython's
	``initializer runs once per process'' lifted to once per repository);
	when absent, CAPTURE the initializer's value into the store
	(first-import, in-transaction only -- import never commits).  A module
	with no ``__persistent__'' global is untouched.

	The intended usage is a persistent MUTABLE object (an RC* collection,
	a dict): the binding is restored here, and in-place mutations are
	ordinary GemStone object writes the developer commits.  REBINDING a
	persistent name mid-session persists at the developer's own
	gemstone.system.commit(), which flushes via
	___flushPersistentState___."

	| names store inner modName |
	names := aModule dynamicInstVarAt: #'__persistent__'.
	names == nil ifTrue: [^ aModule].
	(names isKindOf: Collection) ifFalse: [^ aModule].
	modName := (aModule @env1:__name__) asString.
	store := self ___persistentModuleState___.
	inner := store at: modName otherwise: nil.
	inner isNil ifTrue: [
		inner := KeyValueDictionary new.
		store at: modName put: inner].
	names do: [:each |
		| nameStr sym current |
		nameStr := each asString.
		sym := nameStr asSymbol.
		(inner includesKey: nameStr)
			ifTrue: [aModule dynamicInstVarAt: sym put: (inner at: nameStr)]
			ifFalse: [
				current := aModule dynamicInstVarAt: sym.
				current == nil ifFalse: [inner at: nameStr put: current]]].
	^ aModule
%

category: 'Grail-Persistent State'
classmethod: importlib
___flushPersistentState___
	"Write every loaded module's ``__persistent__''-listed globals into the
	committed store.  Called by gemstone.system.commit() just before the
	GemStone commit -- the developer's OWN commit boundary is the
	write-through point for persistent-name REBINDS (in-place mutations of
	persistent objects need no flush).  Direct Smalltalk ``System commit''
	bypasses this; the Python-visible commit is the supported API."

	| store |
	store := self ___persistentModuleState___.
	(self @env1:modules) keysAndValuesDo: [:modKey :mod |
		| names inner |
		names := [mod dynamicInstVarAt: #'__persistent__']
			on: Error do: [:ex | ex return: nil].
		(names ~~ nil and: [names isKindOf: Collection]) ifTrue: [
			inner := store at: modKey asString otherwise: nil.
			inner isNil ifTrue: [
				inner := KeyValueDictionary new.
				store at: modKey asString put: inner].
			names do: [:each |
				| current |
				current := mod dynamicInstVarAt: each asString asSymbol.
				current == nil ifFalse: [
					inner at: each asString put: current]]]].
	^ self
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___sourceStringForPath___: pathString
	"The decoded source text of a .py file -- the read half of astForPath:,
	split out so loadModuleFromPath: can hash the source before deciding
	whether to parse it at all."

	| file sourceString |
	file := GsFile open: pathString mode: 'rb' onClient: false.
	sourceString := file contentsAsUtf8 decodeToUnicode.
	file close.
	^ sourceString
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___canonicalClassRegistry___
	"Committed (module.qualname -> class) map backing canonical-class reuse.
	Lives in UserGlobals so it survives sessions.  Reduced-conflict (doc
	par.10.7 phase 8): two sessions concurrently cold-importing and
	committing DIFFERENT modules add disjoint keys, which an
	RcKeyValueDictionary merges instead of conflicting; a same-module race
	resolves last-writer-wins on replay -- one build becomes canonical and
	the next session binds it (the loser's session-local classes simply
	never get committed reuse).  Created lazily in the current transaction;
	persists only when that transaction commits."

	| reg |
	self ___canonicalGenerationCheck___.
	reg := UserGlobals at: #'GrailCanonicalClasses' otherwise: nil.
	reg isNil ifTrue: [
		reg := RcKeyValueDictionary new.
		UserGlobals at: #'GrailCanonicalClasses' put: reg].
	^ reg
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___canonicalModules___
	"Committed (module dotted-name -> module INSTANCE) registry -- the unit
	of warm-bind import semantics (doc par.10).  A cold flag-on import
	records its instance here IN-TRANSACTION (import never commits, par.4.1);
	the instance -- and, via reachability, its whole globals graph: the
	classes AND the module-level state they captured at definition time --
	persists when the developer/deploy next commits.  A later session's
	import that finds an entry (source hash matching) BINDS it instead of
	re-running the module body, so definition-time wiring (@dataclass
	against its MISSING sentinel, @enum.global_enum name injection,
	decorator registrations) is never torn from the state it captured.
	Lives beside the class registry; same lazy-create-in-transaction
	pattern."

	| reg |
	self ___canonicalGenerationCheck___.
	reg := UserGlobals at: #'GrailCanonicalModules' otherwise: nil.
	reg isNil ifTrue: [
		"Reduced-conflict, same rationale as ___canonicalClassRegistry___."
		reg := RcKeyValueDictionary new.
		UserGlobals at: #'GrailCanonicalModules' put: reg].
	^ reg
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___canonicalRegistrySnapshot___
	"Snapshot of everything the canonical machinery can COMMIT: the key
	sets of the three registries, the class-set membership, and
	PythonModules' keys.  A test that deploys (commits) module closures
	stores this snapshot first and hands it to
	___canonicalRegistryRestore___: afterwards, so the test removes
	EXACTLY what it added -- a standing framework deployment (doc par.4.1
	deploy action) survives the regression scripts instead of being nuked
	by wholesale registry-key removal."

	^ Array
		with: self ___canonicalClassRegistry___ keys asIdentitySet
		with: self ___canonicalModuleHashes___ keys asIdentitySet
		with: self ___canonicalModules___ keys asIdentitySet
		with: ((UserGlobals at: #'GrailCanonicalClassSet' otherwise: nil)
			ifNil: [IdentitySet new]
			ifNotNil: [:bag | bag asIdentitySet])
		with: PythonModules keys asIdentitySet
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___canonicalRegistryRestore___: aSnapshot
	"Remove every canonical-registry entry, class-set member, and
	PythonModules class added since aSnapshot (___canonicalRegistrySnapshot___).
	Pre-existing entries -- e.g. a standing framework deployment -- are
	untouched.  The caller commits."

	| snap reg |
	snap := aSnapshot.
	reg := self ___canonicalClassRegistry___.
	reg keys do: [:k |
		((snap at: 1) includes: k) ifFalse: [reg removeKey: k ifAbsent: []]].
	reg := self ___canonicalModuleHashes___.
	reg keys do: [:k |
		((snap at: 2) includes: k) ifFalse: [reg removeKey: k ifAbsent: []]].
	reg := self ___canonicalModules___.
	reg keys do: [:k |
		((snap at: 3) includes: k) ifFalse: [reg removeKey: k ifAbsent: []]].
	(UserGlobals at: #'GrailCanonicalClassSet' otherwise: nil) ifNotNil: [:bag |
		bag asIdentitySet do: [:cls |
			((snap at: 4) includes: cls) ifFalse: [
				[bag removeAll: (Array with: cls)] on: Error do: [:e | nil]]]].
	PythonModules keys do: [:k |
		((snap at: 5) includes: k) ifFalse: [PythonModules removeKey: k ifAbsent: []]].
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___canonicalClassesEnabled___
	"Session-local feature flag (default OFF) for phase-1 canonical classes.
	OFF -> ___canonicalSubclassOf: behaves exactly like ___subclass___, so the
	whole system is unchanged; flip ON per session to exercise reuse."

	^ (SessionTemps current at: #'GrailCanonicalClassesEnabled' otherwise: false) == true
%

category: 'Grail-Canonical Classes'
classmethod: importlib
___canonicalClassesEnabled___: aBool
	"Enable/disable phase-1 canonical-class reuse for THIS session only."

	SessionTemps current at: #'GrailCanonicalClassesEnabled' put: aBool == true.
	^ aBool
%

category: 'Grail-Module Loading'
classmethod: importlib
___canonicalInstanceForModuleClass___: aModuleClass
	"LAZY FIRST-TOUCH bind (doc par.10.4): committed code can reach a
	dependency module's globals through the session-singleton path
	(module class >> instance) without any import having run in this
	session -- a deployed Flask closure resolves contextvars' _MISSING
	sentinel that way while serving a request.  Minting a fresh instance
	there re-runs the module body and re-mints its singletons, breaking
	identity checks against committed state (the exact par.10.1 failure,
	resurfacing through the singleton path instead of import).

	When the canonical flag is on and the registry holds a COMMITTED
	instance of aModuleClass: adopt it as the session singleton FIRST
	(so a __session_init__ that reads its own module's globals does not
	recurse back here), register it in sys.modules (a later explicit
	import is then a cache hit on the same instance), run the session
	hook, and answer it.  Answers nil when nothing applies -- the caller
	keeps the old mint-fresh behavior.  No hash check: committed code
	referencing committed dependencies wants the instance it was
	deployed with; staleness is the next explicit import's concern."

	self ___canonicalClassesEnabled___ ifFalse: [^ nil].
	self ___canonicalModules___ keysAndValuesDo: [:aName :inst |
		((inst class == aModuleClass) and: [inst isCommitted]) ifTrue: [
			aModuleClass ___adoptInstance___: inst.
			self registerModule: aName asString with: inst.
			self ___runSessionInit___: inst.
			^ inst]].
	^ nil
%

category: 'Grail-Module Loading'
classmethod: importlib
___runSessionInit___: moduleInstance
	"SESSION TIER (docs/Persistent_Modules_and_Classes.md par.10.4): run the
	module's ``def __session_init__():`` hook, when it defines one.  The
	hook is the explicit home for per-session resources a committed module
	instance cannot carry across sessions -- open files/sockets, GsFile /
	Transcript handles, environment snapshots -- re-binding them each
	session the way GemStone code re-initializes SessionTemps state.

	Called once per session per module, at every point the session
	ACQUIRES the module's code: after a cold body run, after a warm BIND
	of the committed instance (where the body did not run), and after an
	explicit reload().  A sys.modules cache hit does not re-run it.  Values
	the hook binds land on the module instance like any global; a hook that
	ran before a developer commit may leave a dead handle committed, but
	the next session's hook re-binds the name at import before use --
	correctness first, extent hygiene via SessionDict
	(src/python/stdlib/_grail_session.py) where it matters.

	Zero-arg by contract (it is a module function, not a method); a hook
	declared with parameters fails its unary dispatch loudly rather than
	being silently skipped."

	((moduleInstance class whichClassIncludesSelector: #'__session_init__' environmentId: 1) ~~ nil)
		ifTrue: [moduleInstance perform: #'__session_init__' env: 1].
	^ moduleInstance
%

category: 'Private'
classmethod: importlib
_stateMap
  | map tmps key |
	map := (tmps := SessionTemps current) at: (key := #'GrailModuleHashState') otherwise: nil.
	map ifNil:[
		map := SymbolKeyValueDictionary new.
	  tmps at: key put: map .
  ].
  ^ map
%
category: 'Private'
method: importlib
_stateMap
  ^ self class _stateMap
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

	| moduleAst moduleClass moduleInstance nameParts packageName
	  canonical srcString srcHash hashes hashState stateMap |
	"Canonical-classes source hash (docs/Persistent_Modules_and_Classes.md).
	When the feature flag is on, hash the source FIRST and compare against
	the committed per-module hash: a match means the committed module class
	(and, via the emitted class-build guards, every canonical user class)
	can be reused verbatim -- skip the parse and every compile.  A miss
	(first-ever import, or the source changed) takes the cold path below and
	records the new hash -- in the current transaction only; import never
	commits.  The match/stale verdict is stashed session-locally so the
	___canonicalClassProbe___ calls inside the module body (which runs in
	both cases) know whether registry entries for THIS module are current.
	Flag off -> zero overhead, exactly the old path."
	canonical := self ___canonicalClassesEnabled___.
	canonical ifTrue: [
		srcString := self ___sourceStringForPath___: pathString.
		srcHash := srcString sha1Sum.
		hashes := self ___canonicalModuleHashes___.
		hashState := ((hashes at: moduleName otherwise: nil) = srcHash)
			ifTrue: [#'match'] ifFalse: [#'stale'].
    stateMap := self _stateMap .
		"Phase-5 warm BIND (doc par.10.2): a committed module INSTANCE with
		matching source binds -- register in sys.modules, adopt as the class's
		session singleton, return.  The module body does NOT re-run: the
		instance already carries everything the one deploy-time execution
		produced, so the classes and the state they captured stay one
		consistent graph.  Checked BEFORE recording this attempt's verdict:
		an existing hash-state entry means THIS session already imported the
		module, so reaching here (a sys.modules miss) means it was deleted --
		a deliberate fresh-execution request that binding would silently
		betray.  Raise with instructions instead (doc par.10.5; within a
		session, flag-on either matches CPython or raises).  A failed cold
		import never recorded a hash-state entry or a registry instance, so
		CPython's delete-then-retry recovery path stays cold and guard-free."
		hashState == #'match' ifTrue: [
			| committedInstance |
			committedInstance := self ___canonicalModules___ at: moduleName otherwise: nil.
			"isCommitted is what makes ''deployed'' precise: a registry entry
			this session recorded in-transaction (and never committed) is NOT
			deployed -- a non-committing session keeps today's cold-ish
			semantics throughout (and its forced re-imports keep working,
			e.g. the flag-on overlay regression's per-test fixture reloads).
			Only an instance actually IN the committed repository binds or
			guards."
			(committedInstance isNil or: [committedInstance isCommitted not]) ifFalse: [
				"Guard = entry present AND sys.modules actually missing (the
				par.10.5 detection in full): a prior load this session followed
				by a genuine deletion is a deliberate fresh-execution request.
				A DIRECT loadModuleFromPath: call while the module is still
				cached (test harnesses do this) is not a deletion -- fall
				through and re-bind the same committed instance."
				((stateMap at: moduleName asSymbol otherwise: nil) notNil
					and: [(self @env1:lookupModule: moduleName) isNil]) ifTrue: [
					ImportError @env1:___signal___: 'module ''' , moduleName ,
						''' is canonical (deployed); it was removed from sys.modules in this session. Use importlib.reload() to re-execute it, or assign a replacement into sys.modules to substitute it.'].
				stateMap at: moduleName asSymbol put: #'match'.
				committedInstance class ___adoptInstance___: committedInstance.
				self registerModule: moduleName with: committedInstance.
				"Session tier (par.10.4): the body did not run, so this is the
				one chance to re-bind per-session resources."
				self ___runSessionInit___: committedInstance.
				^ committedInstance]].
		"Record #stale REGARDLESS of the hash verdict: this load is about to
		RE-RUN the module body (only the warm-bind branch above skips it),
		and par.10 semantics require re-execution to be FULLY cold -- the
		emitted class-def probes must MISS so definition wiring (metaclass
		hook, decorators, global injection) re-runs against freshly
		rebuilt classes.  Reuse-code + re-run-body was the incoherent
		hybrid par.10.1 documents; a probe hit is only ever sound when the
		whole committed instance binds.  (The entry's presence, not its
		value, is what the par.10.5 delete-and-reimport guard keys on.)
		A cold load is FULLY cold: the phase-1b module-CLASS reuse (skip
		parse+codegen on a same-session hash match) is gone too -- it made
		re-execution skip the codegen step, whose observable artifacts
		(the codegen-trace debug dumps, freshly compiled module-level defs)
		re-import is entitled to.  The compile savings live in the
		warm-bind path, where NOTHING re-runs."
		stateMap at: moduleName asSymbol put: #'stale'].

	moduleClass isNil ifTrue: [
		moduleAst := canonical
			ifTrue: [(ModuleAst parseSource: srcString) path: pathString; yourself]
			ifFalse: [self astForPath: pathString].
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

		moduleClass := self ___buildModuleClass: moduleAst name: moduleName.
		canonical ifTrue: [hashes at: moduleName put: srcHash]].

	"Phase A: no per-variable accessor methods are generated.  Module
	globals live in dynamicInstVarAt: storage and are read/written
	directly via the codegen in NameAst/AssignAst/DeleteAst."

	"Create an instance, set metadata, register, then run.
	Must use @env0:new (not basicNew) because module inherits from
	SymbolDictionary, which requires internal structure initialization."
	moduleInstance := moduleClass new.
	"Adopt as the class's singleton BEFORE running initialize.  Module
	body code that references its own class names through
	``(modCls @env0:___instance___) @env1:Foo'' (NameAst's emit for
	module-scope free names in class-method context) would otherwise
	trigger ``instance''s lazy-create path, mint a SECOND instance,
	run initialize on it, and produce parallel copies of every class
	the module defines.  See FlaskScaffoldingTestCase >>
	testModuleSingletonReturnsSameClass for the regression fixture."
	moduleClass ___adoptInstance___: moduleInstance.
	nameParts := $. split: moduleName.
	packageName := (nameParts size > 1)
		ifTrue: ['.' @env1:join: (nameParts copyFrom: 1 to: nameParts size - 1)]
		ifFalse: [None].
	moduleInstance
		@env1:__name__: moduleName;
		@env1:__package__: packageName.
	"Record the source path so importlib.reload(module) can re-read it.  Stored
	in the Phase-A dynamic-instVar store, so Python ``module.__file__'' reads it
	through ___pyAttrLoad___ like any other module attribute."
	moduleInstance dynamicInstVarAt: #'__file__' put: pathString.
	"PEP 302 ``__loader__''.  Not cosmetic: linecache resolves a filename that
	is not on disk through the CALLING module's loader (get_source), which is
	how CPython shows source for a frame whose co_filename does not name a
	readable file.  With no __loader__ that lookup silently answered [] --
	see PySourceFileLoader."
	moduleInstance dynamicInstVarAt: #'__loader__'
		put: (PySourceFileLoader name: moduleName path: pathString).
	(pathString endsWith: '__init__.py') ifTrue: [
		| dirPath |
		dirPath := pathString copyFrom: 1 to: pathString size - '/__init__.py' size.
		moduleInstance @env1:__path__: { dirPath }.
		moduleInstance @env1:__package__: moduleName.
	].
	"Register BEFORE execution so circular imports resolve"
	self registerModule: moduleName with: moduleInstance.
	"Execute the module body.  Registration happens BEFORE the body runs (so
	circular imports see a module object), which means a body that raises
	would otherwise leave a half-built module stuck in sys.modules — its
	top-level globals (e.g. re's ``RegexFlag'') never got assigned.  A later
	``import'' would then no-op and hand back that corrupt instance.  Unload
	it (whole subtree + session caches) on failure so the next import
	rebuilds cleanly from source, then re-signal."
	canonical ifTrue: [self ___resetMintedThisLoad___: moduleName].
	"___recursionGuard___ turns a runaway recursion in the module body into a
	catchable Python RecursionError instead of an AlmostOutOfStack notification
	that no ``except'' can contain.  It is INSIDE the unload handler so a module
	that overflows is still removed from sys.modules like any other failure."
	"The module name is pushed for the duration of the BODY so that code
	running at module level can be told which module it belongs to.  Grail's
	frame chain does not represent a module body as a Python frame -- a
	module-level sys._getframe(0) answers ``call stack is not deep enough'' --
	so ___callerModuleName___ has nothing to match there and falls back to
	this.  A STACK, not a variable, because a module body imports other
	modules and the innermost one is the answer.  ensure:, so a body that
	raises still pops."
	self ___pushInitializingModule___: moduleName.
	[[BaseException @env1:___recursionGuard___: [moduleInstance @env1:initialize]]
		on: AbstractException do: [:ex |
			self removeModule: moduleName.
			ex outer]]
		ensure: [self ___popInitializingModule___].
	"Persistent-state bind/capture for modules declaring ``__persistent__''
	(docs/Persistent_Modules_and_Classes.md par.6) -- a no-op for the rest."
	self ___syncPersistentState___: moduleInstance.
	"Session tier (par.10.4): runs on the cold path too, so a module author
	gets ONE uniform per-session hook regardless of how the session
	acquired the module (cold build here, warm bind above)."
	self ___runSessionInit___: moduleInstance.
	"Phase-5 (doc par.10): record this cold import's instance in the
	canonical-module registry, IN-TRANSACTION (import never commits).  It
	persists -- with its whole globals graph, via reachability -- when the
	developer/deploy next commits; a later session's matching import then
	warm-BINDS it instead of re-running the body.  Recorded only after the
	body ran to completion (a raise above unloaded the module and
	re-signalled), so the registry never holds a half-built instance."
	canonical ifTrue: [
		self ___canonicalModules___ at: moduleName put: moduleInstance].
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
	mods at: aName asSymbol put: aModule.
	parts := $. split: aName.
	parts size > 1 ifTrue: [
		parentName := '.' join: (parts copyFrom: 1 to: parts size - 1).
		parent := self @env1:lookupModule: parentName.
		parent notNil ifTrue: [
			self ___bind: aModule onParent: parent as: parts last
		].
	].
	"Rescue previously-orphaned children: any sys.modules key of
	form ``aName.child`` should be bound on aModule as `child`."
	prefix := aName , '.'.
	mods keysAndValuesDo: [:key :child |
		| kStr |
		kStr := key asString.
		((kStr size > prefix size)
			and: [(kStr copyFrom: 1 to: prefix size) = prefix
			and: [(kStr indexOf: $. startingAt: prefix size + 1) = 0]])
			ifTrue: [
				| childLeafName |
				childLeafName := kStr copyFrom: prefix size + 1 to: kStr size.
				self ___bind: child onParent: aModule as: childLeafName
			]
	].
%

category: 'Grail-Module Registry'
classmethod: importlib
___bind: aChildModule onParent: aParent as: anAttrName
	"Bind aChildModule on aParent under anAttrName.  Writes to
	BOTH the parent's SymbolDictionary slot (so `self at:`
	fallbacks see it) AND the parent's dynamic instVar storage (so
	Phase A attribute reads via `dynamicInstVarAt:ifAbsent:` find
	the child module).  Both writes matter for cross-module
	resolution: SymbolDictionary inheritance still backs legacy
	read paths, and dynamic instVars are the Phase A canonical
	storage that NameAst / AssignAst codegen consult."

	| sym |
	sym := anAttrName asSymbol.
	"Don't let a like-named submodule clobber a NATIVE parent module's
	own attribute accessor.  ``html'' (Smalltalk html.gs) compiles an
	``entities'' method returning Grail's curated HTML-entities table
	(which Grail's ``unescape'' and HtmlTestCase validate — its keys
	are semicolon-less, e.g. ``acE'' not CPython's ``acE;'').  Django's
	``from html.parser import HTMLParser'' pulls in the vendored
	``html.entities'' submodule; that submodule stays reachable through
	sys.modules (``from html.entities import html5'' still resolves by
	name, so the parser gets the full CPython table) but must NOT
	overwrite html's native ``entities'' attribute.

	Scoped to NATIVE modules (hand-written Smalltalk module subclasses
	in the ``Python'' dictionary): a LOADED Python module's class lives
	in ``PythonModules'' and its top-level ``def''s are genuine
	attributes that a like-named submodule legitimately shadows — e.g.
	twilio's ``from twilio.base import values'' must see the ``values''
	SUBMODULE, so binding there must proceed normally."
	(((aParent class whichClassIncludesSelector: sym environmentId: 1) notNil)
		and: [(PythonModules includesKey: aParent class name asSymbol) not])
		ifTrue: [^ self].
	aParent at: sym put: aChildModule.
	aParent dynamicInstVarAt: sym put: aChildModule.
%

category: 'Grail-Module Registry'
classmethod: importlib
removeModule: aName
	"Unload ``aName`` and every submodule ``aName.*`` from sys.modules,
	clearing each one's session-local caches (SessionTemps) on the way out.

	Use this instead of a raw ``modules removeKey:'' when a caller wants a
	module gone so the next import rebuilds it from source.  CPython relies
	on process death to discard a module's transient state; a long-lived Gem
	has no such reset, so two things must be swept here that a bare
	removeKey: leaves behind and which otherwise break a later re-import:

	  * Submodules.  Removing ``re'' but leaving ``re._parser'',
	    ``re._compiler'', ``re._constants'', ... cached yields an
	    inconsistent package — the stale children still point at the old
	    parent/_constants.  A clean unload removes the whole subtree.

	  * Session caches.  A module-level cache backed by ``SessionDict''
	    (see gemstone>>sessionDict:) lives in SessionTemps keyed by the
	    cache name, NOT on the module instance.  It therefore survives a
	    removeKey: and a fresh import would re-bind ``_cache'' to the SAME
	    stale dict (e.g. re's pattern cache holding dead SrePattern
	    wrappers).  Clearing them here makes the rebuilt module truly fresh.

	Returns the number of registry entries removed."

	| mods prefix toRemove |
	mods := self @env1:modules.
	prefix := aName , '.'.
	toRemove := OrderedCollection new.
	mods keysDo: [:key |
		| k |
		k := key asString.
		((k = aName)
			or: [(k size > prefix size)
				and: [(k copyFrom: 1 to: prefix size) = prefix]])
			ifTrue: [toRemove add: key]].
	toRemove do: [:key |
		mods removeKey: key ifAbsent: [].
		self ___clearSessionCachesFor___: key asString].
	^ toRemove size
%

category: 'Grail-Module Registry'
classmethod: importlib
___clearSessionCachesFor___: aName
	"Remove every SessionTemps entry that backs a ``SessionDict'' belonging
	to module ``aName'' — both the exact name and any ``aName.<cache>''
	sub-name.  Keys follow gemstone>>sessionDict:'s convention:
	``___GrailSessionDict___'' , <cacheName>.  A module ``re'' owns caches
	named ``re._cache'', ``re._cache2'', ``re._compile_template'', so the
	dotted-prefix match sweeps all three when aName is ``re''."

	| temps exact dotPrefix toRemove |
	temps := SessionTemps current.
	exact := ('___GrailSessionDict___' , aName) asSymbol.
	dotPrefix := ('___GrailSessionDict___' , aName) , '.'.
	toRemove := OrderedCollection new.
	temps keysDo: [:key |
		| k |
		k := key asString.
		((key == exact)
			or: [(k size > dotPrefix size)
				and: [(k copyFrom: 1 to: dotPrefix size) = dotPrefix]])
			ifTrue: [toRemove add: key]].
	toRemove do: [:key | temps removeKey: key ifAbsent: []].
%

category: 'Grail-Module Loading'
classmethod: importlib
runPath: pathString
	"Execute a Python file as __main__ (like running 'python3 file.py').

	Routes through loadModuleFromPath: so class definitions, top-level
	`def`s, and module body share one codegen path.

	OPT-IN codegen tracing: when the ``GRAIL_CODEGEN_TRACE_DIR'' env
	var is set, loadModuleFromPath: captures every method source it
	compiles to ``<dir>/<module>.tpz'' (Topaz-style framing with
	``category:'' / ``method:'' / ``%'') and the body initialize IR
	tree to ``<dir>/<module>.ir''.  ``runPath:'' itself sees a file
	at ``<dir>/__main__.tpz''; transitively imported modules show up
	beside it (itertools.tpz, urllib.parse.tpz, ...).  When the env
	var is unset (default), no debug capture happens — saves
	O(generated-source-size) per module load.

	Example:
	    GRAIL_CODEGEN_TRACE_DIR=/tmp/Grail0/codegen topaz -l < session.tpz

	(Give each checkout its own directory -- several checkouts share one
	stone on the dev host, and the capture is written by file name, so a
	shared trace directory means they overwrite each other's dumps.
	ImportlibTestCase uses ``importlib grailTmpDir , '/codegen''' for
	exactly that reason.)

	importlib runPath: '/path/to/script.py'.
	"
	^ self loadModuleFromPath: pathString name: '__main__'
%

category: 'Grail-Module Loading'
classmethod: importlib
runModule: aName
	"Resolve a dotted module name to a file and execute it as __main__
	(like running ``python3 -m aName'').  Reuses ___moduleNameToPath___:
	for resolution and loadModuleFromPath:name: for execution, so class
	defs / top-level defs / body share the one codegen path that runPath:
	and the import machinery already use.  Signals a Python
	ModuleNotFoundError when the name does not resolve to a file on the
	loader search path.

	NOTE: for a stock CPython test module this runs the whole module
	body, including any trailing ``if __name__ == '__main__':
	unittest.main()'' tail — which raises TypeError because Grail's
	unittest.main() requires an explicit ``module='' argument (it has no
	__main__ introspection).  That is faithful ``-m'' behavior.  The
	regression-test SCORING path (scripts/run_one_cpython_module.gs)
	deliberately imports the module under its real dotted name instead,
	so the ``__main__'' tail does not fire and unittest discovery runs.

	``___moduleNameToPath___:'' is an env-1 classmethod, so it is reached
	via @env1: from this env-0 method (see the star-import expander for
	the same idiom); ``___signal___:'' on the exception class is likewise
	env-1.

	importlib runModule: 'test.test_math'.
	"
	| path |
	path := self @env1:___moduleNameToPath___: aName.
	path isNil ifTrue: [
		ModuleNotFoundError @env1:___signal___: 'No module named ''', aName, ''''].
	^ self loadModuleFromPath: path name: '__main__'
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
	module setParent: nil.  "link the tree so codegen temps (e.g. chained-compare rhsTemp) are allocated, as the real import path does"
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
	module setParent: nil.  "link the tree so codegen temps (e.g. chained-compare rhsTemp) are allocated, as the real import path does"
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
	module setParent: nil.  "link the tree so codegen temps (e.g. chained-compare rhsTemp) are allocated, as the real import path does"
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
___codegenTraceDir___
	"Return the codegen-trace output directory, or nil if tracing is
	off.  Reads ``GRAIL_CODEGEN_TRACE_DIR'' from the gem environment
	the first time it's asked per session and caches the result in
	SessionTemps so repeated calls don't re-poll the OS.  Storing in
	SessionTemps (not a classInstVar) means each gem process reads
	its own env var and two sessions never conflict on the same
	committed slot.

	When set, loadModuleFromPath: writes:
	  <dir>/<module>.tpz  — Topaz-style source dump
	  <dir>/<module>.ir   — initialize method IR snapshot

	When unset (default), no debug capture happens — saves O(generated-
	source-size) PrettyWriteStream work per module load.  Reset the
	cache with ``importlib ___codegenTraceDirInvalidate___'' after
	changing the env var mid-session."

	| temps dir |
	temps := SessionTemps current.
	(temps includesKey: #'___grailCodegenTraceDirChecked___')
		ifTrue: [^ temps at: #'___grailCodegenTraceDir___' ifAbsent: [nil]].
	dir := System gemEnvironmentVariable: 'GRAIL_CODEGEN_TRACE_DIR'.
	(dir notNil and: [dir isEmpty]) ifTrue: [dir := nil].
	dir ifNotNil: [
		(GsFile existsOnServer: dir) ifFalse: [
			GsFile createServerDirectory: dir
		].
		temps at: #'___grailCodegenTraceDir___' put: dir.
	].
	temps at: #'___grailCodegenTraceDirChecked___' put: true.
	^ dir
%

category: 'Grail-Class Compilation'
classmethod: importlib
___codegenTraceDirInvalidate___
	"Clear the cached trace-dir value so the next ``___codegenTraceDir___''
	re-reads the env variable.  Useful when toggling the variable from
	a topaz session for ad-hoc debugging."

	| temps |
	temps := SessionTemps current.
	temps removeKey: #'___grailCodegenTraceDir___' ifAbsent: [].
	temps removeKey: #'___grailCodegenTraceDirChecked___' ifAbsent: [].
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

	Called by the codegen-trace capture in loadModuleFromPath: (opt-in
	via the ``GRAIL_CODEGEN_TRACE_DIR'' env var; see ``runPath:'' header)
	so each method written to that file reads like a hand-written
	Topaz method definition rather than a flat source dump.

	Emits the body LINE-BY-LINE (one ``nextPutAll:'' per line)
	instead of character-by-character.  A previous char-by-char
	version was O(n²) — each ``nextPut:'' triggered PrettyWriteStream
	bookkeeping that did per-char work — and hung the test suite on
	large generated methods (re._parser's __parse: clocks in at
	~53k chars)."

	| lines first |
	lines := aSource subStrings: Character lf.
	lines isEmpty ifTrue: [^ self].
	first := lines first.
	"Selector line, blank line, then indented body."
	aStream nextPutAll: first; lf; lf.
	aStream increaseIndent.
	2 to: lines size do: [:i |
		| line |
		line := lines at: i.
		"Empty lines stay empty (no spurious indent on blanks)."
		line isEmpty
			ifTrue: [aStream lf]
			ifFalse: [aStream nextPutAll: line; lf].
	].
	"Ensure the body ends on its own line — the caller emits ``%''
	right after this on what should be a fresh line."
	(aSource isEmpty
		or: [aSource last == Character lf])
		ifFalse: [aStream lf].
	aStream decreaseIndent.
%

category: 'Grail-Class Compilation'
classmethod: importlib
___compilationSymbolList___
	"Symbol list used as the `dictionaries:` argument for compileMethod
	calls emitted by ClassDefAst codegen."

	^ self ___grailCompileSymbolList___
%

category: 'Grail-Class Compilation'
classmethod: importlib
___grailCompileSymbolList___
	"The Grail-owned SymbolList that generated Python code is COMPILED
	against.  It is composed of exactly three dictionaries:

	  * Python        -- every Python builtin, exception class, None, and
	                     Grail runtime class (PythonReturn, PythonBreak,
	                     PythonContinue, PyCode, PyDict, PythonClass, ...) that
	                     generated Smalltalk references by bare name.
	  * PythonModules -- the backing classes of imported modules, which
	                     generated code DOES reference by their (encoded) name
	                     (e.g. ``Re'', ``Jinja2_environment'').
	  * a curated kernel dict (below).

	It DELIBERATELY excludes Globals AND everything else in the GemStone user
	profile -- UserGlobals, PythonAst, GsCompilerClasses, ...  Python code must
	see only Python builtins and things it imported, as in CPython where a
	program cannot reach GemStone's kernel Globals; so no kernel name
	(WriteStream, Association, ...) bleeds into Python name resolution.  A
	module's backing class IS resolvable here (that is what lets generated code
	reference an imported module by name), so its name matches the Python module
	name and a same-spelled builtin / curated-kernel collision is guarded at the
	one call site (___moduleNameShadowsCompileScope___:).  Callers needing a
	module scope insert it at position 1.  Composed fresh each call (the profile
	is authoritative for the current dictionary object)."

	| prof sl |
	prof := System myUserProfile symbolList.
	sl := SymbolList new.
	sl add: (prof objectNamed: #Python).
	sl add: (prof objectNamed: #PythonModules).
	sl add: self ___grailKernelDict___.
	^ sl
%

category: 'Grail-Class Compilation'
classmethod: importlib
___grailKernelDict___
	"The CURATED set of kernel classes that GENERATED Smalltalk references by
	bare name purely as an implementation detail (backing storage + base
	classes) -- e.g. ClassDefAst emits ``(Object @env0:new)'' for a dynamic-
	attribute holder.  These are NOT Python-visible names (a Python program uses
	lower-case ``object'' / ``list'' via the Python dict), so putting the six of
	them in the compile symbol list does not let kernel Globals bleed into Python
	name resolution -- it just satisfies Grail's own codegen.  This is the
	COMPLETE set per an empirical audit (compile every SUnit + CPython-suite
	module against Python + PythonModules and collect the undefined symbols):
	Object, OrderedCollection (list), Array (tuple), KeyValueDictionary (dict),
	Unicode32 (str backing), AbstractException (exception base).  Sole source of
	truth for both ___grailCompileSymbolList___ and the module-name shadow
	guard, so the two never drift.  Fresh dict each call."

	| kernel |
	kernel := SymbolDictionary new.
	kernel at: #Object put: Object.
	kernel at: #OrderedCollection put: OrderedCollection.
	kernel at: #Array put: Array.
	kernel at: #KeyValueDictionary put: KeyValueDictionary.
	kernel at: #Unicode32 put: Unicode32.
	kernel at: #AbstractException put: AbstractException.
	^ kernel
%

category: 'Grail-Naming'
classmethod: importlib
___moduleNameShadowsCompileScope___: aSymbol
	"True if a module backing-class named aSymbol would shadow a name that
	generated code resolves, in the Grail compile symbol list, to something
	OTHER than a module: a Python builtin / exception / runtime class (the
	Python dict) or one of the curated kernel classes (___grailKernelDict___).
	PythonModules itself is NOT consulted -- a same-named module IS this module.
	Globals is NOT consulted either: it is deliberately absent from the compile
	symbol list, so a kernel name Python never sees cannot be shadowed.  With
	case now preserved, this fires only for the genuine overlaps (a module
	literally named 'Array', 'object', ...), where the call site prefixes 'Py'."

	(Python includesKey: aSymbol) ifTrue: [^ true].
	^ self ___grailKernelDict___ includesKey: aSymbol
%

category: 'Grail-Class Compilation'
classmethod: importlib
___ensureClassAttrHolder___: aClass
	"Give aClass the ``___dynInstVars___'' accessor pair a class attribute is stored
	through, if it does not have one.  Answers aClass.

	``___pyAttrStore___'' puts a class attribute in a per-class holder reached
	by that pair, and ClassDefAst emits it for every class it compiles.  A class
	built WITHOUT going through ClassDefAst has no such pair, and the first
	store raises -- which is what made ``type('B', (), {'z': 5})'' die inside
	the constructor with ``'B' object has no attribute 'z'''.  The error
	escaping construction rather than the read is why a Python ``try/except''
	around the attribute could not catch it.

	Idempotent, and it looks for an INHERITED pair too: a subclass of a
	ClassDefAst-built class already reaches one through its metaclass chain, and
	compiling a second would give it a holder that shadows the parent's.

	``___compileMethod:category:'' is sent @env1: DELIBERATELY.  It is an env-1
	method on Behavior, so an env-0 send is a doesNotUnderstand -- and with the
	guard below that DNU is swallowed, leaving a class with no holder and the
	original raise still in place.  Which is exactly what happened when this was
	first written, and it looked like the fix simply not working.

	The compiles are guarded because this runs on kernel-adjacent classes whose
	metaclass may refuse a new method; a refusal leaves the class exactly as it
	was, which is the pre-existing behaviour."

	| src |
	(aClass @env0:class @env0:whichClassIncludesSelector: #'___dynInstVars___'
		environmentId: 1) @env0:notNil ifTrue: [^ aClass].
	src := '___dynInstVars___
	^ ___dynInstVars___'.
	[aClass @env0:class @env1:___compileMethod: src category: 'Grail-Class Attrs']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	src := '___dynInstVars___: ___1
	___dynInstVars___ := ___1.'.
	[aClass @env0:class @env1:___compileMethod: src category: 'Grail-Class Attrs']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	^ aClass
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

	Also filter against kernel metaclass instVar names (``name'',
	``category'', ``classCategory'', ...) — a Python class body that
	declares ``name: str'' (e.g. jinja2.nodes._FilterTestCommon)
	gets an auto-generated ``name'' env-1 accessor that READS the
	Smalltalk-kernel ``name'' instVar (= the class's printed name).
	Inheriting that value into a subclass via this copy would
	overwrite the subclass's actual class name and break
	``cls.__name__'' / ``type(node).__name__'' dispatch.  See
	jinja2.nodes.Filter subclass of _FilterTestCommon — pre-fix,
	Filter's ``__name__'' reported '_FilterTestCommon' and the
	compiler couldn't tell Filter and Test nodes apart at all.

	Factored out of inline emit so each generated class only pays a
	single send instead of ~600 chars of inlined code (keeps the
	gem's transient doits_meths code space from overflowing on heavy
	imports like itsdangerous + Werkzeug)."

	| kernelSlots |
	kernelSlots := Object class allInstVarNames asIdentitySet.
	aClass superclass class allInstVarNames do: [:n |
		(((aClass superclass class whichClassIncludesSelector: n environmentId: 1) notNil)
			and: [(aClass class whichClassIncludesSelector: (n asString , ':') asSymbol environmentId: 1) notNil
			and: [n ~= #'__module__'
			and: [n ~= #'___dynInstVars___'
			and: [(ownAttrs includes: n) not
			and: [(kernelSlots includes: n) not]]]]]) ifTrue: [
			"___dynInstVars___ excluded: copying the PARENT's holder makes the
			subclass SHARE the parent's per-class dynamic attrs -- the
			conditional holder-init (nested-class fix) then keeps the
			shared object, and a sibling dataclass's setattr'd __init__
			leaked to every subclass (werkzeug multipart NeedData())."
			"Setter probed too: a parent metaclass slot may expose only a
			READER (numbers_Rational's ``registeredTypes'' backing its ABC
			register()) -- blindly firing ``n:'' DNU'd when vendored
			fractions.py subclassed numbers.Rational."
			| v |
			v := aClass superclass perform: n env: 1.
			aClass perform: (n asString , ':') asSymbol env: 1 withArguments: { v }
		]
	]
%

category: 'Grail-Module Loading'
classmethod: importlib
___hasBuiltinStorage___: b
	"Does base b carry BUILT-IN storage, as opposed to being a
	behaviour-only mixin?  ___selectStorageBase___: asks this first,
	because a base that carries storage must become the Smalltalk
	superclass or the new class loses that storage entirely.

	Three roots, and the last two are the point of this being its own
	method rather than one inlined ``inheritsFrom: Collection'':

	  * Collection -- Grail's dict / list / set (Dictionary /
	    SequenceableCollection / Set are all Collection subclasses).

	  * Number -- int and float storage.  AbstractPyInt and Float both
	    reach it.

	  * AbstractPyStr -- Grail's BOXED str root, which sits DIRECTLY
	    under Object.  That is what made this a bug rather than a
	    tidy-up: the fallback below picks the base with the deepest
	    superclass chain as a proxy for ``substantial base'', and
	    AbstractPyStr's chain is three long -- exactly tying a plain
	    ``class M: ...'' mixin (M < PythonInstance < Object), which then
	    won on left-to-right preference.  So ``class B(M, StrEnum)''
	    got M as its Smalltalk superclass, the enum metaclass protocol
	    never reached it (that copy is gated on the SUPERCLASS chain),
	    and its members were never built: ``B.seven'' answered the bare
	    string '7' rather than a member, silently.  ``class C(M,
	    IntEnum)'' was fine only by luck -- AbstractPyInt sits under
	    Number, so its chain is five long and beat the mixin's three.

	    test_enum test_strenum / test_custom_strenum reach this through
	    ``class DumbStrEnum(DumbMixin, StrEnum)''."

	(b isKindOf: Behavior) ifFalse: [^ false].
	(b inheritsFrom: Collection) ifTrue: [^ true].
	(b inheritsFrom: Number) ifTrue: [^ true].
	^ [ | root |
	root := Python at: #'AbstractPyStr' otherwise: nil.
	root ~~ nil and: [(b == root) or: [b inheritsFrom: root]] ] value
%

category: 'Grail-Module Loading'
classmethod: importlib
___selectStorageBase___: bases
	"Pick the Smalltalk superclass for a multi-base Python class.
	Return the LEFTMOST base whose class chain reaches a built-in
	storage collection (Grail ``dict'' / ``list'' / ``set'' are
	Dictionary / SequenceableCollection / Set subclasses, all under
	``Collection''), so the new class keeps that primitive storage —
	e.g. ``ImmutableMultiDict(ImmutableMultiDictMixin, MultiDict)''
	selects ``MultiDict'' (dict-backed) over the storage-less mixin.
	Plain mixins / user classes are rooted at ``PythonInstance'' (not a
	Collection), so they're skipped.  Falls back to the first base when
	none has built-in storage — the common diamond-free Python-only
	case (unchanged behaviour).  ___mergeSecondaryBases___ then folds in
	the other bases' methods."

	bases do: [:b |
		(self ___hasBuiltinStorage___: b)
			ifTrue: [^ self ___widenStrBase___: b]
	].
	"No built-in storage base.  Prefer the base with the DEEPEST
	superclass chain: the ``class DateField(DateTimeCheckMixin, Field)''
	idiom (and Django's exception / descriptor hierarchies) puts a
	shallow mixin first, but ``super().__init__'' from the subclass
	must reach the substantial base — so that base has to be the
	Smalltalk superclass, or the primary chain dead-ends before it.
	Ties keep left-to-right preference.  Method-precedence is then
	restored to C3 by ___mergeSecondaryBases___, which lets a leftmost
	mixin OVERRIDE this deeper base (see there).

	Depth is a PROXY for ``carries storage'', which is why the test above
	runs first: a base that really does carry storage must never be
	decided by chain length.  See ___hasBuiltinStorage___:."
	^ [ | best bestDepth |
	best := bases first.
	bestDepth := -1.
	bases do: [:b |
		| d w |
		(b isKindOf: Behavior) ifTrue: [
			d := 0.
			w := b.
			[w ~~ nil] whileTrue: [d := d + 1. w := w superclass].
			d > bestDepth ifTrue: [bestDepth := d. best := b]
		]
	].
	self ___widenStrBase___: best ] value
%

category: 'Grail-Module Loading'
classmethod: importlib
___widenStrBase___: aClass
	"Map ``Unicode7'' (what the Python name ``str'' resolves to) onto
	``Unicode32'' when it is about to become the SMALLTALK SUPERCLASS of
	a Python class.

	GemStone widens a Unicode string IN PLACE the moment a character
	outside the receiver's range is stored, and it migrates to the
	CANONICAL wider class -- never to a wide counterpart of the
	receiver's own class, because none exists.  A Unicode7-backed
	subclass therefore lost its identity as soon as it held non-ASCII:
	the object kept its oop but its class silently became Unicode16, so
	``Markup('café')'' answered a plain ``str'' while ``Markup('abc')''
	answered a ``Markup''.  Measured migration behaviour:

	    subclass of Unicode7   ascii ok | latin-1 -> Unicode16 | astral -> Unicode32
	    subclass of Unicode16  ascii ok | latin-1 ok           | astral -> Unicode32
	    subclass of Unicode32  ascii ok | latin-1 ok           | astral ok

	Unicode32 spans the entire code-point range, so no store can force a
	migration and the subclass survives any content.  Unicode16 would fix
	the common case and still lose the subclass on astral characters
	(emoji) -- a data-dependent silent failure of exactly the kind this
	is fixing, so it is not used.

	Only SUBCLASS construction is affected; the ``str'' binding itself is
	untouched, so plain strings keep GemStone's compact narrow
	representation.  ``isinstance(x, str)'' still answers true for these
	instances: ___isInstanceSingle___:of: widens the str check to
	CharacterCollection.

	Cost: 4 bytes per character for str-subclass instances, against 1 for
	pure-ASCII content before.  Correctness is worth it -- the failure it
	replaces was silent and depended on the data."

	^ aClass == Unicode7 ifTrue: [Unicode32] ifFalse: [aClass]
%

category: 'Grail-Module Loading'
classmethod: importlib
___miRegistry___
	"Identity registry: Python class -> Array {basesArray. mroArray}.
	Populated at class creation by ___registerBases___:bases: (reached
	from both ClassDefAst's emitted merge call and the 3-arg type()
	builtin).  SESSION-LOCAL (SessionTemps): the old classInstVar
	dirtied the committed importlib class at every MI class definition
	(multi-user commit conflicts).  A class DELIBERATELY committed by
	an application loses its MRO metadata in later sessions -- such
	sharing belongs in an application-managed RC* collection.  "

	| reg |
	reg := SessionTemps current at: #GrailMiRegistry otherwise: nil.
	reg ifNil: [
		reg := IdentityKeyValueDictionary new.
		SessionTemps current at: #GrailMiRegistry put: reg].
	^ reg
%

category: 'Grail-Module Loading'
classmethod: importlib
___registerBases___: aClass bases: basesArray
	"Record aClass's TRUE Python bases and its C3 linearization.
	Python computes the MRO once at class creation and it is fixed
	thereafter -- same here.  An inconsistent hierarchy raises
	TypeError, matching CPython's class-creation behavior."

	| mro |
	mro := self ___c3Linearize___: aClass bases: basesArray.
	self ___miRegistry___ at: aClass put: { Array withAll: basesArray. mro }.
	^ mro
%

category: 'Grail-Module Loading'
classmethod: importlib
___methodLookupChainFor___: aClass
	"The classes to search, nearest first, for one of the per-class
	___method*Table___ dictionaries (___methodCodeTable___, ___methodDocTable___,
	___methodSignatureTable___, ...).

	The raw Smalltalk superclass chain is NOT enough.  A Python class with
	several bases is one Smalltalk class whose superclass is only its PRIMARY
	base; ___mergeSecondaryBases___ RECOMPILES the other bases' methods onto it,
	but the tables are per-class dictionaries built by ClassDefAst from one class
	body, so the copied method's PyCode / docstring / signature stays behind in
	the base's table -- which no superclass walk from the subclass can reach.

	Chain first, MRO only if that misses: the chain is a cheap pointer walk and
	is the whole answer under single inheritance, so the C3 computation is paid
	only where a chain-only walk was about to answer nil anyway.  Answers a
	collection; never nil.

	Lives here rather than on BoundMethod (where it started, for test_gettext's
	``'method' object has no attribute '__code__''') because there are now three
	askers in two dictionaries: BoundMethod, and BaseException's live-frame
	filename derivation.  ``class TestTracebackFormat(unittest.TestCase,
	TracebackFormatMixin)'' put every mixin method's frame at file ``<grail>''
	while the bound method's __code__ beside it reported the real path."

	| chain c mro |
	chain := OrderedCollection new.
	c := aClass.
	[c == nil] whileFalse: [
		chain add: c.
		c := c superclass].
	mro := [self ___mroOf___: aClass] on: Error do: [:ex | ex return: nil].
	mro == nil ifTrue: [^ chain].
	"Append only what the chain missed, keeping nearest-first order."
	mro do: [:each |
		(chain includesIdentical: each) ifFalse: [chain add: each]].
	^ chain
%

category: 'Grail-Module Loading'
classmethod: importlib
___pythonBasesOf___: aClass
	"The registered TRUE bases of a multiple-inheritance class, or nil
	for unregistered (single-inheritance) classes."

	| entry |
	entry := self ___miRegistry___ at: aClass otherwise: nil.
	^ entry ifNil: [nil] ifNotNil: [entry at: 1]
%

category: 'Grail-Module Loading'
classmethod: importlib
___mroOverrideRegistry___
	"Identity registry: Python class -> the Array its metaclass's ``mro()''
	answered.  Populated at class creation by object >> ___grailApplyMroHook___:,
	and read by ___mroOf___: ahead of the ordinary derivation.

	Empty for every class in the corpus: only a metaclass that defines ``mro'' in
	PYTHON ever writes here, and outside test_super nothing does.

	Session-local (SessionTemps), matching ___miRegistry___ -- see the note
	there about why the committed classInstVar was wrong."

	| reg |
	reg := SessionTemps current at: #GrailMroOverrideRegistry otherwise: nil.
	reg ifNil: [
		reg := IdentityKeyValueDictionary new.
		SessionTemps current at: #GrailMroOverrideRegistry put: reg].
	^ reg
%

category: 'Grail-Module Loading'
classmethod: importlib
___mroOf___: aClass
	"aClass's method resolution order as an Array.  Registered
	(multiple-inheritance) classes answer their stored C3
	linearization; everything else derives the Smalltalk superclass
	chain -- for single inheritance the two coincide, and the chain's
	GemStone-internal ancestors (PythonInstance, Object, ...) appear at
	the tail exactly as Behavior>>__mro__ has always reported them."

	| result c override |
	"A METACLASS mro() OVERRIDE wins, because in CPython that hook does not
	observe the linearization -- it PRODUCES it.  Grail derives the MRO on demand
	instead of storing one, so honouring the hook means preferring what the hook
	recorded (object >> ___grailApplyMroHook___:).

	An IDENTITY REGISTRY rather than a class attribute, for two reasons.  It is a
	single lookup on a path that is already walked per class, where a
	___dynamicClassAttr___ probe would add a whole superclass walk of its own to
	every MRO computation in the system.  And it is keyed by identity, so a
	SUBCLASS cannot inherit its parent's override and report the parent's
	linearization as its own -- which a chain-walking read would have done.

	Session-local, exactly as ___miRegistry___ is and for the same reason: a
	committed importlib dirtied at every such class definition is a multi-user
	commit conflict.  A class deliberately committed loses its override in a
	later session, which is the tradeoff already documented there."
	override := self ___mroOverrideRegistry___ at: aClass otherwise: nil.
	override ifNotNil: [^ Array withAll: override].
	result := OrderedCollection new.
	c := aClass.
	[c == nil] whileFalse: [
		| entry |
		entry := self ___miRegistry___ at: c otherwise: nil.
		entry
			ifNil: [
				(result includesIdentical: c) ifFalse: [result add: c].
				c := c superclass]
			ifNotNil: [
				"c is a multiple-inheritance class: splice its full stored C3
				MRO (which carries its SECONDARY bases and everything above)
				and stop.  A single-inheritance subclass of an MI class must
				NOT re-walk the raw Smalltalk superclass chain past c -- that
				chain omits the secondary bases, so issubclass(sub, aSecondary)
				and C3 linearization through sub would both miss them.  Kept in
				lockstep with Behavior>>__mro__."
				(entry at: 2) do: [:m |
					(result includesIdentical: m) ifFalse: [result add: m]].
				^ Array withAll: result]].
	^ Array withAll: result
%

category: 'Grail-Module Loading'
classmethod: importlib
___c3Linearize___: aClass bases: basesArray
	"C3 linearization: L(C) = C + merge(L(B1), ..., L(Bn), [B1..Bn]).
	At each step take the head of the first sequence that appears in no
	other sequence's TAIL; failure to find one means the hierarchy has
	no consistent linearization (CPython raises TypeError at class
	creation)."

	| seqs result head |
	seqs := OrderedCollection new.
	basesArray do: [:b |
		(b isKindOf: Behavior) ifTrue: [
			seqs add: (OrderedCollection withAll: (self ___mroOf___: b))]].
	seqs add: (OrderedCollection withAll:
		(basesArray select: [:b | b isKindOf: Behavior])).
	result := OrderedCollection with: aClass.
	[seqs anySatisfy: [:s | s isEmpty not]] whileTrue: [
		head := nil.
		seqs do: [:s |
			(head == nil and: [s isEmpty not]) ifTrue: [
				| cand inTail |
				cand := s first.
				inTail := seqs anySatisfy: [:t | (t indexOf: cand) > 1].
				inTail ifFalse: [head := cand]]].
		head == nil ifTrue: [
			TypeError @env1:___signal___:
				'Cannot create a consistent method resolution order (MRO) for bases'].
		result add: head.
		seqs do: [:s |
			(s isEmpty not and: [s first == head]) ifTrue: [s removeFirst]]].
	^ Array withAll: result
%

category: 'Grail-Module Loading'
classmethod: importlib
___copyDecoratorRebinding___: aSelector from: aBase to: aClass
	"Copy the class-body decorator rebinding for aSelector, if the base has
	one, alongside the compiled method ___mergeSecondaryBases___ just copied.

	``@classproperty def MAX(cls)'' compiles to a method AND stores the
	decorated object under #MAX in the base's class-side ___dynInstVars___ holder;
	___pyAttrLoad___ reads that holder (via ___classChainAttrLookup___:) before
	it falls back to wrapping the method, so the holder entry IS the attribute.

	The holder is keyed by the BARE PYTHON NAME, so the selector has to be
	mapped back to it (___pythonNameForSelector___).  This method used to bail
	on every keyword selector, on the reasoning that ``the unary selector in the
	same method dictionary already carries it''.  That holds only for a def whose
	Python signature is ``(self)'' -- the sole shape that compiles to a unary
	selector.  Give the def a DEFAULT (``def helper(self, cleanup=None)'') and it
	compiles to the varargs ``_helper:kw:'' form with NO unary variant, so the
	bail dropped the rebinding on the floor and the subclass got the RAW,
	undecorated function.

	What that cost, concretely: test_traceback's TracebackFormatMixin puts
	``@cpython_only'' on ``check_traceback_format(self, cleanup_func=None)''.
	Through ``class TestTracebackFormat(unittest.TestCase, TracebackFormatMixin)''
	-- mixin SECOND, so it is merged by copy rather than inherited -- the skip
	vanished, the real body ran, and its ``from _testcapi import ...'' raised
	ModuleNotFoundError.  Two tests scored ERROR that CPython itself skips on any
	non-CPython implementation.  Nothing about this is specific to _testcapi or
	to cpython_only: ANY decorator on ANY secondary-base method taking arguments
	was silently discarded.

	Copying under the bare name makes the arity variants converge on ONE key,
	which the ``already present'' guard below makes idempotent -- so the dedup the
	old bail was reaching for still holds, without losing the entry.  Nothing is
	overwritten: an entry already on aClass came from its own class body or from
	an earlier (higher-precedence) secondary base."

	| pyName baseHolder deco holder |
	pyName := self ___pythonNameForSelector___: aSelector.
	pyName isNil ifTrue: [^ self].
	baseHolder := [aBase perform: #___dynInstVars___ env: 1] on: Error do: [:e | nil].
	baseHolder isNil ifTrue: [^ self].
	deco := [baseHolder dynamicInstVarAt: pyName] on: Error do: [:e | nil].
	deco isNil ifTrue: [^ self].
	holder := [aClass perform: #___dynInstVars___ env: 1] on: Error do: [:e | nil].
	holder isNil ifTrue: [
		holder := Object new.
		[aClass perform: #___dynInstVars___: env: 1 withArguments: { holder }]
			on: Error do: [:e | holder := nil]].
	holder isNil ifTrue: [^ self].
	([holder dynamicInstVarAt: pyName] on: Error do: [:e | nil]) isNil ifTrue: [
		[holder dynamicInstVarAt: pyName put: deco] on: Error do: [:e | nil]].
	^ self
%

category: 'Grail-Module Loading'
classmethod: importlib
___pythonNameForSelector___: aSelector
	"The bare Python name a compiled selector came from, or nil if it is not a
	shape this mapping covers.  Used by ___copyDecoratorRebinding___ to find the
	class-attribute holder key for a method it is copying.

	The three shapes ClassDefAst emits, and only these:
	  * ``foo''        -- ``def foo(self)'', the sole unary case  -> foo
	  * ``foo:_:''     -- fixed-arity, simple positional params   -> foo
	  * ``_foo:kw:''   -- varargs (defaults / *args / **kwargs)   -> foo

	The varargs form is the one that needs care: its leading underscore is added
	by codegen, so it must be stripped -- but ONLY for that form.  ``def _foo
	(self, a)'' is a genuinely underscore-prefixed name compiling to the
	fixed-arity ``_foo:'', where stripping would answer ``foo'' and copy a
	rebinding onto the wrong attribute.  Keying the strip to the ``:kw:'' suffix
	keeps the two apart, and round-trips ``__init__'' (``___init__:kw:'') too."

	| s idx |
	s := aSelector asString.
	idx := s indexOf: $:.
	idx = 0 ifTrue: [^ s asSymbol].
	((s size > 4) and: [(s copyFrom: s size - 3 to: s size) = ':kw:'])
		ifTrue: [
			((s at: 1) == $_ and: [idx > 2]) ifFalse: [^ nil].
			^ (s copyFrom: 2 to: idx - 1) asSymbol].
	idx < 2 ifTrue: [^ nil].
	^ (s copyFrom: 1 to: idx - 1) asSymbol
%

category: 'Grail-Module Loading'
classmethod: importlib
___mergeSecondaryBases___: aClass bases: secondaryBases
	"Multiple-inheritance method resolution.  ``aClass`` already
	inherits its PRIMARY base (the storage base selected by
	___selectStorageBase___, else ``bases first'') through Smalltalk
	single inheritance; this brings in the env-1 instance methods of
	the OTHER bases (and their Python ancestors) that the primary chain
	doesn't already provide.  The base that became the superclass dedups
	out (its methods are inherited, so ___primaryChainProvides___ sees
	them).

	Precedence honors left-to-right base order and Python override
	semantics: a selector defined by ``aClass`` itself or anywhere in
	its primary Python chain (down to, but excluding, the universal
	roots PythonInstance / Object) is NOT overridden; a selector from
	a secondary base DOES override the universal-root default (so a
	mixin/base ``__repr__`` beats ``object.__repr__``).  Because
	copied methods land on ``aClass`` first, an earlier secondary base
	wins over a later one.

	Methods are recompiled from source onto ``aClass``.  Grail stores
	instance attributes dynamically (no fixed slots), so a method
	written for the base runs correctly on ``aClass``.  Limitations:
	the walk stops at the first non-Python (built-in) ancestor, so a
	secondary base whose storage IS a built-in (e.g. a MultiDict over
	``dict``) is not fully reproduced; and ``super`` in a copied method
	resolves against ``aClass``'s primary superclass (cooperative
	mixins that chain via ``super`` may misbehave)."


	"C3 method precedence for the deepest-chain storage case.  When the
	storage base was chosen by DEPTH (not built-in storage), a leftmost
	mixin — declared before it — must OVERRIDE the methods the deep
	primary chain provides, not merely fill gaps: Python's C3 MRO puts
	that mixin first.  The motivating regression:
	``ThreadedWSGIServer(ThreadingMixIn, BaseWSGIServer)'' resolved
	``process_request'' to BaseServer's inline version instead of
	ThreadingMixIn's spawn-a-worker version, silently running requests
	on the main thread.

	This override is DELIBERATELY SCOPED OUT of the built-in-storage
	case (``storageBase inheritsFrom: Collection'' — e.g.
	``ImmutableMultiDict(ImmutableMultiDictMixin, MultiDict)'').  Those
	classes collapse onto Grail's primitive dict/list/set storage, and
	overriding the storage base's own methods (``__setitem__'', the
	construction-time populators, ``get'') breaks reads and construction;
	gap-fill (the immutable mixin's mutators are skipped, leaving the
	structure effectively mutable) is the tolerated pre-existing
	behaviour there.  A method defined directly on aClass always wins;
	an earlier secondary base still beats a later one (copies land on
	aClass's own dict)."
	| storageBase storageIdx overrideEligible |
	"Phase 0 of real multiple inheritance: record the TRUE bases and the
	exact C3 linearization before any method merging.  __mro__ /
	__bases__ / isinstance / issubclass / super() all consult this
	registry; the copy-down merge below remains the dispatch mechanism
	for now (its approximate precedence is unchanged this phase)."
	self ___registerBases___: aClass bases: secondaryBases.
	storageBase := self ___selectStorageBase___: secondaryBases.
	storageIdx := secondaryBases indexOf: storageBase.
	overrideEligible := (storageBase isKindOf: Behavior)
		and: [(storageBase inheritsFrom: Collection) not].
	secondaryBases doWithIndex: [:base :baseIdx |
		| walker overrideMode |
		overrideMode := overrideEligible
			and: [storageIdx > 0 and: [baseIdx < storageIdx]].
		walker := base.
		"Walk only as far as the classes GENERATED FROM PYTHON SOURCE, which is
		what ___pyDefinedClass___ marks and what the limitation note above calls
		``stops at the first non-Python (built-in) ancestor''.

		The test used to be ``does its metaclass answer ___dynInstVars___?'', which is
		a per-class attribute HOLDER and only incidentally a proxy for generated:
		ClassDefAst happens to emit both on every class it builds.  A Smalltalk-
		written class acquiring a holder therefore silently joined the walk --
		which is what happened when Enum was given one so that it could carry
		``name'' and ``value'' as descriptors.  The walk then entered Enum for
		every ``class E(int, Enum)'' and evaluated its class-side attrs, one of
		which (_all_bits_) raises AttributeError on a non-flag enum by design:
		test_enum stopped importing at all.

		Measured before changing: of everything in the Python dictionary exactly
		one Smalltalk-written class carries a holder accessor, functools_cmpkey,
		and no Smalltalk-written class carries ___pyDefinedClass___.  So this
		swap changes the walk for that one class and for nothing else.

		``isKindOf: Behavior'' is not tidying.  A base need not be a class --
		``class C(list[int])'' passes a PyGenericAlias -- and the old test asked
		its METACLASS, which is a Behavior whatever the base is.  Asking the base
		directly has no such protection: without the guard, 28 SUnit tests died
		on ``a PyGenericAlias does not understand
		#whichClassIncludesSelector:environmentId:''."
		[(walker ~~ nil)
			and: [(walker ~~ PythonInstance)
			and: [(walker ~~ Object)
			and: [(walker isKindOf: Behavior)
			and: [(walker whichClassIncludesSelector: #'___pyDefinedClass___' environmentId: 1) ~~ nil]]]]]
			whileTrue: [
			| md mdc kernelSlots ownMd |
			ownMd := aClass methodDictForEnv: 1.
			md := walker methodDictForEnv: 1.
			md ~~ nil ifTrue: [
				md keys do: [:sel |
					| shouldCopy |
					"Override mode guards only against aClass's OWN methods
					(class-body definitions + copies from an earlier
					leftmost base); gap-fill guards against the whole
					primary chain."
					shouldCopy := overrideMode
						ifTrue: [ownMd isNil or: [(ownMd includesKey: sel) not]]
						ifFalse: [(self ___primaryChainProvides___: sel forClass: aClass) not].
					shouldCopy ifTrue: [
						| src |
						src := [walker sourceCodeAt: sel environmentId: 1]
							on: Error do: [:e | nil].
						src ~~ nil ifTrue: [
							[aClass perform: #'___compileMethod:category:'
								env: 1
								withArguments: { src. 'Grail-MI-Inherited' }]
							on: Error do: [:e | nil]
						].
						"A class-body DECORATOR rebinds the name it decorates:
						the compiled method stays put and the DECORATED object
						lands in the base's ___dynInstVars___ holder, which is what
						``Cls.name'' actually reads.  Copying the method alone
						therefore hands the subclass the RAW, undecorated
						function -- ``@classproperty def MAX'' answered an
						UnboundMethod instead of running the descriptor, but
						only when the mixin was a SECONDARY base
						(``class Color(StrMixin, MaxMixin, Enum)''); as the
						primary base it inherits the holder through the chain
						and always worked (test_enum test_multiple_mixin).

						Tied to the method copy rather than done as its own
						sweep of the holder: this is exactly the rebinding that
						belongs to a def, so it inherits shouldCopy's
						precedence, and setattr-style class attributes -- and
						an enum base's member state -- are left alone."
						self ___copyDecoratorRebinding___: sel
							from: walker
							to: aClass
					]
				]
			].
			"Class-side merge: a secondary base's class attributes live in
			class-side accessor pairs plus per-metaclass instVar VALUES
			(classInstVars are per-class storage).  aClass's metaclass
			has no classInstVar slots for the base's attrs, so accessor
			sources can't be recompiled here — copy the VALUES into
			aClass's per-class ___dynInstVars___ holder (where
			___pyAttrStore___ also lands and ___pyAttrLoad___ probes),
			so ``IntegerFieldExact(IntegerFieldOverflow, Exact)'' sees
			Exact's ``lookup_name = 'exact'''.  Real class-side METHODS
			(@classmethod / @staticmethod, keyword selectors) are copied
			as source like the instance pass."
			kernelSlots := Object class allInstVarNames asIdentitySet.
			mdc := walker class methodDictForEnv: 1.
			mdc ~~ nil ifTrue: [
				mdc keys do: [:sel |
					| cat |
					cat := [walker class categoryOfSelector: sel environmentId: 1]
						on: Error do: [:e | nil].
					((aClass class whichClassIncludesSelector: sel environmentId: 1) isNil
						and: [(kernelSlots includes: sel) not
						and: [cat ~~ #'Grail-Class Attrs']]) ifTrue: [
						| src |
						src := [walker class sourceCodeAt: sel environmentId: 1]
							on: Error do: [:e | nil].
						src ~~ nil ifTrue: [
							[aClass class perform: #'___compileMethod:category:'
								env: 1
								withArguments: { src. 'Grail-MI-Inherited' }]
							on: Error do: [:e | nil]
						]
					].
					"Value pass for class attributes (unary getter in the
					Grail-Class Attrs category): copy into aClass's
					___dynInstVars___ holder when nothing shadows it."
					(cat == #'Grail-Class Attrs'
						and: [(sel asString includes: $:) not
						and: [(kernelSlots includes: sel) not
						and: [sel ~~ #'__module__'
						and: [sel ~~ #'___dynInstVars___'
						and: [(aClass class whichClassIncludesSelector: sel environmentId: 1) isNil]]]]]) ifTrue: [
						| v holder |
						"AbstractException, not Error: a class attribute here is a
						Grail-Class Attrs ACCESSOR, and one is entitled to refuse --
						Enum's _all_bits_ / _flag_mask_ / _singles_mask_ raise
						AttributeError on a non-flag enum, exactly as CPython does,
						because answering 0 would make every enum look like an empty
						flag.  A Python exception is not an Error subclass here, so
						``on: Error'' let it out and one refusing attribute took down
						the whole class definition."
						v := [walker perform: sel env: 1]
							on: AbstractException do: [:e | e return: nil].
						v isNil ifFalse: [
							holder := [aClass perform: #___dynInstVars___ env: 1] on: Error do: [:e | nil].
							holder isNil ifTrue: [
								holder := Object new.
								[aClass perform: #___dynInstVars___: env: 1 withArguments: { holder }]
									on: Error do: [:e | nil]
							].
							(holder dynamicInstVarAt: sel) isNil ifTrue: [
								holder dynamicInstVarAt: sel put: v
							]
						]
					]
				]
			].
			walker := walker superClass
		]
	].
	"ENUM SECONDARY BASE: the hand-written Enum metaclass carries the
	whole member-building/lookup protocol but declares no ___dynInstVars___,
	so the general class-side walk above skips it entirely -- an MI
	enum (``class E(date, ReprEnum)``) built NO members and had no
	_member_type_ (751 test_enum errors).  Recompile the fixed
	delegator set from Enum class, preserving each method's own
	category (_member_type_ must stay in Grail-Class Attrs for the
	class-attr read gate).  Emitted-merge order guarantees this runs
	BEFORE the ___pyClassDefined___: hook fires, so the copied hook
	builds the members."
	(secondaryBases anySatisfy: [:b |
		(b isKindOf: Behavior) and: [(b == Enum) or: [b inheritsFrom: Enum]]]) ifTrue: [
		| pyObjectClass |
		pyObjectClass := [(System myUserProfile symbolList objectNamed: #object) class]
			on: Error do: [:e | nil].
		#( #'___pyClassDefined___:' #'_member_type_' #'__contains__:'
		   #'__getitem__:' #'__iter__' #'__len__' #'__new__:' ) do: [:sel |
			| provider |
			provider := aClass class whichClassIncludesSelector: sel environmentId: 1.
			"The enum METACLASS protocol always wins over whatever the
			data base's chain provides: a universal-root no-op (object's
			___pyClassDefined___: blocked member building for
			class E(int, Flag)) or a kernel raiser (str's class-side
			__getitem__: 'type str is not subscriptable' blocked member
			accessors for str-mixin enums).  Skip the copy only when the
			provider IS enum machinery already."
			((provider == Enum class)
				or: [(provider == IntEnum class)
				or: [(provider == Flag class)
				or: [provider == aClass class]]]) ifFalse: [
				| src cat |
				src := [Enum class sourceCodeAt: sel environmentId: 1]
					on: Error do: [:e | nil].
				cat := [(Enum class categoryOfSelector: sel environmentId: 1) asString]
					on: Error do: [:e | 'Grail-MI-Inherited'].
				src ~~ nil ifTrue: [
					[aClass class perform: #'___compileMethod:category:' env: 1
						withArguments: { src. cat }]
						on: Error do: [:e | nil]]]].
		"The generic ClassDefAst instantiation (value:value:) blocks the
		enum value-lookup path; replace it with Enum's version so
		``E(3)`` resolves members (buildMembers would only REMOVE it,
		leaving dispatch to fall through to the data base's
		constructor)."
		[ | src |
		src := Enum class sourceCodeAt: #'value:value:' environmentId: 1.
		aClass class perform: #'___compileMethod:category:' env: 1
			withArguments: { src. 'Grail-Enum Metaclass' }]
			on: Error do: [:e | nil].
		"INSTANCE-side member protocol: the same ___dynInstVars___ gate that
		skipped the Enum metaclass also skips Flag/Enum in the general
		instance walk above, so an MI flag's members (class E(int, Flag)
		is AbstractPyInt-rooted) had no |/&/^/~ algebra, name/value
		accessors, or composed repr.  Gap-fill from each Enum-rooted
		secondary base's chain up through Enum (the method sources are
		storage-agnostic -- see Flag>>___flagOperand___:)."
		secondaryBases do: [:base |
			| eWalker |
			((base isKindOf: Behavior)
				and: [(base == Enum) or: [base inheritsFrom: Enum]]) ifTrue: [
				eWalker := base.
				[(eWalker ~~ nil) and: [(eWalker ~~ PythonInstance) and: [eWalker ~~ Object]]] whileTrue: [
					| emd |
					emd := eWalker methodDictForEnv: 1.
					emd ~~ nil ifTrue: [
						emd keys do: [:sel |
							((self ___primaryChainProvides___: sel forClass: aClass) not) ifTrue: [
								| src cat |
								src := [eWalker sourceCodeAt: sel environmentId: 1]
									on: Error do: [:e | nil].
								cat := [(eWalker categoryOfSelector: sel environmentId: 1) asString]
									on: Error do: [:e | 'Grail-MI-Inherited'].
								src ~~ nil ifTrue: [
									[aClass perform: #'___compileMethod:category:' env: 1
										withArguments: { src. cat }]
										on: Error do: [:e | nil]]]]].
					eWalker := eWalker superClass]]]]
%

category: 'Grail-Module Loading'
classmethod: importlib
___primaryChainProvides___: aSelector forClass: aClass
	"True if aSelector is defined on aClass or any superclass in its
	primary chain, EXCLUDING the universal roots (PythonInstance /
	Object) — those defaults must be overridable by a secondary base.
	Used by ___mergeSecondaryBases___ to decide what to inherit."

	| walker |
	walker := aClass.
	[(walker ~~ nil) and: [(walker ~~ PythonInstance) and: [walker ~~ Object]]]
		whileTrue: [
		| md |
		md := walker methodDictForEnv: 1.
		(md ~~ nil and: [md includesKey: aSelector]) ifTrue: [^ true].
		walker := walker superClass
	].
	^ false
%

set compile_env: 1

set compile_env: 0

category: 'Grail-Module Loading'
classmethod: importlib
___initializingModuleStack___
	"Session-local stack of the module names whose BODIES are currently
	executing, innermost last.  Session-local like every other Grail handle
	cache: an import is not a committed fact."

	^ SessionTemps @env0:current
		@env0:at: #'GrailInitializingModules'
		ifAbsentPut: [OrderedCollection @env0:new]
%

category: 'Grail-Module Loading'
classmethod: importlib
___pushInitializingModule___: aName
	self ___initializingModuleStack___ @env0:addLast: aName @env0:asString
%

category: 'Grail-Module Loading'
classmethod: importlib
___popInitializingModule___
	| stack |
	stack := self ___initializingModuleStack___.
	stack @env0:isEmpty ifFalse: [stack @env0:removeLast]
%

category: 'Grail-Module Loading'
classmethod: importlib
___initializingModuleName___
	"The module whose body is running right now, or nil outside any import."

	| stack |
	stack := self ___initializingModuleStack___.
	stack @env0:isEmpty ifTrue: [^ nil].
	^ stack @env0:last
%

set compile_env: 1

category: 'Grail-Module Loading'
classmethod: importlib
___callerModuleName___
	"The name of the Python module whose code is currently running, as
	CPython's ``PyEval_GetGlobals()['__name__']'' would report it -- or nil
	when no such module can be identified.

	Needed by ``type(name, bases, ns)'', which stamps __module__ on the class
	it builds from the CALLER's globals.  A class statement gets its module at
	compile time; a class built at runtime has only the stack to ask.

	Grail reads its own stack the one way a running gem can, by RAISING
	(BaseException class>>___liveFrameChain___), which sys._getframe and
	warnings both already stand on.  Frames carry no globals, so the module is
	recovered by matching a frame's co_filename against the __file__ of each
	imported module -- the same recovery warnings>>___warningOrigin___ makes,
	kept separate from it because that one wants the INNERMOST frame only and
	this one must walk OUTWARD.

	Walking outward is what skips Grail's own machinery for free: a Smalltalk
	method's frame has no module file behind it, so it matches nothing and the
	walk continues to the first frame that is really Python code.  That frame
	is the caller, whichever layer of builtins it arrived through.

	It costs a raise, so the caller should ask only when the answer is needed
	-- for type(), only when the namespace did not supply __module__ itself,
	which a class statement always does."

	| frame mods fileToName |
	frame := [BaseException @env0:___liveFrameChain___]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	mods := [self @env1:modules] @env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	"NO early return when either is missing -- the import-stack fallback at the
	bottom is the whole answer for a module body, which is exactly the case
	that has no frame chain.  Returning nil here instead skipped it, and the
	commonest spelling of all (a module-level ``type('X', (), {})'') got no
	module."
	(frame @env0:notNil and: [mods @env0:notNil]) ifTrue: [
	"One pass over sys.modules, not one per frame: the chain can be deep and
	the module table is the larger of the two."
	fileToName := KeyValueDictionary @env0:new.
	[mods @env0:keysAndValuesDo: [:k :m |
		| f |
		f := [m @env0:dynamicInstVarAt: #'__file__']
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		(f @env0:notNil and: [f @env0:~~ None]) ifTrue: [
			fileToName @env0:at: f @env0:asString put: k @env0:asString]]]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	[(frame @env0:~~ nil) and: [frame @env0:~~ None]] @env0:whileTrue: [
		| code fname hit |
		code := [frame @env0:dynamicInstVarAt: #'f_code']
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		fname := code @env0:isNil
			ifTrue: [nil]
			ifFalse: [[code @env0:dynamicInstVarAt: #'co_filename']
				@env0:on: AbstractException do: [:ex | ex @env0:return: nil]].
		(fname @env0:notNil and: [fname @env0:~~ None]) ifTrue: [
			hit := fileToName @env0:at: fname @env0:asString otherwise: nil.
			hit @env0:notNil ifTrue: [^ hit]].
		frame := [frame @env0:dynamicInstVarAt: #'f_back']
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil]]].
	"No Python frame matched.  A MODULE BODY is the case that reaches here:
	Grail's chain does not represent one as a frame, so a module-level
	``type('X', (), {})'' -- the commonest spelling of all -- would otherwise
	get no module at all.  The import stack knows which body is running.

	Second, not first: a body that calls a helper in ANOTHER module must take
	that module, which is what CPython's caller-globals rule says and what the
	frame walk above answers correctly."
	^ self @env0:___initializingModuleName___
%

category: 'Grail-Module Loading'
classmethod: importlib
___moduleNameToPath___: aName
	"Convert a module name (e.g., 'python.hello' or 're') to a file path.
	Search order: grailDir, grailDir/src/python/stdlib (the bundled stdlib
	ports), then the extra search roots (a sys.path-like list — see
	extraSearchRoots / addSearchRoot:, used to point Grail at third-party
	package trees such as NumPy's site-packages), and finally ``sys.path''.
	For each root, check name.py before name/__init__.py.

	sys.path comes LAST, a deliberate deviation from CPython where it IS the whole
	search path.  Grail's ported stdlib under grailDir has to win: a directory a
	caller adds to sys.path must not be able to shadow Grail's own ``os'' or
	``traceback'' with a same-named file, which searching sys.path first allows."
	| pathParts joined searchRoots result gd |
	gd := self @env0:grailDir.
	gd == nil ifTrue: [^ nil].
	pathParts := $. @env0:split: aName.
	joined := '/' @env0:join: pathParts.
	searchRoots := (OrderedCollection @env0:new)
		@env0:add: gd;
		@env0:add: (gd @env0:, '/src/python/stdlib');
		@env0:addAll: self extraSearchRoots;
		@env0:addAll: self ___sysPathRoots___;
		@env0:yourself.
	"Return via a local rather than ``^'' out of the do: block.  This
	method is reachable from the CPython shim's PyInit user-action
	callback (PyImport_ImportModule of a NumPy submodule); a non-local
	return out of a real block in that context raises
	RT_ERR_CANT_RETURN (2079).  See docs/Shim_NumPy.md."
	result := nil.
	searchRoots @env0:do: [:root | | base pyPath initPath |
		result @env0:isNil ifTrue: [
			base := (root @env0:, '/') @env0:, joined.
			pyPath := base @env0:, '.py'.
			"existsOnServer: answers NIL (not false) when the probe
			errors -- e.g. <name>/__init__.py where <name> is a plain
			FILE (the ./grail CLI script when probing 'import grail');
			compare == true so nil routes to not-found."
			((GsFile @env0:existsOnServer: pyPath) == true)
				ifTrue: [result := pyPath]
				ifFalse: [
					initPath := base @env0:, '/__init__.py'.
					((GsFile @env0:existsOnServer: initPath) == true)
						ifTrue: [result := initPath]]]].
	^ result
%

category: 'Grail-Module Loading'
classmethod: importlib
___namespacePortionsFor___: aName
	"PEP 420 namespace-package portions for aName: every search root that
	holds a DIRECTORY of that name.  Answers an empty Array when there are
	none.

	A namespace package is a package with no __init__.py.  Its __path__ is
	not one directory but the list of every matching directory across the
	whole search path -- the point of the PEP, which is to let one package
	be assembled from several distributions.  So this collects ALL of them
	rather than stopping at the first.

	Callers must consult this only AFTER ___moduleNameToPath___: has come
	back nil.  That ordering IS the PEP's rule that a regular module or
	package anywhere on the path beats a namespace package: the scan records
	portions as it goes, but the moment it finds real source it stops and
	the portions are discarded."

	| pathParts joined searchRoots portions gd |
	gd := self @env0:grailDir.
	gd == nil ifTrue: [^ #()].
	pathParts := $. @env0:split: aName.
	joined := '/' @env0:join: pathParts.
	searchRoots := (OrderedCollection @env0:new)
		@env0:add: gd;
		@env0:add: (gd @env0:, '/src/python/stdlib');
		@env0:addAll: self extraSearchRoots;
		@env0:addAll: self ___sysPathRoots___;
		@env0:yourself.
	portions := OrderedCollection @env0:new.
	searchRoots @env0:do: [:root | | dir |
		dir := (root @env0:, '/') @env0:, joined.
		"isServerDirectory: answers NIL for a path that does not exist, so
		compare == true rather than trusting it as a Boolean -- the same care
		___moduleNameToPath___: takes with existsOnServer:."
		((GsFile @env0:isServerDirectory: dir) == true)
			ifTrue: [(portions @env0:includes: dir)
				ifFalse: [portions @env0:add: dir]]].
	^ portions @env0:asArray
%

category: 'Grail-Module Loading'
classmethod: importlib
___loadNamespacePackage___: moduleName portions: dirs
	"Build and register a PEP 420 namespace package: a package object with a
	__path__ and no code.

	There is no source to run, so this is deliberately NOT routed through
	loadModuleFromPath:name: -- it compiles an EMPTY module body instead, which
	is what a namespace package is.  Everything downstream then treats it like
	any other package: submodule imports resolve through the ordinary dotted
	path, and ``from pkg import sub'' finds sub because pkg is a real entry in
	sys.modules.

	__file__ is None, as in CPython -- a namespace package has no file, and
	code that tests ``__file__ is None'' uses exactly that to detect one.
	Note the difference from a regular package, whose __path__ holds the ONE
	directory its __init__.py sits in; here it holds every portion found."

	| moduleAst moduleClass moduleInstance |
	moduleAst := ModuleAst @env0:parseSource: ''.
	"___buildModuleClass:name: and registerModule:with: are env-0 classmethods
	while this one sits in the env-1 region beside ___moduleNameToPath___:,
	so both sends name their environment explicitly."
	moduleClass := self @env0:___buildModuleClass: moduleAst name: moduleName.
	"@env0:new, not basicNew: module inherits from SymbolDictionary and needs
	its internal structure initialized -- see loadModuleFromPath:name:."
	moduleInstance := moduleClass @env0:new.
	moduleClass @env0:___adoptInstance___: moduleInstance.
	moduleInstance
		@env1:__name__: moduleName;
		@env1:__package__: moduleName;
		@env1:__path__: dirs.
	moduleInstance @env0:dynamicInstVarAt: #'__file__' put: None.
	self @env0:registerModule: moduleName with: moduleInstance.
	^ moduleInstance
%

category: 'Grail-Module Loading'
classmethod: importlib
___loadNamespacePackageIfAny___: moduleName
	"Answer a freshly built namespace package for moduleName, or nil when no
	search root holds a directory of that name.  The one entry point callers
	should use after ___moduleNameToPath___: comes back nil."

	| portions |
	portions := self ___namespacePortionsFor___: moduleName.
	portions @env0:isEmpty ifTrue: [^ nil].
	^ self ___loadNamespacePackage___: moduleName portions: portions
%

category: 'Grail-Module Loading'
classmethod: importlib
extraSearchRoots
	"Extra module search roots (a sys.path-like list), held in a SessionTemp
	so they can be configured per session without recompiling the class.
	Used to point Grail at third-party package trees (e.g. NumPy)."
	^ SessionTemps @env0:current @env0:at: #Grail_importlib_extraRoots otherwise: #()
%

category: 'Grail-Module Loading'
classmethod: importlib
___sysPathRoots___
	"``sys.path'' as an Array of directory strings, or #() when it is unusable.

	Appending to sys.path is THE documented way to extend the import search path in
	Python, and Grail's resolver did not consult it at all -- so
	``sys.path.append(d); import m'' raised ModuleNotFoundError no matter what was
	in d.  extraSearchRoots serves the same purpose but is Grail-specific, so only
	code written FOR Grail could reach it; ordinary Python could not.

	Read live rather than mirrored into extraSearchRoots: sys.path is an ordinary
	list a caller may append to, pop from, or replace wholesale -- the
	append-then-pop-in-cleanup idiom is standard, and test_traceback's
	make_module uses exactly it -- so a copy taken at configuration time would go
	stale.

	Fully guarded, and non-string entries are skipped: sys.path is a plain list
	that may hold anything (CPython allows path-hook objects there), and a failure
	to read it must not turn every import into an error."

	| sm p out |
	"The sys MODULE instance, via sys.modules -- ``sys'' names the class here, and
	the path list lives on the instance."
	sm := [(self @env1:modules) @env0:at: #'sys' otherwise: nil]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	sm == nil ifTrue: [^ #()].
	p := [sm @env0:at: #'path']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	p == nil ifTrue: [^ #()].
	out := OrderedCollection @env0:new.
	[p @env0:do: [:entry |
		(entry isKindOf: CharacterCollection) ifTrue: [
			entry @env0:isEmpty ifFalse: [out @env0:add: entry @env0:asString]]]]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	^ out @env0:asArray
%

category: 'Grail-Module Loading'
classmethod: importlib
addSearchRoot: aDir
	"Append aDir to the sys.path-like extra search roots (idempotent)."
	| roots |
	roots := OrderedCollection @env0:withAll: self extraSearchRoots.
	(roots @env0:includes: aDir) ifFalse: [roots @env0:add: aDir].
	SessionTemps @env0:current @env0:at: #Grail_importlib_extraRoots put: roots @env0:asArray.
	^ aDir
%

category: 'Grail-Module Loading'
classmethod: importlib
___moduleNameToSoPath___: aName
	"Search for a compiled extension (.so) for module aName.

	First the bundled ``grailDir/lib/<name>.so'' (Grail's own statically
	known C modules).  Then, for a dotted name, the package tree under
	each search root: ``numpy._core._multiarray_umath'' maps to
	``<root>/numpy/_core/'' and we glob for a basename matching
	``_multiarray_umath.*.so'' (the CPython ``.cpython-<ver>-<plat>.so'' /
	``.abi3.so'' / bare ``.so'' suffixes).  Returns the full path or nil.

	Returns via a local rather than ``^'' out of the do: block — this is
	reachable from the CPython shim's PyInit user-action callback, where a
	non-local return out of a real block raises RT_ERR_CANT_RETURN (2079)."
	| filePath parts joined searchRoots result dirPart leaf gd |
	gd := self @env0:grailDir.
	gd == nil ifTrue: [^ nil].
	filePath := ((gd @env0:, '/lib/') @env0:, aName) @env0:, '.so'.
	(GsFile @env0:existsOnServer: filePath) ifTrue: [^ filePath].

	parts := $. @env0:split: aName.
	joined := '/' @env0:join: parts.
	leaf := parts @env0:last.
	dirPart := (parts @env0:size @env0:> 1)
		ifTrue: ['/' @env0:join: (parts @env0:copyFrom: 1 to: parts @env0:size - 1)]
		ifFalse: [nil].
	searchRoots := (OrderedCollection @env0:new)
		@env0:add: gd;
		@env0:add: (gd @env0:, '/src/python/stdlib');
		@env0:addAll: self extraSearchRoots;
		@env0:addAll: self ___sysPathRoots___;
		@env0:yourself.
	result := nil.
	searchRoots @env0:do: [:root | | base dir entries |
		result @env0:isNil ifTrue: [
			base := ((root @env0:, '/') @env0:, joined) @env0:, '.so'.
			(GsFile @env0:existsOnServer: base) ifTrue: [result := base].
			result @env0:isNil ifTrue: [
				dir := dirPart @env0:isNil
					ifTrue: [root]
					ifFalse: [(root @env0:, '/') @env0:, dirPart].
				((GsFile @env0:isServerDirectory: dir) == true) ifTrue: [
					entries := GsFile @env0:contentsOfDirectory: dir onClient: false.
					(entries isKindOf: Array) ifTrue: [
						entries @env0:do: [:each | | nm idx |
							result @env0:isNil ifTrue: [
								nm := each @env0:asString.
								idx := (nm @env0:reverse) @env0:findString: '/' startingAt: 1.
								(idx @env0:> 0) ifTrue: [
									nm := nm @env0:copyFrom: (nm @env0:size - idx + 2) to: nm @env0:size].
								((nm @env0:beginsWith: (leaf @env0:, '.')) @env0:and: [nm @env0:endsWith: '.so'])
									ifTrue: [result := (dir @env0:, '/') @env0:, nm]]]]]]]].
	^ result
%

category: 'Grail-Module Registry'
classmethod: importlib
lookupModule: aName
	"Look up a module by name: the session registry first, then a lazy
	fallback for pure-Smalltalk builtin modules (socket, grail,
	_weakref, os.path, ...) resolved from the symbol list.  The
	registry is SESSION-LOCAL (SessionTemps); the old committed
	classInstVar accumulated builtin registrations at install time, so
	fresh sessions found them without this fallback.  Dotted aliases
	(os.path) retry with dots mapped to underscores (the os_path
	class).  Returns the module instance or nil."

	| sym found cls inst pmDict pmCls |
	sym := aName @env0:asSymbol.
	found := self modules @env0:at: sym ifAbsent: [nil].
	found @env0:notNil ifTrue: [^ found].
	"A vendored .py SHADOWS the Smalltalk builtin of the same name --
	the old committed registry expressed this by never containing
	fractions/heapq/etc.; here the filesystem probe expresses it
	directly.  (Seeded registry entries above still win: math, json,
	... are seeded by initializeBuiltinModules.)"
	(self ___moduleNameToPath___: aName) @env0:notNil ifTrue: [^ nil].
	"Backend-managed C-extension stand-ins (_sre, _statistics, ...)
	resolve through the session's configured backend (CPythonShim /
	EmbeddedExtensionModule) in ___import__:kw:, never through this
	builtin fallback -- the old committed registry expressed this by
	deliberately not containing them (see install.gs's SHIM_LIB_PATH
	comment)."
	(CPythonShim @env0:builtinModuleNames @env0:includes: sym) ifTrue: [^ nil].
	cls := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: sym.
	((cls @env0:isNil) and: [aName @env0:includes: $.]) ifTrue: [
		cls := System @env0:myUserProfile @env0:symbolList
			@env0:objectNamed: (aName @env0:copyReplaceAll: '.' with: '_') @env0:asSymbol].
	"A class REGISTERED IN PythonModules is a LOADED .py module, not a builtin:
	its lifecycle is sys.modules + the canonical registry, so it must NOT be
	lazily resurrected here by name.  Doing so would defeat a genuine sys.modules
	deletion -- e.g. the par.10.5 deployed-module guard, or a plain re-import
	after `del sys.modules[x]` -- by re-binding the stale class instance.  This
	fallback exists only for pure-Smalltalk BUILTIN modules (grail, socket,
	os_path, ...), which live in the Python dict.  Backing classes now keep their
	exact Python name, so that name matches sym; exclude the PythonModules entry
	explicitly (identity, so a builtin of the same spelling still resolves)."
	pmDict := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'PythonModules'.
	pmCls := pmDict @env0:isNil ifTrue: [nil] ifFalse: [pmDict @env0:at: sym otherwise: nil].
	(cls @env0:notNil and: [cls == pmCls]) ifTrue: [^ nil].
	((cls @env0:notNil)
		and: [(cls isKindOf: Behavior)
		and: [cls @env0:inheritsFrom: module]]) ifTrue: [
		inst := cls @env0:___instance___.
		self modules @env0:at: sym put: inst.
		^ inst].
	^ nil
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
			] ifFalse: [
				"PEP 420: a parent with no __init__.py is still a package."
				self @env0:class ___loadNamespacePackageIfAny___: prefix.
			].
		].
		2 @env0:to: nameParts __len__ - 1 do: [:i |
			prefix := (prefix @env0:, '.') @env0:, (nameParts @env0:at: i).
			(self @env0:class lookupModule: prefix) ifNil: [
				parentFilePath := self @env0:class ___moduleNameToPath___: prefix.
				parentFilePath notNil ifTrue: [
					self @env0:class @env0:loadModuleFromPath: parentFilePath name: prefix.
				] ifFalse: [
					self @env0:class ___loadNamespacePackageIfAny___: prefix.
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
			"PEP 420: no source anywhere on the path, but a DIRECTORY of that
			name is a namespace package.  Tried before the .so and shim probes
			because those are for modules that do have an implementation; a
			directory that is only a directory is the weakest claim and must
			not pre-empt a real extension of the same name."
			result := self @env0:class ___loadNamespacePackageIfAny___: absoluteName.
			result @env0:isNil ifTrue: [
			"Search filesystem for .so (C extension module)"
			filePath := self @env0:class ___moduleNameToSoPath___: absoluteName.
			filePath notNil ifTrue: [
				result := self @env0:class @env0:loadDynamicModuleNamed: absoluteName fromPath: filePath.
			].
			"Shim's built-in C-extension stand-ins (_sre, _statistics, ...),
			resolved lazily and only when the shim is this session's backend."
			(result @env0:isNil and: [CPythonShim @env0:isImportBackend]) ifTrue: [
				result := CPythonShim @env0:builtinModuleNamed: absoluteName.
				result @env0:notNil ifTrue: [
					self @env0:class @env0:registerModule: absoluteName with: result.
				].
			].
			"Embedded interpreter, when it is this session's backend."
			(result @env0:isNil and: [EmbeddedExtensionModule @env0:isImportBackend]) ifTrue: [
				result := EmbeddedExtensionModule @env0:importByName: absoluteName.
				self @env0:class @env0:registerModule: absoluteName with: result.
			].
			result ifNil: [
				"Module not found in filesystem either.  The message is built
				class-side so it can append a configuration hint when this
				session's grailDir could not satisfy ANY .py import -- the
				bare CPython wording blames whichever module was imported
				first (typically the first non-Smalltalk one)."
				ModuleNotFoundError ___signal___:
					(self @env0:class @env0:___moduleNotFoundMessage___: absoluteName)
			]
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
	happened via registerModule:.

	Guard: if the parent module already exposes ``fromName'' as an
	attribute (re-exported class / function / value), do NOT attempt
	to load a sibling submodule with the same name.  Case-insensitive
	filesystems (macOS HFS+) otherwise resolve ``parent.Headers'' to
	a sibling ``headers.py'' submodule and clobber the re-exported
	class with the submodule object."
	fromlist __len__ @env0:> 0 ifTrue: [
		fromlist @env0:do: [:fromName |
			| subName subPath alreadyBound soPath provided |
			"``*'' is the star-import marker, not a submodule name — the
			caller does the public-attr merge separately.  And ``import X''
			passes X's own name in the fromlist as the binding target (so
			absoluteName = fromName); that is the already-loaded module
			itself, not a ``X.X'' submodule.  Treat both as already-bound so
			the submodule-load / missing-name raise below never fires for
			``from PKG import *'' or plain ``import X''."
			alreadyBound := (fromName @env0:= '*')
				or: [(fromName @env0:= absoluteName)
				or: [(fromName @env0:= (nameParts @env0:last))
				or: [(result isKindOf: module)
				ifTrue: [
					"Check dynamic instVars first (fast path), then env-1
					methods (varargs _name:kw:, unary name, fixed-arity
					name:) so that 'from mod import fn' does not try to
					load mod.fn as a submodule file when fn is already a
					callable method on the module class.

					The method probe must only count selectors the MODULE
					ITSELF owns (its concrete class, or anything below
					``module`` in the chain).  Modules inherit the whole
					dict protocol through SymbolDictionary, so a blanket
					___pyAttrLoad___ probe reports names like ``values'' /
					``keys'' / ``items'' as bound and skips loading a real
					sibling submodule — ``from twilio.base import values''
					bound KeyValueDictionary>>values' OrderedCollection
					instead of values.py."
					(result @env0:dynamicInstVarAt: fromName @env0:asSymbol) notNil or: [
						| mcls s owned |
						mcls := result @env0:class.
						s := fromName @env0:asString.
						owned := false.
						{ s @env0:asSymbol.
						  (s @env0:, ':') @env0:asSymbol.
						  (s @env0:, ':_:') @env0:asSymbol.
						  (s @env0:, ':_:_:') @env0:asSymbol.
						  ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol } @env0:do: [:sel |
							| owner |
							owner := mcls @env0:whichClassIncludesSelector: sel environmentId: 1.
							(owner notNil and: [owner == module or: [owner @env0:inheritsFrom: module]])
								ifTrue: [owned := true]].
						owned or: [
							"Legacy SymbolDictionary at: storage (built-in
							modules still keep some constants there)."
							(result @env0:at: fromName @env0:asSymbol
								ifAbsent: [nil]) notNil]
					]
				]
				ifFalse: [false]]]].
			alreadyBound ifFalse: [
				subName := (absoluteName @env0:, '.') @env0:, fromName @env0:asString.
				(self @env0:class lookupModule: subName) ifNil: [
					subPath := self @env0:class ___moduleNameToPath___: subName.
					subPath notNil ifTrue: [
						self @env0:class
							@env0:loadModuleFromPath: subPath name: subName.
					] ifFalse: [
						"No attribute and no .py submodule.  Try a .so / builtin
						submodule; if none, and the package can't provide the
						name (even via a module-level __getattr__), it is a
						genuine ``from PKG import name'' miss — raise
						ModuleNotFoundError (an ImportError), NOT the
						AttributeError a downstream ___pyAttrLoad___ would
						produce.  This is what lets numpy's optional
						``try: from . import _distributor_init_local
						except ImportError: pass'' hook be caught."
						soPath := self @env0:class ___moduleNameToSoPath___: subName.
						soPath notNil
							ifTrue: [
								self @env0:class
									@env0:loadDynamicModuleNamed: subName fromPath: soPath]
							ifFalse: [
								provided := [(result ___pyAttrLoad___: fromName @env0:asSymbol). true]
									@env0:on: AbstractException do: [:ignored | false].
								provided ifFalse: [
									"A missing NAME, not a missing module: CPython raises
									ImportError here, saying ``cannot import name 'x' from
									'PKG' (path)'' and carrying name / name_from / path.
									ImportError is ModuleNotFoundError's BASE, so the
									``try: from . import x except ImportError: pass'' hooks
									this used to serve keep working."
									ImportError @env0:___signalCannotImportName___: fromName
										from: absoluteName
										path: (self @env0:class ___moduleNameToPath___: absoluteName)]]]
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
	"``importlib.reload(module)`` — re-read the module's source from its
	``__file__'' and re-compile it IN PLACE, then re-run the module body on the
	SAME instance.  Matches CPython: the module object's identity is preserved
	(so held references and ``sys.modules'' see the new code), and globals
	removed from the source persist (the body re-executes over the existing
	namespace rather than clearing it).

	Recompilation reuses ``___buildModuleClass:name:'' (the same path the
	initial load takes); because ``module subclass:'' re-parents the existing
	class, this updates the SAME class the live instance points at.  A module
	with no source path (a native/C-extension or built-in module) is returned
	unchanged."

	| path name moduleAst canonical srcHash stateMap |
	path := aModule @env0:dynamicInstVarAt: #'__file__'.
	path @env0:isNil ifTrue: [^ aModule].
	name := (aModule __name__) @env0:asString.
	"Canonical modules (doc par.10.5): reload IS the explicit re-execution
	path.  Force the emitted class-def probes COLD for the duration of the
	body re-run (a #match verdict left over from import would bind the
	registered classes and skip the recompiles, making reload a no-op);
	___canonicalSubclassOf: still reuses each class's IDENTITY, so the
	re-run refreshes methods in place and persisted instances follow the
	edit rather than stranding on an old class."
	canonical := importlib @env0:___canonicalClassesEnabled___.
	canonical ifTrue: [
		srcHash := (importlib @env0:___sourceStringForPath___: path @env0:asString) @env0:sha1Sum.
		stateMap := self @env0:_stateMap .
		stateMap @env0:at: name @env0:asSymbol put: #'stale'].
	moduleAst := importlib @env0:astForPath: path @env0:asString.
	moduleAst @env0:name: name.
	moduleAst @env0:useTempsForBlock: false.
	moduleAst @env0:setParent: nil.
	importlib @env0:expandStarImports: moduleAst.
	importlib @env0:___buildModuleClass: moduleAst name: name.
	"Re-parenting the class can reset its adopted singleton; re-adopt the live
	instance so it stays the module's canonical object before re-running body."
	(aModule @env0:class) @env0:___adoptInstance___: aModule.
	canonical ifTrue: [importlib @env0:___resetMintedThisLoad___: name].
	aModule initialize.
	"After a successful re-run: the current source is what the (same,
	identity-preserved) instance now reflects -- update the committed hash
	and registry entry in-transaction and mark the session verdict #match,
	so subsequent class probes reuse the refreshed classes.  A body that
	raised skipped this, leaving the verdict #stale (conservative: the next
	load rebuilds)."
	canonical ifTrue: [
		importlib @env0:___canonicalModuleHashes___ @env0:at: name put: srcHash.
		"Leave the session verdict #stale: the entry's PRESENCE drives the
		par.10.5 guard, and the emitted class-def probes must never hit
		after a body execution (par.10 -- probe hits are only sound when
		the whole committed instance binds without running the body)."
		importlib @env0:___canonicalModules___ @env0:at: name put: aModule].
	"Session tier (par.10.4): reload is a full re-acquisition -- the body
	re-ran, so per-session resources get re-bound the same as any other
	acquisition path."
	importlib @env0:___runSessionInit___: aModule.
	^ aModule
%

set compile_env: 0
