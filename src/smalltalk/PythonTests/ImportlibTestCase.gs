! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportlibTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportlibTestCase'
  instVarNames: #( savedCodegenTraceDir )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ImportlibTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ImportlibTestCase - Tests for Python importlib module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ImportlibTestCase removeAllMethods: 0.
ImportlibTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ImportlibTestCase
setUp
	"Initialize the builtin modules + enable codegen tracing.

	Several ImportlibTestCase tests assert on the contents of
	``$TMP/codegen/<module>.tpz'' (the Topaz-style codegen capture);
	the capture is OPT-IN as of the ``GRAIL_CODEGEN_TRACE_DIR'' env
	var.  Save the var's incoming value (restored in tearDown so a test
	run that started with it unset doesn't leave it pinned), then set it
	and invalidate the cached value so subsequent ``loadModuleFromPath:''
	calls write the trace files."

	importlib @env1:modules.
	savedCodegenTraceDir := System gemEnvironmentVariable: 'GRAIL_CODEGEN_TRACE_DIR'.
	System gemEnvironmentVariable: 'GRAIL_CODEGEN_TRACE_DIR' put: (self tmp: 'codegen').
	importlib ___codegenTraceDirInvalidate___
%

category: 'Grail-Setup'
method: ImportlibTestCase
tearDown
	"Restore GRAIL_CODEGEN_TRACE_DIR to whatever it was before this test
	(often unset), so the suite doesn't leave the session env var pinned
	to ``$TMP/codegen''.  An unset incoming value (nil) restores to the empty
	string — Grail treats that as ``tracing off'', and there is no gem API
	to truly unset a session env var.  Invalidate the cached value so the
	next reader re-reads the env var."

	System gemEnvironmentVariable: 'GRAIL_CODEGEN_TRACE_DIR'
		put: (savedCodegenTraceDir ifNil: ['']).
	importlib ___codegenTraceDirInvalidate___
%

category: 'Grail-Tests'
method: ImportlibTestCase
testStackExhaustionUsesTheErrorFlavour
	"The session must be in the ERROR flavour of stack exhaustion --
	AlmostOutOfStackError (2519), an ordinary Error -- because that is what
	___recursionGuard___ converts into CPython's RecursionError.

	The default is the NOTIFICATION, AlmostOutOfStack (2502), and a Notification
	whose handler does not unwind RESUMES: a runaway recursion then runs on to
	the Red Zone, where the VM kills the gem with a signal no Python ``except''
	can contain.  CPython promises RecursionError for exactly this shape --
	comparing two reflexive containers -- so the wrong flavour turns a passing
	test into a dead gem.

	Asserted rather than assumed because the enable is GUARDED (a product
	without the selector must not stop an import), which makes a failure silent
	by construction: the flavour is a session-wide setting that nothing else
	reports, and the first symptom is a CRASH in a suite module.  A cheap
	predicate here fails loudly, in every environment the suite runs in, instead.

	importlib ___ensureStackErrorFlavour___ is memoised per session, so calling
	it here costs a dictionary probe and makes the test independent of which
	import happened to run first."

	importlib ___ensureStackErrorFlavour___.
	self assert: AlmostOutOfStackError enabled
		description: 'stack exhaustion must signal AlmostOutOfStackError (the Error
flavour); in the Notification flavour a runaway recursion reaches the Red Zone
and kills the gem instead of raising RecursionError'
%

category: 'Grail-Tests - AST Generation'
method: ImportlibTestCase
testAstForPath
	"Test creating a ModuleAst from hello.py"

	| moduleAst testFilePath |
	testFilePath := importlib grailDir , '/src/python/hello.py'.
	moduleAst := importlib astForPath: testFilePath.

	self assert: moduleAst class equals: ModuleAst.
	self assert: moduleAst name equals: '__main__'.
	self assert: moduleAst path equals: testFilePath
%

category: 'Grail-Tests - AST Generation'
method: ImportlibTestCase
testAstForSource
	"Test creating a ModuleAst from Python source code"

	| moduleAst |
	moduleAst := importlib astForSource: 'x = 1'.

	self assert: moduleAst class equals: ModuleAst.
	self assert: moduleAst name equals: '__main__'
%

category: 'Grail-Tests - __import__'
method: ImportlibTestCase
testBuiltinsImport
	"Test builtins.__import__ — Phase-4 varargs fast-path direct method dispatch."

	| b result |
	b := builtins ___instance___.

	result := b @env1:___import__: { 'math' } kw: nil.

	self assert: result class equals: math
%

category: 'Grail-Tests - __import__'
method: ImportlibTestCase
testBuiltinsImportNotFound
	"Test that builtins.__import__ raises ModuleNotFoundError for unknown modules"

	| b |
	b := builtins ___instance___.

	self should: [b @env1:___import__: { 'unknown_module' } kw: nil]
		raise: ModuleNotFoundError
%

category: 'Grail-Tests - import_module'
method: ImportlibTestCase
testImportModuleBuiltins
	"Test importing the builtins module"

	| imp result |
	imp := importlib @env1:instance.

	result := imp @env1:import_module: 'builtins'.

	self assert: result class equals: builtins
%

category: 'Grail-Tests - import_module'
method: ImportlibTestCase
testImportModuleCmath
	"Test importing the cmath module"

	| imp result |
	imp := importlib @env1:instance.

	result := imp @env1:import_module: 'cmath'.

	self assert: result class equals: cmath
%

category: 'Grail-Tests - import_module'
method: ImportlibTestCase
testImportModuleMath
	"Test importing the math module"

	| imp result |
	imp := importlib @env1:instance.

	result := imp @env1:import_module: 'math'.

	self assert: result class equals: math
%

category: 'Grail-Tests - import_module'
method: ImportlibTestCase
testImportModuleNotFound
	"Test that importing a non-existent module raises ModuleNotFoundError"

	| imp |
	imp := importlib @env1:instance.

	self should: [imp @env1:import_module: 'nonexistent_module']
		raise: ModuleNotFoundError
%

category: 'Grail-Tests - import_module'
method: ImportlibTestCase
testImportModuleOs
	"Test importing the os module"

	| imp result |
	imp := importlib @env1:instance.

	result := imp @env1:import_module: 'os'.

	self assert: result class equals: os
%

category: 'Grail-Tests - import_module'
method: ImportlibTestCase
testImportModuleSys
	"Test importing the sys module"

	| imp result |
	imp := importlib @env1:instance.

	result := imp @env1:import_module: 'sys'.

	self assert: result class equals: sys
%

category: 'Grail-Tests - invalidate_caches'
method: ImportlibTestCase
testInvalidateCaches
	"Test invalidate_caches (should be a no-op for built-in modules)"

	| imp result |
	imp := importlib @env1:instance.
	result := imp @env1:invalidate_caches.
	self assert: result equals: None
%

category: 'Grail-Tests - Module Registry'
method: ImportlibTestCase
testLookupModule
	"Test looking up modules by name"

	| mathModule osModule unknownModule |
	mathModule := importlib ___lookupModule___: 'math'.
	osModule := importlib ___lookupModule___: 'os'.
	unknownModule := importlib ___lookupModule___: 'nonexistent'.

	self assert: mathModule class equals: math.
	self assert: osModule class equals: os.
	self assert: unknownModule equals: nil
%

category: 'Grail-Tests - Module Registry'
method: ImportlibTestCase
testModulesRegistry
	"Test that the modules registry exists and contains built-in modules"

	| modules |
	modules := importlib @env1:modules.

	self assert: (modules includesKey: #builtins).
	self assert: (modules includesKey: #math).
	self assert: (modules includesKey: #cmath).
	self assert: (modules includesKey: #os).
	self assert: (modules includesKey: #sys)
%

category: 'Grail-Tests - Singleton'
method: ImportlibTestCase
testNewRaisesTypeError
	"Test that importlib.new raises TypeError"

	self should: [importlib @env1:new]
		raise: TypeError
%

category: 'Grail-Tests - reload'
method: ImportlibTestCase
testReload
	"Test reloading a module"

	| imp mathInstance reloadedInstance |
	imp := importlib @env1:instance.

	mathInstance := math @env1:instance.
	reloadedInstance := imp @env1:reload: mathInstance.

	"After reload, we should get a fresh instance"
	self assert: reloadedInstance class equals: math
%

category: 'Grail-Tests - Singleton'
method: ImportlibTestCase
testSingleton
	"Test that importlib.instance returns the same instance"

	| instance1 instance2 |
	instance1 := importlib @env1:instance.
	instance2 := importlib @env1:instance.

	self assert: instance1 == instance2
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testSmalltalkForPath
	"Test generating Smalltalk code from hello.py — sanity-check that
	identifiers from the source survive into the generated Smalltalk."

	| smalltalkCode testFilePath |
	testFilePath := importlib grailDir , '/src/python/hello.py'.
	smalltalkCode := importlib smalltalkForPath: testFilePath.

	self assert: smalltalkCode isString.
	self assert: smalltalkCode notEmpty.
	self assert: (smalltalkCode includesString: 'say_hello').
	self assert: (smalltalkCode includesString: 'trailing_character').
	self assert: (smalltalkCode includesString: 'Hello ').
	self assert: (smalltalkCode includesString: 'Allen')
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testIrForPath
	"Test that compiling hello.py produces an IR tree whose printString
	reflects the Python source.  Exercises the full transpile +
	Smalltalk-compile pipeline without executing the program."

	| ir irString testFilePath |
	testFilePath := importlib grailDir , '/src/python/hello.py'.
	ir := importlib irForPath: testFilePath.

	self assert: ir notNil.
	irString := ir printString.
	self assert: irString isString.
	self assert: irString notEmpty.
	self assert: (irString includesString: 'Allen').
	self assert: (irString includesString: 'Hello ')
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testRunPathParamReassignment
	"Direct coverage for the method-arg optimisation in
	FunctionDefAst >> generateModuleMethodSourceOn:.  Three shapes exercise
	the three temp-forcing conditions:

	  - ``bump(x)`` rebinds the parameter (``x = x + 1``).  Detected
	    via the NameAst-store walk; the param must round-trip through
	    a ``___1`` placeholder + block temp because Smalltalk method
	    args are read-only.
	  - ``squash(predicate)`` rebinds the parameter via a nested
	    ``def predicate(...)`` — exercises the FunctionDefAst.name
	    branch of the walk (NameAst-store would miss this, since the
	    nested def's name isn't a NameAst).
	  - ``passthrough(value)`` does not rebind, so the optimisation
	    fires: ``value`` serves as the Smalltalk method argument
	    directly.

	A wrong-temp generation would either reject at Smalltalk compile
	time (assigning to a method arg) or silently use a stale value;
	the value assertions detect both."

	| testFilePath module |
	testFilePath := importlib grailDir , '/tests/python/param_reassignment.py'.
	importlib @env1:modules removeKey: #'__main__' ifAbsent: [].

	module := importlib runPath: testFilePath.

	self assert: module notNil.
	self assert: (module @env1:bumped) equals: 11.
	self assert: (module @env1:squashed) equals: 'replaced'.
	self assert: (module @env1:passed_through) equals: 42
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testRunPathClassDefinition
	"`grail tests/python/module_with_classes.py` must succeed end-to-end.
	Class methods take `self` as their first Python parameter, which the
	legacy doit-based codegen emitted as a Smalltalk block temp — and
	`self` is a reserved pseudo-variable, so the Smalltalk compiler
	rejected the whole module.  runPath: must route the class through
	the loadModuleFromPath: machinery (which emits real env-1 methods
	where `self` is the receiver, not a temp)."

	| testFilePath module |
	testFilePath := importlib grailDir , '/tests/python/module_with_classes.py'.
	importlib @env1:modules removeKey: #'__main__' ifAbsent: [].

	module := importlib runPath: testFilePath.

	self assert: module notNil.
	"Module body ran: Point(3, 4).sum() == 7, three Counter.inc()s give 3."
	self assert: (module @env1:p_sum) equals: 7.
	self assert: (module @env1:c_count) equals: 3
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testClassMethodCompileForm
	"Regression: ClassDefAst codegen emits compile calls in the
	compact ``Foo [class] ___compileMethod: '...' category: '...'.''
	form (Behavior >> ___compileMethod:category: helper) rather than
	the long inline ``[Foo compileMethod: ... dictionaries: ... env: 1]
	on: CompileWarning do: ...'' boilerplate.  Both forms compile to
	the same install behavior; the helper just hides ~200 chars of
	repeated machinery per method.  Also verifies the helper is
	reachable from both Class-side and Metaclass3-side receivers
	(installed on Behavior so ``Foo'' AND ``Foo class'' resolve it)."

	| testFilePath tpzPath tpzContents |
	testFilePath := importlib grailDir , '/tests/python/module_with_classes.py'.
	tpzPath := (self tmp: 'codegen/__main__.tpz').

	importlib @env1:modules removeKey: #'__main__' ifAbsent: [].
	(GsFile existsOnServer: tpzPath) ifTrue: [GsFile removeServerFile: tpzPath].
	importlib runPath: testFilePath.

	tpzContents := (GsFile open: tpzPath mode: 'rb' onClient: false)
		contentsAsUtf8 decodeToUnicode.

	"Compact helper form is used (instance side and class side)."
	self assert: (tpzContents includesString: 'Point ___compileMethod: ').
	self assert: (tpzContents includesString: 'Point @env0:class ___compileMethod: ').

	"The long inline boilerplate is gone — neither the
	``dictionaries: (Python at: #importlib) ___compilationSymbolList___''
	chain nor the ``environmentId: 1] on: CompileWarning'' tail should
	appear in any generated class compile."
	self deny: (tpzContents includesString: '___compilationSymbolList___').
	self deny: (tpzContents includesString: 'environmentId: 1] @env0:on: CompileWarning')
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testInstanceMethodUnderscoreParamNames
	"Regression: FunctionDefAst >> generateMethodSourceOn: (the
	class-method form) picks ``_x'' transport names for Python
	parameters that need a block-local copy (because they collide
	with an instVar or get reassigned), rather than the older
	``___N'' positional placeholder.  The selector reads
	traceably, and the copy line below reads
	``x := _x.'' instead of ``x := ___1.''.

	Verified on Point's ``move(self, x, y)'' — both ``x'' and ``y''
	are instVars (assigned via ``self.x = x'' in the body), so both
	need temps; both pick the ``_<name>'' transport because no
	conflicting param/local/instVar would shadow it.  (``__init__'' is
	now forced to the varargs form for keyword binding, so a regular
	fixed-arity method is used here to exercise the transport.)"

	| testFilePath tpzPath tpzContents |
	testFilePath := importlib grailDir , '/tests/python/module_with_classes.py'.
	tpzPath := (self tmp: 'codegen/__main__.tpz').

	importlib @env1:modules removeKey: #'__main__' ifAbsent: [].
	(GsFile existsOnServer: tpzPath) ifTrue: [GsFile removeServerFile: tpzPath].
	importlib runPath: testFilePath.

	tpzContents := (GsFile open: tpzPath mode: 'rb' onClient: false)
		contentsAsUtf8 decodeToUnicode.

	"New shape: ``move: _x _: _y'' (underscore-prefixed transport)
	plus block-temp copies that mention the same ``_x'' / ``_y'' names.
	Old shape used ``___1'' / ``___2'' positional placeholders."
	self assert: (tpzContents includesString: 'move: _x _: _y').
	self assert: (tpzContents includesString: '	x := _x.').
	self assert: (tpzContents includesString: '	y := _y.').
	self deny: (tpzContents includesString: 'move: ___1 _: ___2')
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testInstanceMethodNoOuterBlock
	"Regression: FunctionDefAst >> generateMethodSourceOn: omits the
	outer ``[ | locals | ... ] value'' wrapper when the method body
	has no locals.  Without the optimisation, every instance method
	paid for an outer block invocation even when there were no temps
	to declare; with it, the method body is the method body.

	The Point class's ``sum`` method body is a single ``return
	self.x + self.y'' with no locals — its compiled source must
	start with ``^'' (a direct return), not ``^ [...] value'' (the
	old block-wrapped shape)."

	| testFilePath tpzPath tpzContents sumStart |
	testFilePath := importlib grailDir , '/tests/python/module_with_classes.py'.
	tpzPath := (self tmp: 'codegen/__main__.tpz').

	importlib @env1:modules removeKey: #'__main__' ifAbsent: [].
	(GsFile existsOnServer: tpzPath) ifTrue: [GsFile removeServerFile: tpzPath].
	importlib runPath: testFilePath.

	tpzContents := (GsFile open: tpzPath mode: 'rb' onClient: false)
		contentsAsUtf8 decodeToUnicode.

	"Slice out the ``sum'' method source as embedded in the helper
	call: ``Point ___compileMethod: 'sum<lf>...''.  Verify the body
	immediately after the selector and tab/newline is a direct ``^''
	return (the optimised shape), not a ``^ [...] value'' wrap."
	sumStart := tpzContents indexOfSubCollection: 'Point ___compileMethod: ''sum'.
	self assert: sumStart > 0.
	"Body shape after the optimisation: ``sum<lf>\t^ ...'' — assert the
	tab+caret pattern, and assert the old ``^ [|...| ... ] value'' wrap
	is NOT present anywhere in this method's source."
	self assert: (tpzContents
		copyFrom: sumStart
		to: sumStart + 31) equals: 'Point ___compileMethod: ''sum
	^ '.

	"The Counter class's ``get'' method has the same shape — single
	return, no locals — and must also skip the wrapper."
	self assert: (tpzContents includesString: 'Counter ___compileMethod: ''get
	^ ')
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testRunPathWritesDebugFiles
	"runPath: captures every compiled method source in
	$TMP/codegen/<module>.tpz (Topaz-style framing) and the last IR
	tree in $TMP/codegen/<module>.ir for post-mortem inspection.
	Drive runPath: on hello.py and verify both files were written
	with content that reflects the Python source."

	| testFilePath tpzPath irPath tpzFile tpzContents irFile irContents |
	testFilePath := importlib grailDir , '/src/python/hello.py'.
	tpzPath := (self tmp: 'codegen/__main__.tpz').
	irPath := (self tmp: 'codegen/__main__.ir').

	"Clear any leftover files so we know runPath: actually wrote them."
	(GsFile existsOnServer: tpzPath) ifTrue: [GsFile removeServerFile: tpzPath].
	(GsFile existsOnServer: irPath) ifTrue: [GsFile removeServerFile: irPath].

	importlib runPath: testFilePath.

	self assert: (GsFile existsOnServer: tpzPath).
	self assert: (GsFile existsOnServer: irPath).

	tpzFile := GsFile open: tpzPath mode: 'rb' onClient: false.
	tpzContents := tpzFile contentsAsUtf8 decodeToUnicode.
	tpzFile close.
	"Topaz framing markers are present, along with the Python source
	identifiers."
	self assert: (tpzContents includesString: 'method: __main__').
	self assert: (tpzContents includesString: 'category: ''Grail-Methods''').
	self assert: (tpzContents includesString: 'say_hello').
	self assert: (tpzContents includesString: 'Allen').

	"The IR captured here is for the module body's `initialize` method.
	Top-level `def`s compile as separate env-1 methods, so the body
	references them by selector but does not embed their literals — we
	look for the literal `'Allen'` and the `say_hello` selector, not
	the `'Hello '` string that lives inside say_hello's body."
	irFile := GsFile open: irPath mode: 'rb' onClient: false.
	irContents := irFile contentsAsUtf8 decodeToUnicode.
	irFile close.
	self assert: irContents notEmpty.
	self assert: (irContents includesString: 'Allen').
	self assert: (irContents includesString: 'say_hello')
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testLoadModuleWritesPerModuleDebugFiles
	"loadModuleFromPath: writes $TMP/codegen/<module>.tpz and .ir for
	EVERY Python module it compiles, not just __main__.  Drive a
	fresh import of itertools (a stdlib module that compiles from
	src/python/stdlib/itertools.py) and verify its per-module debug
	files appear with the expected Topaz framing."

	| tpzPath irPath tpzContents |
	tpzPath := (self tmp: 'codegen/itertools.tpz').
	irPath := (self tmp: 'codegen/itertools.ir').
	(GsFile existsOnServer: tpzPath) ifTrue: [GsFile removeServerFile: tpzPath].
	(GsFile existsOnServer: irPath) ifTrue: [GsFile removeServerFile: irPath].

	"Force a re-load — drop the cached singleton so loadModuleFromPath:
	(and therefore the debug capture) runs again."
	importlib @env1:modules removeKey: #'itertools' ifAbsent: [].
	importlib @env1:instance @env1:import_module: 'itertools'.

	self assert: (GsFile existsOnServer: tpzPath).
	self assert: (GsFile existsOnServer: irPath).

	tpzContents := (GsFile open: tpzPath mode: 'rb' onClient: false)
		contentsAsUtf8 decodeToUnicode.
	self assert: (tpzContents includesString: 'module subclass: ''Itertools''').
	self assert: (tpzContents includesString: 'method: Itertools').
	self assert: (tpzContents includesString: 'chain').
	self assert: (tpzContents includesString: 'repeat')
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testSmalltalkForSource
	"Test generating Smalltalk code from Python source"

	| smalltalkCode |
	smalltalkCode := importlib smalltalkForSource: '1 + 2'.

	"The generated code should be a non-empty string"
	self assert: smalltalkCode isString.
	self assert: smalltalkCode notEmpty.

	"The generated code should contain addition.  ``+'' now routes through the
	per-op NotImplemented-protocol helper (object>>___binOpAdd___:, a direct
	__add__: send + reflected-op/TypeError fallback) rather than a bare
	``__add__:'' send."
	self assert: (smalltalkCode includesString: ' ___binOpAdd___: ')
%

! ===============================================================================
! Tests - ___asSmalltalkClassName___:
! ===============================================================================
! The encoder transforms a Python module or class name into a legal
! GemStone class-name Symbol used as the key into PythonModules.

category: 'Grail-Tests - Class Name Encoding'
method: ImportlibTestCase
testEncodeAlreadyValidUserClass
	"A Python user class name that's already a valid Smalltalk class
	name passes through unchanged."

	self assert: (importlib ___asSmalltalkClassName___: 'MyClass')
		equals: #'MyClass'
%

category: 'Grail-Tests - Class Name Encoding'
method: ImportlibTestCase
testEncodeClassNameKeepsCase
	"A lowercase Python CLASS name is kept exactly (GemStone accepts a
	lowercase class name); the GemStone class name IS the Python name, so
	cls.__name__ round-trips.  No capitalization -- that used to make
	__name__ wrong and need a mangled->original registry."

	self assert: (importlib ___asSmalltalkClassName___: 'hello')
		equals: #'hello'
%

category: 'Grail-Tests - Class Name Encoding'
method: ImportlibTestCase
testEncodeDottedClassName
	"Dots are illegal in a GemStone class name, so a dotted Python name
	replaces each `.` with `_` -- the one transform GemStone forces on a
	class name.  Case is preserved (no capitalization)."

	self assert: (importlib ___asSmalltalkClassName___: 're._parser')
		equals: #'re__parser'
%

category: 'Grail-Tests - Class Name Encoding'
method: ImportlibTestCase
testEncodeModuleNameKeepsCase
	"MODULE names now use the SAME encoder as class names
	(___asSmalltalkModuleName___: delegates to ___asSmalltalkClassName___:): the
	only transform is `.` -> `_`, and case is PRESERVED so the backing-class name
	matches the Python module name.  Capitalization is gone -- Globals is no
	longer in the compile symbol list, so there is nothing to dodge."

	self assert: (importlib ___asSmalltalkModuleName___: 'hello') equals: #'hello'.
	self assert: (importlib ___asSmalltalkModuleName___: 're._parser') equals: #'re__parser'.
	self assert: (importlib ___asSmalltalkModuleName___: 'MyMod') equals: #'MyMod'
%

category: 'Grail-Tests - Class Name Encoding'
method: ImportlibTestCase
testEncodeLeadingUnderscore
	"GemStone accepts an underscore as the first character of a class
	name, so a Python name like ``_constants`` needs no transform."

	self assert: (importlib ___asSmalltalkClassName___: '_constants')
		equals: #'_constants'
%

category: 'Grail-Tests - Class Name Encoding'
method: ImportlibTestCase
testEncodeReturnsSymbol
	"Result is a Symbol regardless of input type — class-creation APIs
	require a Symbol class name."

	self assert: (importlib ___asSmalltalkClassName___: 'hello') isSymbol.
	self assert: (importlib ___asSmalltalkClassName___: 'MyClass') isSymbol
%

! ===============================================================================
! Tests - Generated classes live in PythonModules (not UserGlobals)
! ===============================================================================

category: 'Grail-Tests - Generated Class Location'
method: ImportlibTestCase
testGeneratedModuleClassInPythonModules
	"loadModuleFromPath: registers the generated module class in the
	PythonModules SymbolDictionary, keyed by the encoded MODULE class name —
	not in UserGlobals.  A module name is encoded by ___asSmalltalkModuleName___:
	(dots -> underscores, case preserved): 'python.hello' -> 'python_hello'."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'python.hello' ifAbsent: [].
	importlib loadModuleFromPath: (importlib grailDir , '/src/python/hello.py')
		name: 'python.hello'.

	self assert: (PythonModules at: #'python_hello' ifAbsent: [nil]) notNil.
	self assert: (UserGlobals at: #'python_hello' ifAbsent: [nil]) isNil
%

! ===============================================================================
! Tests - executeWithScope:as: codegen capture is opt-in
! ===============================================================================

category: 'Grail-Tests - Codegen Capture'
method: ImportlibTestCase
___captureCountIn: dir
	"Number of directory entries in dir (0 if dir is absent or
	unreadable).  Used to measure whether executeWithScope:as:
	produced any capture files."

	| contents |
	(GsFile existsOnServer: dir) ifFalse: [^ 0].
	contents := GsFile contentsOfDirectory: dir onClient: false.
	(contents isKindOf: Array) ifFalse: [^ 0].
	^ contents size
%

category: 'Grail-Tests - Codegen Capture'
method: ImportlibTestCase
___emptyDir: dir
	"Remove every file in dir.  ``contentsOfDirectory:onClient:''
	returns full paths, so each entry can be handed straight to
	``removeServerFile:''.  Needed before a capture-count delta is
	meaningful: the per-session sequence counters reset on install, so
	capture filenames (___doit_1___.tpz, ...) are reused and would be
	overwritten — not added — across repeated runs."

	| contents |
	(GsFile existsOnServer: dir) ifFalse: [^ self].
	contents := GsFile contentsOfDirectory: dir onClient: false.
	(contents isKindOf: Array) ifFalse: [^ self].
	contents do: [:each | GsFile removeServerFile: each]
%

category: 'Grail-Tests - Codegen Capture'
method: ImportlibTestCase
testExecuteWithScopeCaptureIsOptIn
	"ModuleAst >> executeWithScope:as: used to write a
	___<kind>_<N>___.tpz/.ir pair to a hardcoded $TMP/codegen on EVERY
	exec/eval/doit, ignoring GRAIL_CODEGEN_TRACE_DIR — which flooded
	$TMP/codegen during run_tests.sh.  Capture must now be gated by the
	same env var as importlib's module-load capture and must honor the
	configured directory rather than a hardcoded path."

	| dir before after |
	dir := (self tmp: 'optin_test').

	"--- Tracing ON: a doit writes capture files into the CONFIGURED
	dir (proving the path is not hardcoded to $TMP/codegen).  Empty the
	dir first: sequence counters reset on install, so capture filenames
	are reused and a leftover ___doit_1___ would be overwritten rather
	than added, hiding the write. ---"
	System gemEnvironmentVariable: 'GRAIL_CODEGEN_TRACE_DIR' put: dir.
	importlib ___codegenTraceDirInvalidate___.
	self assert: importlib ___codegenTraceDir___ equals: dir.
	self ___emptyDir: dir.
	before := self ___captureCountIn: dir.
	ModuleAst
		evaluateSource: 'x = 21 + 21'
		usingModuleScope: SymbolDictionary new
		as: #doit.
	after := self ___captureCountIn: dir.
	self assert: after > before.

	"--- Tracing OFF: a doit writes NOTHING.  Only this synchronous
	doit runs between the two counts, so the $TMP/codegen delta is 0
	with the fix and would be +2 (.tpz + .ir) with the old bug. ---"
	System gemEnvironmentVariable: 'GRAIL_CODEGEN_TRACE_DIR' put: ''.
	importlib ___codegenTraceDirInvalidate___.
	self assert: importlib ___codegenTraceDir___ isNil.
	before := self ___captureCountIn: (self tmp: 'codegen').
	ModuleAst
		evaluateSource: 'y = 1 + 2'
		usingModuleScope: SymbolDictionary new
		as: #doit.
	after := self ___captureCountIn: (self tmp: 'codegen').
	self assert: after equals: before.
	"GRAIL_CODEGEN_TRACE_DIR is restored to its incoming value in tearDown."
%

category: 'Grail-Tests - Session-Local State'
method: ImportlibTestCase
testCompilationCountersLiveInSessionTempsNotCommitted
	"Regression: ModuleAst counters must live in SessionTemps, not classInstVars.
	A committed counter causes write-write conflicts when two sessions compile
	Python code concurrently.  After nextSeqFor:, the count must appear in
	SessionTemps and not be accessible as a classInstVar on ModuleAst."

	| before after |
	"Reset the session counter so we get a predictable value."
	SessionTemps current
		removeKey: #'___grailDoitCounter___' ifAbsent: [].
	before := SessionTemps current
		at: #'___grailDoitCounter___' ifAbsent: [0].
	ModuleAst
		evaluateSource: 'x = 1'
		usingModuleScope: SymbolDictionary new
		as: #doit.
	after := SessionTemps current
		at: #'___grailDoitCounter___' ifAbsent: [0].
	self assert: after > before.
%

category: 'Grail-Tests - Session-Local State'
method: ImportlibTestCase
testCodegenTraceDirLivesInSessionTempsNotCommitted
	"Regression: codegenTraceDir/codegenTraceDirChecked must live in SessionTemps
	so each gem process reads its own GRAIL_CODEGEN_TRACE_DIR env var rather than
	seeing another session's cached committed value."

	importlib ___codegenTraceDirInvalidate___.
	"Checked flag must not appear before the first call."
	self assert:
		(SessionTemps current
			includesKey: #'___grailCodegenTraceDirChecked___') not.
	importlib ___codegenTraceDir___.
	"After one call the checked flag lives in SessionTemps, nowhere else."
	self assert:
		(SessionTemps current
			includesKey: #'___grailCodegenTraceDirChecked___').
	"Invalidate clears the SessionTemps entry so the next call re-reads the env var."
	importlib ___codegenTraceDirInvalidate___.
	self assert:
		(SessionTemps current
			includesKey: #'___grailCodegenTraceDirChecked___') not.
	"GRAIL_CODEGEN_TRACE_DIR is restored to its incoming value in tearDown."
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testSoSearchAnswersNilWhenAPlainFileShadowsAPackageDir
	"For a DOTTED name, ___moduleNameToSoPath___: probes
	<root>/<pkg>/<leaf>.so.  When <pkg> names a plain FILE that stat fails
	with ENOTDIR, and GsFile>>existsOnServer: answers NIL (not false) for a
	probe that errors -- so the bare ifTrue: it fed raised ImproperOperation
	(error 2085, ''Expected nil to be a Boolean''): an UNCATCHABLE Smalltalk
	error out of an ordinary ``import <pkg>.<anything>'', raised before the
	.py resolver (guarded this way for longer) could find the module.

	The collision is live in this checkout rather than hypothetical: the repo
	root is search root #1 and ./grail there is the CLI shell SCRIPT, which
	is why the name ``grail'' -- and no other -- was reported as poisoning
	the session.  Assert that precondition first, so this test cannot pass by
	quietly exercising nothing."

	| shadow |
	shadow := importlib grailDir , '/grail'.
	self assert: (GsFile existsOnServer: shadow) == true.
	self deny: (GsFile isServerDirectory: shadow) == true.
	self assert: (importlib @env1:___moduleNameToSoPath___: 'grail.gemstone') isNil.
	self assert: (importlib @env1:___moduleNameToSoPath___: 'grail.no_such_submodule') isNil
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testDottedImportUnderAFileShadowedRootReportsNotFound
	"End-to-end companion to
	testSoSearchAnswersNilWhenAPlainFileShadowsAPackageDir, on a fixture of
	our own rather than the repo''s ./grail: search root A holds a plain FILE
	named like the package, root B holds the real package.

	The MISSING submodule is the half that discriminates, and the reason the
	reported failure looked so strange.  The .so probe runs only AFTER the
	.py resolver comes up empty, so a submodule that exists never reached the
	crash -- only a name with no source anywhere did, and then, instead of
	ModuleNotFoundError, the shadowed root turned ENOTDIR into an
	uncatchable ImproperOperation (error 2085).  That is exactly what
	``import grail.asgi'' was: src/python is not a search root, so the module
	was never resolvable, and the diagnosis it deserved was ''no module named
	grail.asgi''.

	Roots and sys.modules entries are restored in the ensure:, so the rest of
	the shard sees neither the fixture nor its modules."

	| savedRoots rootA rootB pkgDir f r |
	savedRoots := SessionTemps current at: #Grail_importlib_extraRoots otherwise: nil.
	rootA := self tmp: 'shadowroot_a'.
	rootB := self tmp: 'shadowroot_b'.
	pkgDir := rootB , '/zzshadowpkg'.
	(GsFile existsOnServer: rootA) == true ifFalse: [GsFile createServerDirectory: rootA].
	(GsFile existsOnServer: rootB) == true ifFalse: [GsFile createServerDirectory: rootB].
	(GsFile existsOnServer: pkgDir) == true ifFalse: [GsFile createServerDirectory: pkgDir].
	"The shadow: a plain file, in the EARLIER root, named exactly like the package."
	f := GsFile open: rootA , '/zzshadowpkg' mode: 'wb' onClient: false.
	f nextPutAll: 'not a directory'; close.
	f := GsFile open: pkgDir , '/__init__.py' mode: 'wb' onClient: false.
	f nextPutAll: ''; close.
	f := GsFile open: pkgDir , '/mod.py' mode: 'wb' onClient: false.
	f nextPutAll: 'VALUE = 42'; close.
	[
		SessionTemps current at: #Grail_importlib_extraRoots put: { rootA . rootB }.
		"No source anywhere: must be a Python ModuleNotFoundError, not error 2085."
		self
			should: [self eval: 'import zzshadowpkg.nosuchmodule']
			raise: ModuleNotFoundError.
		"And the shadow must not hide the package that IS there."
		r := self eval: 'import zzshadowpkg.mod
zzshadowpkg.mod.VALUE'
	] ensure: [
		savedRoots isNil
			ifTrue: [SessionTemps current removeKey: #Grail_importlib_extraRoots ifAbsent: []]
			ifFalse: [SessionTemps current at: #Grail_importlib_extraRoots put: savedRoots].
		importlib @env1:modules removeKey: #'zzshadowpkg.mod' ifAbsent: [].
		importlib @env1:modules removeKey: #'zzshadowpkg' ifAbsent: []].
	self assert: r equals: 42
%

! ===============================================================================
! A C extension that will not load is an ImportError, not a dead session
! ===============================================================================

category: 'Grail-Tests - C Extension Loading'
method: ImportlibTestCase
___brokenExtensionRoot
	"Build a fixture package whose C speedup .so cannot possibly load, shaped
	exactly like markupsafe's: a guarded ``from ._speedups import ...'' with a
	pure-Python fallback behind it.  Answer the search root holding it.

	The .so is a TEXT FILE, deliberately.  It needs no compiler, it is the same
	fixture on Darwin and on Linux, and both platforms' dlopen refuse it (``slice
	is not valid mach-o file'' / ``invalid ELF header'') -- so the test asserts
	the SHAPE of the failure, never the platform's wording.  A .so built for the
	wrong architecture, or one missing a CPython symbol, reaches the same shim
	message and the same code here; see docs/Issues.md for all four measured
	modes."

	| root pkg f |
	root := self tmp: 'brokencext_root'.
	pkg := root , '/zzbrokencext'.
	(GsFile existsOnServer: root) == true ifFalse: [GsFile createServerDirectory: root].
	(GsFile existsOnServer: pkg) == true ifFalse: [GsFile createServerDirectory: pkg].
	f := GsFile open: pkg , '/__init__.py' mode: 'wb' onClient: false.
	f nextPutAll: 'try:
    from ._speedups import escape_inner
    FLAVOUR = "c"
    LOAD_ERROR = ""
    LOAD_NAME = ""
    LOAD_TYPE = ""
except ImportError as exc:
    from ._native import escape_inner
    FLAVOUR = "python"
    LOAD_ERROR = str(exc)
    LOAD_NAME = exc.name
    LOAD_TYPE = type(exc).__name__
'; close.
	f := GsFile open: pkg , '/_native.py' mode: 'wb' onClient: false.
	f nextPutAll: 'def escape_inner(s):
    return s.replace("&", "&amp;")
'; close.
	f := GsFile open: pkg , '/_speedups.so' mode: 'wb' onClient: false.
	f nextPutAll: 'this is not a shared object of any kind'; close.
	^ root
%

category: 'Grail-Tests - C Extension Loading'
method: ImportlibTestCase
testUnloadableExtensionFallsBackToPurePython
	"THE acceptance test for docs/Issues.md ``A failed dlopen killed the
	session''.  A package that guards its C speedups with ``except ImportError''
	and ships a pure-Python fallback -- markupsafe and jinja2 both do -- must
	take the fallback when the .so will not load, and the session must live.

	Before the fix this did not fail: it ENDED THE PROCESS.  The shim raised a
	GrailShimError, a Smalltalk Error that is a sibling of Grail's Python
	BaseException rather than a subclass, so the ``except ImportError'' never
	saw it and neither would ``except BaseException''.  Measured with a real
	venv on sys.path: ``import markupsafe._speedups'' printed START and nothing
	else, exit status 1.

	Roots and sys.modules entries are restored in the ensure:, so nothing of the
	fixture outlives the test."

	| savedRoots root flavour escaped name kind text |
	root := self ___brokenExtensionRoot.
	savedRoots := SessionTemps current at: #Grail_importlib_extraRoots otherwise: nil.
	[
		SessionTemps current at: #Grail_importlib_extraRoots put: { root }.
		flavour := self eval: 'import zzbrokencext
zzbrokencext.FLAVOUR'.
		"Not just ``the import returned'': the fallback must actually WORK."
		escaped := self eval: 'import zzbrokencext
zzbrokencext.escape_inner("a&b")'.
		"And the exception the guard caught must be CPython-shaped."
		name := self eval: 'import zzbrokencext
zzbrokencext.LOAD_NAME'.
		kind := self eval: 'import zzbrokencext
zzbrokencext.LOAD_TYPE'.
		text := self eval: 'import zzbrokencext
zzbrokencext.LOAD_ERROR'
	] ensure: [
		savedRoots isNil
			ifTrue: [SessionTemps current removeKey: #Grail_importlib_extraRoots ifAbsent: []]
			ifFalse: [SessionTemps current at: #Grail_importlib_extraRoots put: savedRoots].
		importlib @env1:modules removeKey: #'zzbrokencext._speedups' ifAbsent: [].
		importlib @env1:modules removeKey: #'zzbrokencext._native' ifAbsent: [].
		importlib @env1:modules removeKey: #'zzbrokencext' ifAbsent: [].
		PythonModules removeKey: #'zzbrokencext._native' ifAbsent: [].
		PythonModules removeKey: #'zzbrokencext' ifAbsent: []].
	self assert: flavour equals: 'python'.
	self assert: escaped equals: 'a&amp;b'.
	self assert: name equals: 'zzbrokencext._speedups'.
	"THE DISCRIMINATOR.  A fixture whose .so the search never FOUND would raise
	ModuleNotFoundError, the same guard would swallow it, and every assertion
	above would still hold -- a green test measuring nothing.  Only a real
	dlopen failure gives a plain ImportError whose text names the file."
	self assert: kind equals: 'ImportError'.
	self assert: (text includesString: '_speedups.so')
%

category: 'Grail-Tests - C Extension Loading'
method: ImportlibTestCase
testUnloadableExtensionImportErrorCarriesNameAndPath
	"The loader boundary itself, without the import statement around it:
	loadDynamicModuleNamed:fromPath: on a file that cannot be dlopen'd raises a
	Python ImportError carrying CPython's ``name'' and ``path''.

	``name'' and ``path'' are what makes the exception useful to the code that
	catches it -- CPython's ImportError has both, and stdlib and third-party
	guards read them."

	| root soPath caught |
	root := self ___brokenExtensionRoot.
	soPath := root , '/zzbrokencext/_speedups.so'.
	caught := [importlib loadDynamicModuleNamed: 'zzbrokencext._speedups'
			fromPath: soPath.
		nil]
		on: ImportError
		do: [:ex | ex].
	self deny: caught isNil.
	self assert: (caught isKindOf: ImportError).
	self assert: (caught @env0:dynamicInstVarAt: #'name')
		equals: 'zzbrokencext._speedups'.
	self assert: (caught @env0:dynamicInstVarAt: #'path') equals: soPath.
	"The dlerror text is passed through verbatim, which is what CPython says.
	Its wording is the platform's, so assert only that the failing file is named
	in it."
	self assert: (caught messageText
		includesString: '_speedups.so')
%

category: 'Grail-Tests - C Extension Loading'
method: ImportlibTestCase
testExtensionLoadFailureMessagesAreCPythonShaped
	"The four shim texts, translated.  A unit test of the translation alone:
	it needs no .so and no shim, so it runs identically everywhere and pins the
	wording that the end-to-end tests can only sample.

	The raw texts are src/c/shim/cpython.cc's, measured -- see docs/Issues.md."

	| texts |
	texts := {
		'dlopen failed: dlopen(/p/_x.so, 0x000A): symbol not found in flat namespace ''_PyUnicode_New'''.
			'dlopen(/p/_x.so, 0x000A): symbol not found in flat namespace ''_PyUnicode_New'''.
		'Symbol not found: PyInit__x in /p/_x.so'.
			'dynamic module does not define module export function (PyInit__x)'.
		'Module init failed: _x'.
			'initialization of _x failed without raising an exception'.
		'Module exec failed: _x'.
			'execution of extension module _x failed'.
		"Not one of the four: passed through rather than guessed at."
		'Too many loaded modules (increase MAX_MODULES)'.
			'Too many loaded modules (increase MAX_MODULES)' }.
	1 to: texts size by: 2 do: [:i | | caught |
		caught := [ImportError ___signalExtensionLoadFailed___: (texts at: i)
				name: 'pkg._x' path: '/p/_x.so'. nil]
			on: ImportError
			do: [:ex | ex].
		self deny: caught isNil.
		self assert: caught messageText equals: (texts at: i + 1)]
%

category: 'Grail-Tests - C Extension Loading'
method: ImportlibTestCase
testImportErrorAlwaysCarriesMsg
	"CPython's ImportError.msg: the single positional argument when there is
	exactly one, None otherwise, and ALWAYS readable.

	Not academic.  numpy's _core/__init__.py opens its ImportError handler with
	``if exc.msg == ...'', so with msg missing the very first thing numpy did
	after a failed extension load was raise AttributeError -- a second failure
	that only became visible once the first stopped killing the session."

	self assert: (self eval: 'ImportError("boom").msg') equals: 'boom'.
	self assert: (self eval: 'ImportError().msg is None').
	self assert: (self eval: 'ImportError("a", "b").msg is None').
	self assert: (self eval: 'ModuleNotFoundError("gone").msg') equals: 'gone'
%
