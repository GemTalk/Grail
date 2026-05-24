! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportlibTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportlibTestCase'
  instVarNames: #()
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
	"Initialize the builtin modules before each test"
	importlib @env1:modules
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

	| imp importModuleBlock |
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
	tpzPath := '/tmp/grail/__main__.tpz'.

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

	Verified on Point's ``__init__(self, x, y)'' — both ``x'' and
	``y'' are instVars (assigned via ``self.x = x'' in the body),
	so both need temps; both pick the ``_<name>'' transport because
	no conflicting param/local/instVar would shadow it."

	| testFilePath tpzPath tpzContents |
	testFilePath := importlib grailDir , '/tests/python/module_with_classes.py'.
	tpzPath := '/tmp/grail/__main__.tpz'.

	importlib @env1:modules removeKey: #'__main__' ifAbsent: [].
	(GsFile existsOnServer: tpzPath) ifTrue: [GsFile removeServerFile: tpzPath].
	importlib runPath: testFilePath.

	tpzContents := (GsFile open: tpzPath mode: 'rb' onClient: false)
		contentsAsUtf8 decodeToUnicode.

	"New shape: ``__init__: _x _: _y'' (underscore-prefixed transport)
	plus block-temp copies that mention the same ``_x'' / ``_y'' names.
	Old shape used ``___1'' / ``___2'' positional placeholders."
	self assert: (tpzContents includesString: '__init__: _x _: _y').
	self assert: (tpzContents includesString: '	x := _x.').
	self assert: (tpzContents includesString: '	y := _y.').
	self deny: (tpzContents includesString: '__init__: ___1 _: ___2')
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
	tpzPath := '/tmp/grail/__main__.tpz'.

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
	/tmp/grail/<module>.tpz (Topaz-style framing) and the last IR
	tree in /tmp/grail/<module>.ir for post-mortem inspection.
	Drive runPath: on hello.py and verify both files were written
	with content that reflects the Python source."

	| testFilePath tpzPath irPath tpzFile tpzContents irFile irContents |
	testFilePath := importlib grailDir , '/src/python/hello.py'.
	tpzPath := '/tmp/grail/__main__.tpz'.
	irPath := '/tmp/grail/__main__.ir'.

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
	"loadModuleFromPath: writes /tmp/grail/<module>.tpz and .ir for
	EVERY Python module it compiles, not just __main__.  Drive a
	fresh import of itertools (a stdlib module that compiles from
	src/python/stdlib/itertools.py) and verify its per-module debug
	files appear with the expected Topaz framing."

	| tpzPath irPath tpzContents |
	tpzPath := '/tmp/grail/itertools.tpz'.
	irPath := '/tmp/grail/itertools.ir'.
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

	"The generated code should contain addition"
	self assert: (smalltalkCode includesString: ' __add__: ')
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
testEncodeLowercaseModuleName
	"A lowercase Python module name gets its first character capitalized
	so it parses as a Smalltalk class name."

	self assert: (importlib ___asSmalltalkClassName___: 'hello')
		equals: #'Hello'
%

category: 'Grail-Tests - Class Name Encoding'
method: ImportlibTestCase
testEncodeDottedModuleName
	"Dots in a Python package path become underscores; the first
	character of the leading segment is capitalized."

	self assert: (importlib ___asSmalltalkClassName___: 're._parser')
		equals: #'Re__parser'
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
	PythonModules SymbolDictionary, keyed by the encoded class name —
	not in UserGlobals."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'python.hello' ifAbsent: [].
	importlib loadModuleFromPath: (importlib grailDir , '/src/python/hello.py')
		name: 'python.hello'.

	self assert: (PythonModules at: #'Python_hello' ifAbsent: [nil]) notNil.
	self assert: (UserGlobals at: #'Python_hello' ifAbsent: [nil]) isNil.
	self assert: (UserGlobals at: #'py_python_hello' ifAbsent: [nil]) isNil
%
