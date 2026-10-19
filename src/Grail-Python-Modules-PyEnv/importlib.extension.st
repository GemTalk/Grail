Extension { #name : 'importlib' }

{ #category : 'Grail-Meta Path' }
importlib class >> ___askFinder___: aFinder for: aName path: parentPath [
	"One USER finder's turn.  PEP 451 first (find_spec), PEP 302 second
	(find_module), nil when the finder declines or implements neither.  The
	pinned GrailBuiltinImporter never arrives here; ___askGrailImporterFor___:
	takes its turn, and says why.

	An exception raised by a finder PROPAGATES, as in CPython -- a finder that
	fails is a broken finder, not a decline.  Only the ATTRIBUTE PROBE is
	guarded, so that an object with no find_spec is passed over rather than
	turning every import into an AttributeError."

	| meth spec loader |
	meth := self ___pyMethodOf___: aFinder named: #'find_spec'.
	meth == nil ifFalse: [
		spec := meth @env1:value: { aName. parentPath } value: nil.
		(spec == nil or: [spec == None]) ifFalse: [
			^ self ___loadFromSpec___: spec name: aName]].
	meth := self ___pyMethodOf___: aFinder named: #'find_module'.
	meth == nil ifFalse: [
		loader := meth @env1:value: { aName. parentPath } value: nil.
		(loader == nil or: [loader == None]) ifFalse: [
			^ self ___loadViaLoader___: loader name: aName]].
	^ nil

]

{ #category : 'Grail-Meta Path' }
importlib class >> ___askGrailImporterFor___: aName [
	"The pinned GrailBuiltinImporter's turn, taken in Smalltalk rather than
	through its Python methods.

	It would have to build a ModuleSpec to answer find_spec, and the only
	ModuleSpec Grail has lives in the Python-side importlib facade -- so
	answering would mean performing an import from inside the import machinery,
	on the first cold import of a session.  Its Python methods are real and
	answer exactly this (see GrailBuiltinImporter); this is the same resolution
	without the re-entrancy, and without a Python call on every cold import."

	| path |
	path := self ___grailOwnedPathFor___: aName.
	path == nil ifTrue: [^ nil].
	^ self @env0:loadModuleFromPath: path name: aName

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___callerModuleName___ [
	"The name of the Python module whose code is currently running, as
	CPython's ``PyEval_GetGlobals()['__name__']'' would report it -- or nil
	when no such module can be identified.

	Needed by ``type(name, bases, ns)'', which stamps __module__ on the class
	it builds from the CALLER's globals.  A class statement gets its module at
	compile time; a class built at runtime has only the stack to ask.

	Grail reads its own stack the one way a running gem can, by RAISING
	(BaseException class>>___liveFrameChain___), which sys._getframe and
	warnings both already stand on.  Only a doit's frame carries its globals,
	so for every other frame the module is recovered by matching its
	co_filename against the __file__ of each imported module -- the same
	recovery warnings>>___warningOrigin___ makes, kept separate from it
	because that one wants the INNERMOST frame only and this one must walk
	OUTWARD.

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
		| globals code fname hit |
		"A DOIT FRAME CARRIES ITS GLOBALS, and they are the answer.  Evaluated
		code -- the REPL, an embedder's evaluateSource:, exec() -- has no file
		that sys.modules could match, so the filename test below finds nothing
		and the walk used to fall out to nil: ``type('T', (), {})'' typed at a
		prompt had no __module__ at all where CPython says '__main__'.  The
		live chain hands a doit's frame its scope as f_globals (see
		BaseException class >> ___doitGlobalsFor___:), and no other frame is
		given one, so its presence alone says this is a doit.

		ANSWERED EVEN WHEN __name__ IS MISSING.  ``exec(src, {})'' runs in
		globals with no __name__, and CPython then stamps nothing; walking on
		to the exec() CALLER's module would name a module the code never ran
		in."
		globals := [frame @env0:dynamicInstVarAt: #'f_globals']
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		(globals @env0:notNil and: [globals @env0:~~ None]) ifTrue: [
			hit := [globals @env0:at: '__name__' ifAbsent: [nil]]
				@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
			^ hit @env0:== None ifTrue: [nil] ifFalse: [hit]].
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

]

{ #category : 'Grail-Meta Path' }
importlib class >> ___emptyModuleNamed___: aName spec: aSpec loader: aLoader [
	"CPython's importlib.util.module_from_spec for a loader that defines
	exec_module but no create_module: a fresh, empty module carrying the
	attributes the machinery is required to set before execution.

	Built the way ___loadNamespacePackage___: builds one -- compile an EMPTY
	module body -- because that is exactly what this is: a module object whose
	contents the loader's exec_module is about to write."

	| moduleAst moduleClass inst origin locs isPkg parts pkgName |
	moduleAst := ModuleAst @env0:parseSource: ''.
	moduleClass := self @env0:___buildModuleClass: moduleAst name: aName.
	inst := moduleClass @env0:new.
	moduleClass @env0:___adoptInstance___: inst.
	origin := self ___specAttr___: aSpec named: #'origin'.
	locs := self ___specAttr___: aSpec named: #'submodule_search_locations'.
	"Python's None is a real object, so ``notNil'' is true of it -- the test has
	to name None explicitly or every non-package spec would be read as a
	package and get an empty __path__ plus its own name as __package__."
	isPkg := (locs ~~ nil) and: [locs ~~ None].
	parts := $. @env0:split: aName.
	pkgName := isPkg
		ifTrue: [aName]
		ifFalse: [parts @env0:size @env0:< 2
			ifTrue: ['']
			ifFalse: ['.' @env0:join: (parts @env0:copyFrom: 1 to: parts @env0:size - 1)]].
	"Through the shared seam, so a meta_path loader's module gets its attributes
	by the same rule as every other.  THE FINDER'S OWN SPEC IS KEPT -- it is
	whatever the finder answered and may be a CPython ModuleSpec, Grail's, or a
	duck-typed stand-in, and replacing it with one of ours would discard fields
	the finder set (loader_state especially).  So this derives the mirrors FROM
	that spec rather than building a new one."
	self @env0:___initModuleAttrsFrom___: aSpec on: inst.
	"__package__ is recomputed here rather than taken from the spec's ``parent'':
	a duck-typed finder spec need not have one, and pkgName above is derived
	from the same is-it-a-package test CPython uses.  Only overwritten when the
	spec did not supply a parent."
	(self ___specAttr___: aSpec named: #'parent') isNil
		ifTrue: [inst @env1:__package__: pkgName].
	^ inst

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___exactCaseEntry___: anEntry under: root path: joined [
	"Whether anEntry -- ``name.py'' or a package directory's ``name'' -- is in
	its directory with EXACTLY that case.  ``joined'' is the module's path below
	root (``pkg/name''); the directory is everything before its last part.

	A case-insensitive filesystem (macOS, by default) answers yes to
	existsOnServer: for ``pydantic/Json.py'' because ``pydantic/json.py''
	exists.  CPython's finder matches names case-SENSITIVELY (it compares
	against the directory's listing), so ``from pydantic import Json'' -- a
	name pydantic exports lazily, through its module __getattr__ -- reaches
	the type; Grail loaded the deprecated pydantic.json MODULE under the name
	``pydantic.Json'' instead, and every ``Json[...]'' annotation then failed
	(FastAPI's routes using one were silently never registered).

	Asked only once the file is known to exist, so a miss costs nothing and a
	hit one directory listing.  When the listing cannot be read, answers true:
	the old answer, not a refusal."

	| idx dir names |
	"An empty name (``__import__('')'' reaches here) has no entry to check;
	findLastSubString:startingAt: 0 would be an uncatchable OffsetError."
	(joined @env0:size @env0:= 0 or: [anEntry @env0:size @env0:= 0]) ifTrue: [^ true].
	idx := joined @env0:findLastSubString: '/' startingAt: joined @env0:size.
	dir := (idx @env0:isNil or: [idx @env0:= 0])
		ifTrue: [root]
		ifFalse: [(root @env0:, '/') @env0:, (joined @env0:copyFrom: 1 to: idx @env0:- 1)].
	names := GsFile @env0:_contentsOfServerDirectory: dir expandPath: false utf8Results: false.
	(names @env0:isKindOf: Array) ifFalse: [^ true].
	^ names @env0:anySatisfy: [:n | n @env0:asString @env0:= anEntry @env0:asString]

]

{ #category : 'Grail-Meta Path' }
importlib class >> ___findViaMetaPath___: aName [
	"Ask each ``sys.meta_path'' finder for aName; answer the module the first
	one that claims it produced, or nil when none does.

	WHERE THIS SITS, and why.  CPython's import is: sys.modules cache, then
	meta_path in order, and PathFinder -- the thing that actually walks the
	filesystem -- is simply the LAST meta_path entry.  Grail now matches that
	shape.  Callers reach this after ``lookupModule:'' has missed (the cache)
	and before the native filesystem search (the PathFinder equivalent, which
	stays in Smalltalk because it also owns namespace packages, .so loading and
	the shim backends).

	ORDER.  Every GrailBuiltinImporter in the list is asked first, in list
	order, and only then the rest.  That is ONE deviation from CPython's flat
	ordering, and it is the whole protection: ``sys.meta_path.insert(0, f)'' is
	how everyone spells ``ask my finder first'', so if list position decided,
	the ordinary idiom would silently displace Grail's own ``os'' and
	``traceback'' -- and Grail's runtime imports out of that tree at moments no
	user code chose (warnings -> linecache/re, PyEnumTypes -> inspect,
	CPythonShim -> contextvars).  CPython can afford literal ordering because
	the modules it protects are compiled into the binary and its cache is warm
	before user code runs; Grail's stdlib is .py files on disk, loaded lazily.
	The opt-out is explicit and total: remove the GrailBuiltinImporter from
	sys.meta_path and nothing is privileged any more.

	Measured against CPython 3.14 first, because the protection is easy to
	misplace: a spy finder at sys.meta_path[0] there is never asked for ``os''
	(already in sys.modules at startup) but IS asked for ``json'', ``struct'',
	``datetime'', ``threading'', ``io'' and ``weakref''.  So CPython's answer to
	``can a user finder shadow a stdlib module'' is YES for anything not
	preloaded, and the cache -- not the ordering -- is what usually protects.
	Grail keeps the cache doing that job and adds the pinned finder for the rest.

	The ``path'' argument is the parent package's __path__, as PEP 302
	specifies; None for a top-level name or a parent that has none."

	| entries found others parentPath |
	entries := self ___metaPathEntries___.
	entries @env0:isEmpty ifTrue: [^ nil].
	found := nil.
	others := OrderedCollection @env0:new.
	entries @env0:do: [:each |
		(each isKindOf: GrailBuiltinImporter)
			ifTrue: [found == nil ifTrue: [found := self ___askGrailImporterFor___: aName]]
			ifFalse: [others @env0:add: each]].
	found == nil ifFalse: [^ found].
	"Nothing but the pinned importer, which is the overwhelmingly common case --
	so the parent's __path__ (a lookup plus an attribute read) is computed here,
	only once a finder that will be given it exists."
	others @env0:isEmpty ifTrue: [^ nil].
	parentPath := self ___parentSearchPathFor___: aName.
	others @env0:do: [:each |
		found == nil ifTrue: [
			found := self ___askFinder___: each for: aName path: parentPath]].
	^ found

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___grailBundledRoots___ [
	"The root holding the THIRD-PARTY packages Grail ships -- flask, werkzeug,
	jinja2, markupsafe, django and the rest, each with its dist-info -- searched
	AFTER sys.path, like a lowest-priority site-packages.

	They used to sit in src/python/stdlib, which made them part of Grail's own
	roots: searched before sys.path and answered by the pinned importer, so a
	user's own copy (a later version, or a modified one) could never import --
	the package census reported them as SHADOWED.  Here they are a FALLBACK:
	what imports when the user has no copy of their own (#1713).  Still under
	grailDir/src/python/, so ___grailSharedSource___: keeps deploying them into
	the shared base and ___bundledRuntimeSource___: keeps their layout."

	| gd |
	gd := self @env0:grailDir.
	gd == nil ifTrue: [^ #()].
	^ Array @env0:with: (gd @env0:, '/src/python/bundled')

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___grailOwnedPathFor___: aName [
	"The source path for aName IF Grail itself ships it, else nil.  Same probe
	as ___moduleNameToPath___:, restricted to ___grailOwnRoots___."

	^ self ___probeSourcePathFor___: aName roots: self ___grailOwnRoots___

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___grailOwnRoots___ [
	"The two roots holding modules GRAIL ITSELF ships: the checkout and its
	ported stdlib.  Everything else on the search path -- extraSearchRoots,
	sys.path -- was put there by the caller, and the bundled third-party
	packages (___grailBundledRoots___) are deliberately NOT here: they are a
	fallback, not part of Grail.

	The distinction is what the pinned meta-path importer is built on: Grail's
	own tree is its equivalent of CPython's builtin + frozen modules, and its own
	runtime imports out of it (``re'', ``linecache'', ``inspect'',
	``contextvars'') at moments no user code chose."

	| gd |
	gd := self @env0:grailDir.
	gd == nil ifTrue: [^ #()].
	^ Array @env0:with: gd with: (gd @env0:, '/src/python/stdlib')

]

{ #category : 'Grail-Module Registry' }
importlib class >> ___importFromMiss___: aName of: aModule [
	"``from M import aName'' found no attribute aName on M (object >>
	___importFrom___:).  CPython's IMPORT_FROM then tries the submodule
	``M.aName'' in sys.modules -- bound there by an import the package's own
	attribute does not yet reflect -- and otherwise raises ImportError, with
	the module's __file__ as the path, ``(unknown location)'' when it has none."

	| pkg sub file |
	pkg := [aModule @env1:___pyAttrLoad___: #'__name__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	pkg == None ifTrue: [pkg := nil].
	pkg notNil ifTrue: [
		sub := self lookupModule: (pkg @env0:asString @env0:, '.') @env0:, aName @env0:asString.
		sub notNil ifTrue: [^ sub]].
	file := [aModule @env1:___pyAttrLoad___: #'__file__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	file == None ifTrue: [file := nil].
	^ ImportError @env0:___signalCannotImportName___: aName
		from: (pkg ifNil: ['<unknown module name>'])
		path: file

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___importSearchRoots___ [
	"Every directory the resolver searches, in order: Grail's own two roots,
	then extraSearchRoots, then ``sys.path'', then the bundled third-party
	packages (___grailBundledRoots___).  One list, read by both
	___moduleNameToPath___: and ___namespacePortionsFor___:, which have to agree
	about where modules live or PEP 420's ``a real module anywhere on the path
	beats a namespace package'' rule would be decided on two different paths."

	| gd |
	gd := self @env0:grailDir.
	gd == nil ifTrue: [^ #()].
	^ (OrderedCollection @env0:new)
		@env0:addAll: self ___grailOwnRoots___;
		@env0:addAll: self extraSearchRoots;
		@env0:addAll: self ___sysPathRoots___;
		@env0:addAll: self ___grailBundledRoots___;
		@env0:yourself

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___installCwdDir___ [
	"Put the WORKING DIRECTORY at sys.path[0], the way CPython's ``-m'' does.

	Measured on this box: ``cd /tmp/y; python3 -m cwdonly'' answers
	sys.path[0] = '/tmp/y' on both 3.11 and 3.13, and that entry is what lets
	``-m'' run a module living only in the directory you are standing in.
	Grail's runModule: resolved the name with no such entry, so that module
	raised ModuleNotFoundError -- measured, before this method existed.

	getcwd is already absolute, so there is no abspath: step here.

	Shares the one sys.path[0] slot with ___installScriptDir___: -- see
	___installSysPath0___:.  Guarded and never fatal; answers the directory
	installed, or nil."

	| cwd |
	cwd := [(os @env1:instance) @env1:getcwd]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	((cwd @env0:isKindOf: CharacterCollection)
		@env0:and: [cwd @env0:isEmpty @env0:not]) ifFalse: [^ nil].
	^ self @env1:___installSysPath0___: cwd @env0:asString

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___installScriptDir___: pathString [
	"Put the RUNNING SCRIPT's directory at sys.path[0], ABSOLUTE, the way
	CPython does.

	CPython gets this for free: every run is a fresh process, and the runtime
	prepends the script's directory before executing it.  Measured on this box,
	CPython 3.11 and 3.13 both answer an ABSOLUTE sys.path[0] even when the
	script was named relatively -- ``cd /tmp/x; python3 sub/app.py'' answers
	'/tmp/x/sub', not 'sub'.

	That difference is not cosmetic: sys.path is consulted at every later
	import, by which time the program may have chdir'd, and a RELATIVE entry
	then resolves against the new directory -- so the script's own siblings
	stop being importable.  Measured before this method absolutised, with
	helper.py beside the script: ``os.chdir('/')'' then ``import helper''
	raised ModuleNotFoundError under Grail and imported fine under CPython.

	A path with no directory part at all (``grail app.py'') answers the cwd, as
	CPython does; Grail's resolver skips an empty sys.path entry, so '''' would
	silently do nothing.  That branch was MEASURED to answer '.' rather than the
	cwd it intended: ``instance'' is an env-1 classmethod, so the old
	``os @env0:instance getcwd'' raised MessageNotUnderstood, the guard folded it
	to nil, and the ifFalse: arm installed '.'.  Both halves are fixed here --
	the env prefix is right, and abspath: of '.' is the cwd anyway.

	NOT done, deliberately: symlink resolution.  CPython resolves the script
	path's symlinks; Grail's ``os_path >> realpath:'' is ``abspath:'' with no
	symlink primitive under it, so there is nothing to build the resolution on
	and a symlinked script answers the LINK's directory.  Accepted platform gap
	-- see docs/Issues.md.

	This cannot shadow Grail's own stdlib -- ___moduleNameToPath___: searches
	sys.path LAST, deliberately -- and it is not allowed to break the run
	either: every step is guarded and any failure answers nil, leaving the
	script to execute exactly as before.  Answers the directory installed."

	| p i dir cwd abs |
	pathString == nil ifTrue: [^ nil].
	p := [pathString @env0:asString]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	p == nil ifTrue: [^ nil].
	i := p @env0:size.
	[(i @env0:> 0) @env0:and: [(p @env0:at: i) @env0:~= $/]]
		@env0:whileTrue: [i := i @env0:- 1].
	dir := (i @env0:> 1)
		ifTrue: [p @env0:copyFrom: 1 to: (i @env0:- 1)]
		ifFalse: [(i @env0:= 1) ifTrue: ['/'] ifFalse: ['']].
	dir @env0:isEmpty ifTrue: [
		cwd := [(os @env1:instance) @env1:getcwd]
			@env0:on: AbstractException do: [:e | e @env0:return: nil].
		dir := ((cwd @env0:isKindOf: CharacterCollection)
			@env0:and: [cwd @env0:isEmpty @env0:not])
				ifTrue: [cwd @env0:asString]
				ifFalse: ['.']].
	"Absolutise -- and normalise with it, since abspath: folds away ``.'' and
	``..'', so ``./sub/app.py'' and ``sub/../sub/app.py'' install the one entry
	a second run would.  Degrades to the relative spelling, which is exactly
	today's behaviour, if anything raises."
	abs := [(os_path @env1:instance) @env1:abspath: dir]
		@env0:on: AbstractException do: [:e | e @env0:return: dir].
	((abs @env0:isKindOf: CharacterCollection)
		@env0:and: [abs @env0:isEmpty @env0:not]) ifTrue: [dir := abs @env0:asString].
	^ self @env1:___installSysPath0___: dir

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___installSysPath0___: aDir [
	"Install aDir as sys.path[0] -- the ONE slot CPython gives the starting
	program -- and answer it, or nil if anything at all went wrong.

	Shared by the two callers that own that slot: ___installScriptDir___: (a
	script's own directory, for runPath:) and ___installCwdDir___ (the working
	directory, for runModule: and the launcher's ``-m'').  They deliberately
	share ONE remembered entry (#GrailSysScriptDir), because CPython's
	sys.path[0] is a single slot and the last program to START owns it:
	``python3 -m pkg'' does not leave a previous script's directory behind.
	Giving each caller its own SessionTemp would let a session accumulate one
	stale entry per KIND of start, which is the unbounded growth the
	replace-not-append rule exists to prevent.

	A CPython process runs one program and exits, so it never faces that; a
	Grail SESSION runs many (the SUnit shards run hundreds), so the entry a
	previous start installed is REMOVED before the new one goes on.  Only that
	remembered entry is removed -- anything a caller put on sys.path itself is
	left alone.

	Not allowed to break the run: every step is guarded and any failure answers
	nil, leaving the program to execute exactly as before."

	| idx sm sysPath prev |
	aDir == nil ifTrue: [^ nil].
	(aDir @env0:isKindOf: CharacterCollection) ifFalse: [^ nil].
	aDir @env0:isEmpty ifTrue: [^ nil].
	"The sys MODULE instance, via sys.modules -- ``sys'' names the class here,
	and the path list lives on the instance.  Same route as ___sysPathRoots___,
	and guarded for the same reason."
	sm := [(self @env1:modules) @env0:at: #'sys' otherwise: nil]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	sm == nil ifTrue: [^ nil].
	sysPath := [sm @env0:at: #'path']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	(sysPath @env0:isKindOf: OrderedCollection) ifFalse: [^ nil].
	prev := SessionTemps @env0:current @env0:at: #GrailSysScriptDir otherwise: nil.
	prev == nil ifFalse: [
		idx := 1.
		[idx @env0:<= sysPath @env0:size] @env0:whileTrue: [
			(((sysPath @env0:at: idx) @env0:isKindOf: CharacterCollection)
				@env0:and: [(sysPath @env0:at: idx) @env0:= prev])
					ifTrue: [sysPath @env0:removeAtIndex: idx]
					ifFalse: [idx := idx @env0:+ 1]]].
	sysPath @env0:addFirst: aDir.
	SessionTemps @env0:current @env0:at: #GrailSysScriptDir put: aDir.
	^ aDir

]

{ #category : 'Grail-Module Registry' }
importlib class >> ___isPackageForFromlist___: aModule [
	"Does ``__import__'' consult its fromlist for aModule?  CPython's
	_handle_fromlist runs only for a module with ``__path__'', a package.

	Read without raising, because every ``from M import x'' asks: a module's
	__path__ is in its dictionary when the loader set it (module >> __path__:)
	and a dynamic instVar when the module body assigned it.  Anything not a
	module -- what a custom __import__ hook may answer -- is asked through the
	ordinary attribute read."

	| p |
	(aModule @env0:isKindOf: module) ifFalse: [
		^ [p := aModule @env1:___pyAttrLoad___: #'__path__'.
			p ~~ nil and: [p ~~ None]]
				@env0:on: AbstractException do: [:ex | ex @env0:return: false]].
	(aModule @env0:includesKey: #'__path__') ifTrue: [
		p := aModule @env0:at: #'__path__'.
		^ p ~~ nil and: [p ~~ None]].
	p := aModule @env0:dynamicInstVarAt: #'__path__'.
	^ p ~~ nil and: [p ~~ None]

]

{ #category : 'Grail-Module Registry' }
importlib class >> ___isUnimportedSubmodule___: aValue named: aDottedName [
	"Is aValue -- an attribute of a package -- the package's own submodule
	aDottedName, which THIS SESSION has not imported?

	registerModule:with: binds a submodule onto its package, and a committed
	package keeps that binding.  So in a fresh gem the attribute is there
	although nothing imported the submodule, and the staleness check that an
	import runs (loadModuleFromPath:name:) has not run on it.  CPython's
	package object is new in every process, so its attribute can only mean
	the submodule was imported in this process.

	By NAME as well as kind, so a package that re-exports a different module
	under the name -- ``os.path'' is posixpath -- keeps it.  And only a
	COMMITTED submodule: within one session CPython counts the attribute
	however it got there -- ``del sys.modules['pkg.mod']'' and then ``from pkg
	import mod'' answers the old object -- and so does this."

	| n |
	(aValue @env0:isKindOf: module) ifFalse: [^ false].
	aValue @env0:isCommitted ifFalse: [^ false].
	n := [aValue @env1:__name__] @env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	(n ~~ nil and: [n ~~ None and: [n @env0:asString @env0:= aDottedName @env0:asString]])
		ifFalse: [^ false].
	^ (self modules @env0:at: aDottedName @env0:asString ifAbsent: [nil]) == nil

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___loadEmptyMainModule___ [
	"Build and register an EMPTY ``__main__'' for a session that is running no
	script.

	CPython's interpreter creates __main__ at startup, before any code runs, so
	``import __main__'' never searches and never fails -- under ``python -m
	test'' it is the test runner, in an embedding it is an empty module.  Grail
	makes one only when runPath:/runModule: loads a script under that name, so
	code imported any other way -- the CPython suite harness, a test importing
	a module by its real name, a Smalltalk-driven import -- got ``No module
	named '__main__''' where CPython hands back a module.  test.pickletester is
	the case that found it: it does ``import __main__'' at the top and then
	stores classes on it for the unpickler to find by ``__main__.<name>''.

	Built the way ___loadNamespacePackage___: builds one -- an empty module
	body -- and filed session-local like any other __main__
	(___isSessionLocalModule___:), so it is gone at the next login exactly as a
	script's __main__ is.  Resolved BEFORE the path search: CPython never looks
	for a __main__.py to satisfy the import, and one in the current directory
	must not be run as the program by an unrelated import."

	| moduleAst moduleClass moduleInstance |
	moduleAst := ModuleAst @env0:parseSource: ''.
	moduleClass := self @env0:___buildModuleClass: moduleAst name: '__main__'.
	moduleInstance := moduleClass @env0:new.
	moduleClass @env0:___adoptInstance___: moduleInstance.
	self
		@env0:___initModuleAttrsFrom___: (self
			@env0:___specFor___: '__main__'
			origin: nil
			loader: nil
			locations: nil)
		on: moduleInstance.
	self @env0:registerModule: '__main__' with: moduleInstance.
	^ moduleInstance

]

{ #category : 'Grail-Meta Path' }
importlib class >> ___loadFromSpec___: aSpec name: aName [
	"PEP 451: turn the ModuleSpec a finder answered into a live module.

	CPython's _bootstrap._load, reduced to what Grail can honour:

	  * loader is None -> a NAMESPACE spec; its submodule_search_locations are
	    the portions, and Grail already knows how to build one of those.
	  * loader has exec_module -> create_module(spec) (None means ``make me an
	    ordinary empty module''), register it in sys.modules BEFORE executing --
	    which is what lets a circular import see the partial module -- then
	    exec_module(module), then re-read sys.modules, because exec_module is
	    allowed to replace the entry (six's importer does exactly that).
	  * otherwise -> the legacy load_module(name).

	NOT implemented, deliberately: spec.loader_state, spec.cached,
	spec.has_location and module_repr.  Nothing in the corpus reads them, and
	each would need a Grail-side ModuleSpec that is more than the four-slot
	facade importlib.py already ships."

	| loader execM createM mod locs |
	loader := self ___specAttr___: aSpec named: #'loader'.
	(loader == nil or: [loader == None]) ifTrue: [
		locs := self ___specAttr___: aSpec named: #'submodule_search_locations'.
		(locs == nil or: [locs == None]) ifTrue: [
			^ ImportError @env1:___signal___:
				('meta path spec for ' @env0:, aName @env0:printString
					@env0:, ' has no loader')].
		"___loadNamespacePackage___:portions: is an env-1 classmethod -- it sits
		in this same env-1 region -- so it is a plain send, unlike the env-0
		___buildModuleClass:name: / registerModule:with: it calls internally."
		^ self ___loadNamespacePackage___: aName
			portions: (self ___stringListFrom___: locs)].
	execM := self ___pyMethodOf___: loader named: #'exec_module'.
	execM == nil ifTrue: [^ self ___loadViaLoader___: loader name: aName].
	createM := self ___pyMethodOf___: loader named: #'create_module'.
	mod := createM == nil
		ifTrue: [None]
		ifFalse: [createM @env1:value: { aSpec } value: nil].
	(mod == nil or: [mod == None])
		ifTrue: [mod := self ___emptyModuleNamed___: aName spec: aSpec loader: loader].
	self @env0:registerModule: aName with: mod.
	execM @env1:value: { mod } value: nil.
	^ (self @env1:lookupModule: aName) ifNil: [mod]

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___loadNamespacePackage___: moduleName portions: dirs [
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
	"PEP 451, through the same seam as every other loader path.  A namespace
	package is the case that makes has_location worth having: origin is None, so
	the spec reports has_location false and ___initModuleAttrsFrom___:on: sets
	``__file__'' to None -- present and None, not absent.  CPython does exactly
	that, and its own comment calls it a hack for consistency (bpo-32305).
	``__package__'' and ``__path__'' come from submodule_search_locations rather
	than being written separately."
	self
		@env0:___initModuleAttrsFrom___: (self
			@env0:___specFor___: moduleName
			origin: nil
			loader: nil
			locations: dirs)
		on: moduleInstance.
	self @env0:registerModule: moduleName with: moduleInstance.
	^ moduleInstance

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___loadNamespacePackageIfAny___: moduleName [
	"Answer a freshly built namespace package for moduleName, or nil when no
	search root holds a directory of that name.  The one entry point callers
	should use after ___moduleNameToPath___: comes back nil."

	| portions |
	portions := self ___namespacePortionsFor___: moduleName.
	portions @env0:isEmpty ifTrue: [^ nil].
	^ self ___loadNamespacePackage___: moduleName portions: portions

]

{ #category : 'Grail-Meta Path' }
importlib class >> ___loadViaLoader___: aLoader name: aName [
	"PEP 302's ``loader.load_module(fullname)'': the loader builds AND registers
	the module itself and answers it.  registerModule:with: is still called, for
	the parent/child attribute binding CPython's machinery does separately (it
	is idempotent on the sys.modules entry the loader already wrote)."

	| loadM mod |
	loadM := self ___pyMethodOf___: aLoader named: #'load_module'.
	loadM == nil ifTrue: [
		^ ImportError @env1:___signal___:
			('meta path loader for ' @env0:, aName @env0:printString
				@env0:, ' implements neither exec_module nor load_module')].
	mod := loadM @env1:value: { aName } value: nil.
	(mod == nil or: [mod == None]) ifTrue: [
		^ ImportError @env1:___signal___:
			('meta path loader for ' @env0:, aName @env0:printString
				@env0:, ' answered no module')].
	self @env0:registerModule: aName with: mod.
	^ mod

]

{ #category : 'Grail-Meta Path' }
importlib class >> ___metaPathEntries___ [
	"``sys.meta_path'' as an Array of finder objects, or #() when it is unusable.

	Read LIVE, like ___sysPathRoots___ reads sys.path: meta_path is an ordinary
	list a caller inserts into, pops from or replaces wholesale (six appends its
	_SixMetaPathImporter at import time; the append-then-remove-in-cleanup idiom
	is standard), so a copy taken at configuration time would go stale.

	Both stores are consulted.  A module attribute lives in the dynamic instVar
	AND in the underlying SymbolDictionary, and ``sys.meta_path = [...]'' writes
	the former while sys's own initialisation seeded the latter; reading only
	one of them would serve the wrong list after a wholesale replacement.

	Fully guarded, and nils are skipped: a failure to read meta_path must not
	turn every import into an error."

	| sm mp out |
	sm := [(self @env1:modules) @env0:at: #'sys' otherwise: nil]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	sm == nil ifTrue: [^ #()].
	mp := [sm @env0:dynamicInstVarAt: #'meta_path']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	mp == nil ifTrue: [
		mp := [sm @env0:at: #'meta_path' otherwise: nil]
			@env0:on: AbstractException do: [:e | e @env0:return: nil]].
	mp == nil ifTrue: [^ #()].
	out := OrderedCollection @env0:new.
	[mp @env0:do: [:entry | entry == nil ifFalse: [out @env0:add: entry]]]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	^ out @env0:asArray

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___moduleNameToPath___: aName [
	"Convert a module name (e.g., 'python.hello' or 're') to a file path.
	Search order: grailDir, grailDir/src/python/stdlib (the bundled stdlib
	ports), then the extra search roots (a sys.path-like list -- see
	extraSearchRoots / addSearchRoot:, used to point Grail at third-party
	package trees such as NumPy's site-packages), then ``sys.path'', and last
	grailDir/src/python/bundled, the third-party packages Grail ships.
	For each root, check name.py before name/__init__.py.

	sys.path comes after Grail's own roots, a deliberate deviation from CPython
	where it IS the whole search path.  Grail's ported stdlib under grailDir has
	to win: a directory a caller adds to sys.path must not be able to shadow
	Grail's own ``os'' or ``traceback'' with a same-named file, which searching
	sys.path first allows.  The bundled THIRD-PARTY packages are the opposite
	case and come after it (___grailBundledRoots___): a user's own flask or
	jinja2 -- a later version, or a modified one -- wins, as it does in CPython,
	and the bundled copy is what imports when there is none (#1713).

	The first two roots -- GRAIL'S OWN -- are also available on their own, as
	___grailOwnedPathFor___:.  That is what the pinned GrailBuiltinImporter at
	sys.meta_path[0] answers from, so a user-installed finder cannot shadow a
	module Grail ships (CPython protects its builtin and frozen modules the same
	way, by putting their finders ahead of PathFinder).

	A DOTTED name is looked for first in its parent's __path__, which is the
	only place CPython looks.  Joining the parts onto each root finds the same
	file whenever the parent is the directory its name spells, which is the
	usual case.  It finds nothing when a package's __path__ points somewhere
	else.  setuptools is the census case: its meta-path finder puts
	setuptools._distutils into sys.modules as ``distutils'', and then imports
	``distutils.core'', which exists only under setuptools/_distutils.  The
	root search is kept after it, so a name it used to find is still found."

	| fromParent |
	fromParent := self ___probeParentPathFor___: aName.
	fromParent == nil ifFalse: [^ fromParent].
	^ self ___probeSourcePathFor___: aName roots: self ___importSearchRoots___

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___moduleNameToSoPath___: aName [
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
	"``== true'', not a bare ifTrue:, on every existsOnServer: below.  It
	answers NIL (not false) when the probe itself errors, and a DOTTED name
	makes that ordinary: ``grail.gemstone'' probes <root>/grail/gemstone.so,
	and ./grail is the CLI shell SCRIPT, so stat fails with ENOTDIR.  A nil
	reaching the inlined ifTrue: raised ImproperOperation (error 2085,
	``Expected nil to be a Boolean'') -- an UNCATCHABLE Smalltalk error out
	of an ordinary ``import grail.<anything>'', before the .py resolver
	(which already guards this way) ever got a chance to find the module."
	((GsFile @env0:existsOnServer: filePath) == true) ifTrue: [^ filePath].

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
		@env0:addAll: self ___grailBundledRoots___;
		@env0:yourself.
	result := nil.
	searchRoots @env0:do: [:root | | base dir entries |
		result @env0:isNil ifTrue: [
			base := ((root @env0:, '/') @env0:, joined) @env0:, '.so'.
			((GsFile @env0:existsOnServer: base) == true) ifTrue: [result := base].
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

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___namespacePortionsFor___: aName [
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

	| pathParts joined searchRoots portions |
	"No directory is named with a NUL -- see ___probeSourcePathFor___:roots:."
	(aName @env0:includes: (Character @env0:codePoint: 0)) ifTrue: [^ #()].
	pathParts := $. @env0:split: aName.
	joined := '/' @env0:join: pathParts.
	searchRoots := self ___importSearchRoots___.
	portions := OrderedCollection @env0:new.
	"The parent's __path__ first, for the reason ___moduleNameToPath___: gives:
	it is where CPython looks, and it can name directories the joined name
	does not.  setuptools' ``distutils.compilers.C'' is two namespace levels
	under an aliased parent."
	(self ___parentPathEntriesFor___: aName) @env0:do: [:entry | | dir |
		dir := (entry @env0:, '/') @env0:, pathParts @env0:last.
		((GsFile @env0:isServerDirectory: dir) == true)
			ifTrue: [(portions @env0:includes: dir)
				ifFalse: [portions @env0:add: dir]]].
	searchRoots @env0:do: [:root | | dir |
		dir := (root @env0:, '/') @env0:, joined.
		"isServerDirectory: answers NIL for a path that does not exist, so
		compare == true rather than trusting it as a Boolean -- the same care
		___moduleNameToPath___: takes with existsOnServer:."
		((GsFile @env0:isServerDirectory: dir) == true)
			ifTrue: [(portions @env0:includes: dir)
				ifFalse: [portions @env0:add: dir]]].
	^ portions @env0:asArray

]

{ #category : 'Grail-Module Registry' }
importlib class >> ___parentModule___: aParentName of: aDottedName [
	"lookupModule: for a PARENT of the dotted name being imported -- except
	that None in sys.modules, which blocks the import, raises CPython's
	``No module named 'a.b'; 'a' is not a package'' rather than reading as a
	module that is there."

	| m mnfe msg |
	m := self lookupModule: aParentName.
	m == None ifFalse: [^ m].
	msg := 'No module named ''' @env0:, aDottedName @env0:asString
		@env0:, '''; ''' @env0:, aParentName @env0:asString @env0:, ''' is not a package'.
	mnfe := ModuleNotFoundError @env1:___new___.
	mnfe @env1:___args___: { msg }.
	mnfe @env0:dynamicInstVarAt: #'name' put: aDottedName @env0:asString.
	^ mnfe @env1:___signal___: msg

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___parentPathEntriesFor___: aName [
	"The loaded parent's __path__ as an Array of strings, for a dotted name.
	Empty for a top-level name and for a parent that is not loaded or has no
	__path__."

	| parentPath |
	(aName @env0:includes: $.) ifFalse: [^ #()].
	parentPath := self ___parentSearchPathFor___: aName.
	(parentPath == nil or: [parentPath == None]) ifTrue: [^ #()].
	^ self ___stringListFrom___: parentPath

]

{ #category : 'Grail-Meta Path' }
importlib class >> ___parentSearchPathFor___: aName [
	"The ``path'' argument PEP 302 hands a finder: the parent package's
	__path__ for a dotted name, None otherwise (and None when the parent is not
	loaded or has no __path__, which is what CPython passes for a plain module)."

	| parts parent |
	parts := $. @env0:split: aName.
	parts @env0:size @env0:< 2 ifTrue: [^ None].
	parent := [self @env1:lookupModule:
			('.' @env0:join: (parts @env0:copyFrom: 1 to: parts @env0:size - 1))]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	parent == nil ifTrue: [^ None].
	^ [parent @env1:___pyAttrLoad___: #'__path__']
		@env0:on: AbstractException do: [:e | e @env0:return: None]

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___probeParentPathFor___: aName [
	"``<entry>/<leaf>.py'' or ``<entry>/<leaf>/__init__.py'' for the first
	entry of the loaded parent's __path__ that has one, or nil.  Nil also for
	a top-level name, and for a parent that is not loaded or has no __path__."

	| entries |
	entries := self ___parentPathEntriesFor___: aName.
	entries @env0:isEmpty ifTrue: [^ nil].
	^ self ___probeSourcePathFor___: (($. @env0:split: aName) @env0:last) roots: entries

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___probeSourcePathFor___: aName roots: searchRoots [
	"First ``<root>/<name>.py'' or ``<root>/<name>/__init__.py'' across
	searchRoots, or nil."

	| pathParts joined result |
	"A NUL cannot be in a file name, and the OS stops reading the path at one:
	 ``string\0.py'' probes as ``string'', so ``__import__('string\0')'' found
	 the stdlib's string/ directory and loaded nothing, an uncatchable
	 MessageNotUnderstood (ImportAndOpenArgsTestCase).  Not found, as in
	 CPython, which answers ModuleNotFoundError."
	(aName @env0:includes: (Character @env0:codePoint: 0)) ifTrue: [^ nil].
	pathParts := $. @env0:split: aName.
	joined := '/' @env0:join: pathParts.
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
			(((GsFile @env0:existsOnServer: pyPath) == true)
				and: [self ___exactCaseEntry___: (pathParts @env0:last) @env0:, '.py'
					under: root path: joined])
				ifTrue: [result := pyPath]
				ifFalse: [
					initPath := base @env0:, '/__init__.py'.
					(((GsFile @env0:existsOnServer: initPath) == true)
						and: [self ___exactCaseEntry___: (pathParts @env0:last)
							under: root path: joined])
						ifTrue: [result := initPath]]]].
	^ result

]

{ #category : 'Grail-Meta Path' }
importlib class >> ___pyMethodOf___: anObject named: aSymbol [
	"anObject's bound ``aSymbol'' method, or nil when it has none.  The probe is
	an attribute read, so a missing name raises AttributeError; that is the
	answer ``this object does not implement the hook'', not an error."

	| got |
	got := [anObject @env1:___pyAttrLoad___: aSymbol]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	(got == nil or: [got == None]) ifTrue: [^ nil].
	^ got

]

{ #category : 'Grail-Module Registry' }
importlib class >> ___runtimeModule___: aName [
	"The module named aName, for Grail's own Smalltalk code to call into: the
	registered instance when it is already imported, otherwise loaded from the
	search path (which registers it).  ImportError when there is no such file.

	loadModuleFromPath:name: on its own is the LOADER, not an import: it never
	consults sys.modules, so a caller that used it per call rebuilt the module
	every time.  datetime.strptime did, until #1222: each call built a fresh
	_strptime (~310 ms, and its TimeRE and regex caches with it), the module in
	sys.modules changed on every call, and the session ran out of temporary
	object memory after about 200 calls."

	| m path |
	m := self lookupModule: aName.
	m == nil ifFalse: [^ m].
	path := self ___moduleNameToPath___: aName.
	path == nil ifTrue: [
		^ ImportError ___signal___:
			('No module named ' @env0:, aName @env0:printString)].
	^ self @env0:loadModuleFromPath: path name: aName

]

{ #category : 'Grail-Meta Path' }
importlib class >> ___specAttr___: aSpec named: aSymbol [
	"One attribute off a ModuleSpec, or nil when it has none.  A spec is
	whatever the finder answered -- CPython's ModuleSpec, Grail's _ModuleSpec
	facade, or a duck-typed stand-in -- so every read is a guarded probe."

	^ [aSpec @env1:___pyAttrLoad___: aSymbol]
		@env0:on: AbstractException do: [:e | e @env0:return: nil]

]

{ #category : 'Grail-Meta Path' }
importlib class >> ___stringListFrom___: anIterable [
	"anIterable's string elements as an Array; #() when it cannot be read."

	| out |
	out := OrderedCollection @env0:new.
	[anIterable @env0:do: [:each |
		(each isKindOf: CharacterCollection) ifTrue: [out @env0:add: each @env0:asString]]]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	^ out @env0:asArray

]

{ #category : 'Grail-Module Loading' }
importlib class >> ___sysPathRoots___ [
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

]

{ #category : 'Grail-Module Loading' }
importlib class >> addSearchRoot: aDir [
	"Append aDir to the sys.path-like extra search roots (idempotent)."
	| roots |
	roots := OrderedCollection @env0:withAll: self extraSearchRoots.
	(roots @env0:includes: aDir) ifFalse: [roots @env0:add: aDir].
	SessionTemps @env0:current @env0:at: #Grail_importlib_extraRoots put: roots @env0:asArray.
	^ aDir

]

{ #category : 'Grail-Module Loading' }
importlib class >> extraSearchRoots [
	"Extra module search roots (a sys.path-like list), held in a SessionTemp
	so they can be configured per session without recompiling the class.
	Used to point Grail at third-party package trees (e.g. NumPy)."
	^ SessionTemps @env0:current @env0:at: #Grail_importlib_extraRoots otherwise: #()

]

{ #category : 'Grail-Module Registry' }
importlib class >> lookupModule: aName [
	"Look up a module by name: the session registry first -- a HIT
	validated against the repository, see ___moduleEntryIsLive___: --
	then a lazy fallback for pure-Smalltalk builtin modules (socket, grail,
	_weakref, os.path, ...) resolved from the symbol list.  The
	registry is SESSION-LOCAL (SessionTemps); the old committed
	classInstVar accumulated builtin registrations at install time, so
	fresh sessions found them without this fallback.  Dotted aliases
	(os.path) retry with dots mapped to underscores (the os_path
	class).  Returns the module instance or nil."

	| sym found cls inst pmDict pmCls |
	sym := aName @env0:asSymbol.
	"Probe the registry with the NAME, not the Symbol: sys.modules is keyed by
	genuine ``str'' (PySysModules.gs), and while a Symbol probe still resolves
	there it costs a normalising copy on the hottest path in the importer.
	``sym'' below is for the SYMBOL LIST, which is a different question."
	found := self modules @env0:at: aName ifAbsent: [nil].
	found @env0:notNil ifTrue: [
		"A hit counts only while the repository still describes it
		(___moduleEntryIsLive___:).  An entry whose class an abort took is
		unloaded here and reported as a MISS, so the caller imports it cold
		-- rebuilding the class, its registration and its hash together, in
		the transaction that is running now.  removeModule:, not a bare
		removeKey:, so the module's submodules and its session-local caches
		go with it: they were built by the same rolled-back import and would
		otherwise be re-bound, stale, onto the fresh one -- and, since #824,
		so does this session's hash-state verdict, which used to be swept
		here by hand and nowhere else."
		(self @env0:___moduleEntryIsLive___: found) ifTrue: [
			self @env0:___awaitModuleInit___: aName.
			^ found].
		self @env0:removeModule: sym @env0:asString].
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
		"THROUGH registerModule:with:, not a bare ``at:put:''.  This is the
		SECOND way a module reaches sys.modules, and until #1068's follow-up it
		was the one that silently skipped every stamp: ``__builtins__'' and
		``__spec__'' are written by ___stampBuiltinsOn___: / ___stampBuiltinSpecOn___:,
		which are reached ONLY from registerModule:with: and from the one-time
		sweep -- and the sweep fires at the FIRST registration of the session,
		so anything minted here afterwards was never stamped and nothing ever
		came back for it.  Measured before the change, in a session that had
		already imported a .py module: grail, os.path and _weakref each carried
		``__spec__'' None and no ``__builtins__''.  (That, not ``created outside
		the import machinery'', is why the __spec__ coverage count fell short.)

		Registration also gives these modules the parent/child binding the bare
		store never did -- ``os.path'' on ``os'' -- which happened to be masked
		because os's own initialize binds ``path'' by hand.

		Env 0: this method is env 1 and registerModule:with: is env 0."
		self @env0:registerModule: aName with: inst.
		^ inst].
	^ nil

]

{ #category : 'Grail-Module Registry' }
importlib class >> modules [
	"Return the module registry (delegates to sys.modules).
	This is a SymbolDictionary mapping module names to module instances."
	^ sys modules

]

{ #category : 'Grail-Built-in Functions' }
importlib >> ___import__: positional kw: kwargs [
	"Low-level import function (__import__).
	__import__(name, globals=None, locals=None, fromlist=(), level=0) -> module"

	| name globals locals fromlist level absoluteName moduleInstance filePath result nameParts isDotted prefix parentFilePath |
	"EVERY KEYWORD READ IS DEFAULTED.  These were bare ``__getitem__'' sends,
	which raise KeyError for a key that is not there -- so supplying ANY
	keyword without supplying all of them failed on the first one missing:

	    __import__('sys', fromlist=['path'])    KeyError: 'globals'

	It survived because callers in the corpus pass either no keywords at all
	(kwargs nil, which the ifNil: branch covers) or the whole set.  A partial
	call is the ordinary spelling, and ``__import__(name='sys')'' is the
	smallest one."
	name := positional @env0:at: 1.
	"A name holding a LONE SURROGATE names no file and cannot be made a
	Symbol, so the only module it can be is one already put in sys.modules
	under it (which keeps such keys in its overflow).  Answer that or
	CPython's ModuleNotFoundError; the path below would coerce the name to a
	Smalltalk string and raise NotImplementedError instead
	(test_pickle's test_nonencodable_module_name_error)."
	(name @env0:isKindOf: PyStrSurrogate) ifTrue: [
		^ [(importlib @env1:modules) __getitem__: name]
			@env0:on: KeyError do: [:ex |
				ex @env0:return: ((Python @env0:at: #'ModuleNotFoundError') ___signal___:
					'No module named ' @env0:, name @env0:___pyRepr___)]].
	globals := (positional __len__ @env0:> 1)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [kwargs ifNotNil: [kwargs @env1:get: 'globals' _: None] ifNil: [None]].
	locals := (positional __len__ @env0:> 2)
		ifTrue: [positional @env0:at: 3]
		ifFalse: [kwargs ifNotNil: [kwargs @env1:get: 'locals' _: None] ifNil: [None]].
	fromlist := (positional __len__ @env0:> 3)
		ifTrue: [positional @env0:at: 4]
		ifFalse: [kwargs ifNotNil: [kwargs @env1:get: 'fromlist' _: {}] ifNil: [{}]].
	"A None fromlist is an EMPTY one: CPython only asks whether it is truthy.
	It is also what IMPORT_NAME passes for a plain ``import x'', so any code
	run under a __builtins__ override -- which routes its imports through
	builtins ___gatedImport___ and so through here with CPython's five
	arguments -- failed every plain import with ``object of type 'NoneType'
	has no len()''.  A bare in-function exec() is such code: its namespace
	is the module's globals, ``__builtins__'' included (test_warnings
	test_exec_filename)."
	(fromlist @env0:== None) ifTrue: [fromlist := {}].
	level := (positional __len__ @env0:> 4)
		ifTrue: [positional @env0:at: 5]
		ifFalse: [kwargs ifNotNil: [kwargs @env1:get: 'level' _: 0] ifNil: [0]].

	"Handle relative imports"
	absoluteName := (level @env0:> 0)
		ifTrue: [
			| package spec |
			"CPython's _calc___package__, including the WARNING it emits before
			giving up.  Three sources, in order: __package__, then __spec__'s
			parent, and only then a fallback to __name__ -- and the fallback is
			warned about (bpo-37409, ImportWarning) because it is a guess that
			can silently resolve to the wrong package.

			Grail read __package__ alone and raised immediately, so a relative
			import from a namespace with only __spec__ failed where CPython
			succeeds, and the documented warning never appeared.
			test_builtin test_import asserts the warning AND the ImportError
			together, which is what says the fallback was attempted rather than
			skipped."
			package := globals ifNotNil: [globals @env1:get: '__package__' _: None] ifNil: [None].
			spec := globals ifNotNil: [globals @env1:get: '__spec__' _: None] ifNil: [None].
			(package == None @env0:and: [spec ~~ None @env0:and: [spec ~~ nil]]) ifTrue: [
				package := [spec @env1:___pyAttrLoad___: #'parent']
					@env0:on: AbstractException do: [:ex | ex @env0:return: None]].
			package == None ifTrue: [
				((Python @env0:at: #warnings) @env0:___instance___)
					@env1:warn: 'can''t resolve package from __spec__ or __package__, '
						@env0:, 'falling back on __name__ and __path__'
					_: (Python @env0:at: #'ImportWarning').
				package := globals
					ifNotNil: [globals @env1:get: '__name__' _: None]
					ifNil: [None].
				"No __path__ means __name__ names a MODULE rather than a package,
				so the package is everything before its last dot -- which for a
				top-level module is nothing at all, and that is the case that
				then raises."
				((package ~~ None @env0:and: [package ~~ nil])
					@env0:and: [(globals @env1:__contains__: '__path__') @env0:not]) ifTrue: [
						| idx |
						idx := 0.
						1 @env0:to: package @env0:asString @env0:size do: [:i |
							((package @env0:asString @env0:at: i) @env0:== $.) ifTrue: [idx := i]].
						package := idx @env0:= 0
							ifTrue: ['']
							ifFalse: [package @env0:asString @env0:copyFrom: 1 to: idx @env0:- 1]]].
			((package == None) @env0:or: [package @env0:isNil
				@env0:or: [package @env0:asString @env0:isEmpty]]) ifTrue: [
				ImportError ___signal___: 'attempted relative import with no known parent package'
			].
			self ___resolve_name___: name package: package level: level
		]
		ifFalse: [name].

	"A NUL CANNOT NAME A MODULE, and every probe below would read the name
	 only up to it: the OS stops a path at a NUL, so ``__import__('string\0')''
	 found the stdlib's string/ directory as source and as a C extension to
	 dlopen.  CPython answers ModuleNotFoundError with the name repr'd."
	(absoluteName @env0:asString @env0:includes: (Character @env0:codePoint: 0)) ifTrue: [
		| mnfe msg |
		msg := 'No module named ' @env0:,
			((builtins @env0:___instance___) @env1:repr: absoluteName) @env0:asString.
		mnfe := ModuleNotFoundError @env1:___new___.
		mnfe @env1:___args___: { msg }.
		mnfe @env0:dynamicInstVarAt: #'name' put: absoluteName @env0:asString.
		mnfe @env1:___signal___: msg].

	"Split the name into parts; detect dotted names"
	nameParts := $. @env0:split: absoluteName.
	isDotted := nameParts __len__ @env0:> 1.

	"Ensure parent packages are loaded for dotted names"
	isDotted ifTrue: [
		prefix := nameParts @env0:at: 1.
		(self @env0:class ___parentModule___: prefix of: absoluteName) ifNil: [
			"sys.meta_path gets its turn on the PARENTS too, not only on the leaf
			-- ``import six.moves.urllib.parse'' needs three of its four
			components to come from six's finder, and CPython walks the parents
			through the same machinery it uses for the leaf."
			(self @env0:class ___findViaMetaPath___: prefix) ifNil: [
				parentFilePath := self @env0:class ___moduleNameToPath___: prefix.
				parentFilePath notNil ifTrue: [
					self @env0:class @env0:loadModuleFromPath: parentFilePath name: prefix.
				] ifFalse: [
					"PEP 420: a parent with no __init__.py is still a package."
					self @env0:class ___loadNamespacePackageIfAny___: prefix.
				].
			].
		].
		2 @env0:to: nameParts __len__ - 1 do: [:i |
			prefix := (prefix @env0:, '.') @env0:, (nameParts @env0:at: i).
			(self @env0:class ___parentModule___: prefix of: absoluteName) ifNil: [
				(self @env0:class ___findViaMetaPath___: prefix) ifNil: [
					parentFilePath := self @env0:class ___moduleNameToPath___: prefix.
					parentFilePath notNil ifTrue: [
						self @env0:class @env0:loadModuleFromPath: parentFilePath name: prefix.
					] ifFalse: [
						self @env0:class ___loadNamespacePackageIfAny___: prefix.
					].
				].
			].
		].
	].

	"Look up the module"
	moduleInstance := self @env0:class lookupModule: absoluteName.
	"None in sys.modules BLOCKS the import -- CPython's _find_and_load raises
	``import of X halted; None in sys.modules''.  test.support's
	import_fresh_module(blocked=) depends on it: statistics.py guards ``from
	_statistics import _normal_dist_inv_cdf'' with ``except ImportError''.
	Grail answered None, and the guard only worked because the fromlist loop
	then raised ``cannot import name'' -- which __import__ no longer does
	(#1223), so the blocked accelerator was imported anyway."
	moduleInstance == None ifTrue: [
		| mnfe msg |
		msg := 'import of ' @env0:, absoluteName @env0:asString
			@env0:, ' halted; None in sys.modules'.
		mnfe := ModuleNotFoundError @env1:___new___.
		mnfe @env1:___args___: { msg }.
		mnfe @env0:dynamicInstVarAt: #'name' put: absoluteName @env0:asString.
		^ mnfe @env1:___signal___: msg].
	moduleInstance isNil ifTrue: [
		"``sys.meta_path'' -- CPython's second step, between the sys.modules
		cache and PathFinder.  Grail's native filesystem search below plays the
		PathFinder role, and the GrailBuiltinImporter pinned at meta_path[0]
		keeps Grail's OWN tree out of a user finder's reach.  See
		___findViaMetaPath___:."
		moduleInstance := self @env0:class ___findViaMetaPath___: absoluteName].
	"No __main__ yet means no script is running: supply CPython's empty one
	rather than searching the path -- see ___loadEmptyMainModule___."
	(moduleInstance isNil and: [absoluteName @env0:asString @env0:= '__main__'])
		ifTrue: [moduleInstance := self @env0:class ___loadEmptyMainModule___].
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
				"CARRIES ``name'', as CPython's does: ``e.name'' is the module that
				 was not found, and it is what importlib.util and pkgutil callers
				 compare against to tell THIS module's absence from a transitive
				 one.  ___signal___: builds the instance with args alone, so the
				 attribute read None."
				| mnfe msg |
				msg := self @env0:class @env0:___moduleNotFoundMessage___: absoluteName.
				mnfe := ModuleNotFoundError @env1:___new___.
				mnfe @env1:___args___: { msg }.
				mnfe @env0:dynamicInstVarAt: #'name' put: absoluteName @env0:asString.
				mnfe @env1:___signal___: msg
			]
			]
		]
	].

	"Parent-binding of the just-loaded module is handled inside
	``registerModule:with:'' (which loadModuleFromPath: calls).

	THE FROMLIST, AS CPython's _handle_fromlist READS IT (issue #1223).  It
	only ever LOADS SUBMODULES: for each name the package does not already
	have, import ``PKG.name'' if there is such a module, and otherwise move on.
	It never raises for a missing name -- ``__import__('json', fromlist=
	['nope'])'' is json -- because the ``from PKG import name'' STATEMENT
	raises that ImportError itself, when it reads the name (object >>
	___importFrom___:, what ImportFromAst emits).  Raising here made every
	direct __import__ caller fail where CPython succeeds.

	  - Only for a PACKAGE.  A plain module's fromlist is ignored outright,
	    whatever it holds.
	  - A non-str item is CPython's TypeError.
	  - ``*'' is the star-import marker and the empty name never names a
	    submodule; both are skipped.  The empty name used to reach
	    ``dynamicInstVarAt:'' with an empty Symbol -- the kernel's uncatchable
	    ArgumentError 2718 -- and end the process.
	  - A name the package already has is bound -- EXCEPT a submodule this
	    session has not imported.  A committed package carries its submodules
	    as attributes from whichever session committed it, where CPython's
	    package is new in every process; counting such an attribute as bound
	    skipped the import, and with it the staleness check, so ``from PKG
	    import mod'' answered the committed module after mod.py was edited.

	Guard kept from before: if the package already exposes ``fromName'' as
	something other than a submodule (a re-exported class / function /
	value), do NOT load a sibling submodule of the same name.  Case-insensitive
	filesystems (macOS HFS+) otherwise resolve ``parent.Headers'' to a sibling
	``headers.py'' and clobber the re-exported class with the module."
	((fromlist __len__ @env0:> 0)
		and: [self @env0:class ___isPackageForFromlist___: result]) ifTrue: [
		fromlist @env0:do: [:fromName |
			| subName alreadyBound bound soPath |
			(fromName @env0:isKindOf: CharacterCollection) ifFalse: [
				^ TypeError ___signal___: 'Item in ``from list'''' must be str, not '
					@env0:, (fromName ___pyTypeNameForError___) @env0:asString].
			subName := (absoluteName @env0:, '.') @env0:, fromName @env0:asString.
			"``import X'' passes X's own name as the fromlist (the binding
			target), and that is the module itself, not an ``X.X''."
			alreadyBound := (fromName @env0:= '*')
				or: [(fromName @env0:isEmpty)
				or: [fromName @env0:= absoluteName]].
			alreadyBound ifFalse: [
				"Check dynamic instVars first (fast path), then env-1 methods
				(varargs _name:kw:, unary name, fixed-arity name:) so that
				``from mod import fn'' does not try to load mod.fn as a
				submodule file when fn is already a callable method on the
				module class.

				The method probe must only count selectors the MODULE ITSELF
				owns (its concrete class, or anything below ``module'' in the
				chain).  Modules inherit the whole dict protocol through
				SymbolDictionary, so a blanket ___pyAttrLoad___ probe reports
				names like ``values'' / ``keys'' / ``items'' as bound and skips
				loading a real sibling submodule -- ``from twilio.base import
				values'' bound KeyValueDictionary>>values' OrderedCollection
				instead of values.py."
				bound := (result isKindOf: module)
					ifTrue: [result @env0:dynamicInstVarAt: fromName @env0:asSymbol]
					ifFalse: [nil].
				alreadyBound := bound notNil
					ifTrue: [(self @env0:class ___isUnimportedSubmodule___: bound
						named: subName) not]
					ifFalse: [(result isKindOf: module) and: [
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
								ifAbsent: [nil]) notNil]]]].
			"A name equal to the package's own last component -- ``from a.b
			import b'' -- counts as bound unless such a submodule file actually
			exists; then it is loaded, as CPython's _handle_fromlist would
			(test_reprlib's LongReprTest: package, subpackage and module all
			share one long name)."
			(alreadyBound not and: [fromName @env0:= (nameParts @env0:last)]) ifTrue: [
				alreadyBound := (self @env0:class ___moduleNameToPath___: subName) isNil].
			alreadyBound ifFalse: [
				| subPath |
				((self @env0:class lookupModule: subName)
					ifNil: [self @env0:class ___findViaMetaPath___: subName]) ifNil: [
					subPath := self @env0:class ___moduleNameToPath___: subName.
					subPath notNil
						ifTrue: [
							self @env0:class
								@env0:loadModuleFromPath: subPath name: subName]
						ifFalse: [
							"Not a .py submodule: a .so one, or nothing -- and
							nothing is not an error here (see above)."
							soPath := self @env0:class ___moduleNameToSoPath___: subName.
							soPath notNil ifTrue: [
								self @env0:class
									@env0:loadDynamicModuleNamed: subName fromPath: soPath]]]]]].

	"A module body importing: part of its dependency record."
	self @env0:class @env0:___noteImport___: absoluteName @env0:asString fromlist: fromlist.
	"Return the correct module per CPython semantics.  With no fromlist that is
	the top package, imported -- not looked up, which answered nil when only the
	leaf could be found."
	^ (isDotted and: [fromlist __len__ == 0])
		ifTrue: [
			(self @env0:class lookupModule: (nameParts @env0:at: 1))
				ifNil: [self ___import__: { nameParts @env0:at: 1 } kw: nil]]
		ifFalse: [result]

]

{ #category : 'Grail-Private' }
importlib >> ___resolve_name___: name package: package [
	"import_module's relative form: ``name'' starts with one dot per level
	(``..util'' is level 2).  Counts them and resolves the rest."

	| s dots |
	s := name @env0:asString.
	dots := 0.
	[dots @env0:< s @env0:size @env0:and: [(s @env0:at: dots @env0:+ 1) @env0:== $.]]
		@env0:whileTrue: [dots := dots @env0:+ 1].
	^ self ___resolve_name___: (s @env0:copyFrom: dots @env0:+ 1 to: s @env0:size)
		package: package level: dots

]

{ #category : 'Grail-Private' }
importlib >> ___resolve_name___: name package: package level: level [
	"CPython's importlib._bootstrap._resolve_name: ``package'' less its last
	level - 1 components, then ``.name'' when there is a name.

	It answered the importlib instance instead -- the method had no return --
	and before that it sent an env-1 ``>'' to the level, an uncatchable
	MessageNotUnderstood.  So every relative __import__ died
	(``__import__('', globals, None, ('util',), 2)''), and so did
	import_module('.x', 'pkg'): nothing had reached this path, because a
	module's own ``from . import x'' is resolved at compile time."

	| parts keep base |
	parts := package @env0:asString @env0:subStrings: '.'.
	keep := parts @env0:size @env0:- (level @env0:- 1).
	keep @env0:< 1 ifTrue: [
		^ ImportError ___signal___: 'attempted relative import beyond top-level package'].
	base := parts @env0:at: 1.
	2 @env0:to: keep do: [:i | base := (base @env0:, '.') @env0:, (parts @env0:at: i)].
	(name @env0:isNil @env0:or: [name @env0:asString @env0:isEmpty]) ifTrue: [^ base].
	^ (base @env0:, '.') @env0:, name @env0:asString

]

{ #category : 'Grail-Built-in Functions' }
importlib >> _import_module: positional kw: kwargs [
	"import_module(name, package=None) -> module.
	Delegates to ___import__:kw:."

	| name package absoluteName topLevel |
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

	"Answer the module NAMED -- CPython's import_module does -- not the
	top-level package ``__import__'' answers for a dotted name.  This used to
	return ___import__'s result directly, so import_module('re._parser')
	answered re, and C's _PyImport_GetModuleAttrString (CPythonShim >>
	importGetAttr:name:) read a dotted module's attribute off its top-level
	package instead.  Every caller until #1253 passed a top-level name, where
	the two are the same object."
	topLevel := self ___import__: {absoluteName} kw: nil.
	^ importlib modules @env0:at: absoluteName @env0:asSymbol ifAbsent: [topLevel]

]

{ #category : 'Grail-Built-in Functions' }
importlib >> import_module: name [
	"import_module(name) -> module. 1-arg fast path."
	^ self _import_module: { name } kw: nil

]

{ #category : 'Grail-Initialization' }
importlib >> initialize [
	"No-op — all methods are real fast-path methods."

]

{ #category : 'Grail-Built-in Functions' }
importlib >> invalidate_caches [
	"``importlib.invalidate_caches()'' -- fan out to every sys.meta_path finder
	that implements it, as CPython does, and answer None.

	Grail's own resolution caches nothing (each probe re-reads the filesystem),
	so there is nothing local to invalidate; the call matters because a
	third-party finder may have built an index of a tree that has since
	changed, and this is the only signal it gets.  A finder without the hook is
	skipped, and one that raises is not allowed to abort the fan-out -- CPython
	calls them all."

	self @env0:class ___metaPathEntries___ @env0:do: [:finder |
		| hook |
		hook := self @env0:class ___pyMethodOf___: finder named: #'invalidate_caches'.
		hook == nil ifFalse: [
			[hook @env1:value: #() value: nil]
				@env0:on: AbstractException do: [:e | e @env0:return: nil]]].
	^ None

]

{ #category : 'Grail-Built-in Functions' }
importlib >> reload: aModule [
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

	| path name moduleAst srcHash stateMap imported |
	path := aModule @env0:dynamicInstVarAt: #'__file__'.
	path @env0:isNil ifTrue: [^ aModule].
	name := (aModule __name__) @env0:asString.
	"In the namespace the module belongs to, like its load
	(docs/App_Namespaces_Design.md §3.2): its registries and the symbol list
	its recompiled code binds against are that namespace's."
	(importlib @env0:___grailNeedsNamespaceOf___: name) ifTrue: [
		^ importlib @env0:___grailInNamespaceOf___: name do: [self reload: aModule]].
	"Canonical modules (doc par.10.5): reload IS the explicit re-execution
	path.  Force the emitted class-def probes COLD for the duration of the
	body re-run (a #match verdict left over from import would bind the
	registered classes and skip the recompiles, making reload a no-op);
	___canonicalSubclassOf: still reuses each class's IDENTITY, so the
	re-run refreshes methods in place and persisted instances follow the
	edit rather than stranding on an old class."
	srcHash := (importlib @env0:___sourceStringForPath___: path @env0:asString) @env0:sha1Sum.
	stateMap := self @env0:_stateMap .
	stateMap @env0:at: name @env0:asSymbol put: #'stale'.
	moduleAst := importlib @env0:astForPath: path @env0:asString.
	moduleAst @env0:name: name.
	moduleAst @env0:useTempsForBlock: false.
	moduleAst @env0:setParent: nil.
	importlib @env0:expandStarImports: moduleAst.
	importlib @env0:___buildModuleClass: moduleAst name: name.
	"The rebuild REPLACED the module's methods, and the session's method-keyed
	caches still hold the old ones -- each pinning its whole generated source,
	so a session that reloads in a loop ran out of memory (#1463)."
	BaseException @env0:___forgetMethodCaches___.
	"Re-parenting the class can reset its adopted singleton; re-adopt the live
	instance so it stays the module's canonical object before re-running body."
	(aModule @env0:class) @env0:___adoptInstance___: aModule.
	importlib @env0:___resetMintedThisLoad___: name.
	importlib @env0:___beginDepCollection___: name.
	"The re-run is the module's body, so its stores go to the module, as a
	load's do (module >> ___globalStoreIsSessionLocal___), and replace what
	this session had changed: a patched function is the module's own again."
	module @env0:___forgetSessionGlobalsOf___: name.
	[module @env0:___withPersistentGlobalStores___: [aModule initialize]] @env0:ensure: [
		imported := importlib @env0:___endDepCollection___: name].
	"After a successful re-run: the current source is what the (same,
	identity-preserved) instance now reflects -- update the committed hash
	and registry entry in-transaction and mark the session verdict #match,
	so subsequent class probes reuse the refreshed classes.  A body that
	raised skipped this, leaving the verdict #stale (conservative: the next
	load rebuilds)."
	"A session-local module (``__main__'') records nothing here either --
	see importlib >> ___isSessionLocalModule___:."
	(importlib @env0:___isSessionLocalModule___: name) ifTrue: [
		importlib @env0:___runSessionInit___: aModule.
		^ aModule].
	"What the re-run imported is its dependency record now; the generation
	moves only when the source did."
	importlib @env0:___recordDepsOf___: name srcHash: srcHash names: imported
		changed: ((importlib @env0:___canonicalModuleHashes___ @env0:at: name otherwise: nil) @env0:~= srcHash).
	importlib @env0:___canonicalModuleHashes___ @env0:at: name put: srcHash.
	"Leave the session verdict #stale: the entry's PRESENCE drives the
	par.10.5 guard, and the emitted class-def probes must never hit
	after a body execution (par.10 -- probe hits are only sound when
	the whole committed instance binds without running the body)."
	importlib @env0:___canonicalModules___ @env0:at: name put: aModule.
	"Session tier (par.10.4): reload is a full re-acquisition -- the body
	re-ran, so per-session resources get re-bound the same as any other
	acquisition path."
	importlib @env0:___runSessionInit___: aModule.
	^ aModule

]
