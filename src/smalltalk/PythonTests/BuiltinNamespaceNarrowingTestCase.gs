! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BuiltinNamespaceNarrowingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinNamespaceNarrowingTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BuiltinNamespaceNarrowingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BuiltinNamespaceNarrowingTestCase
!
! An unqualified Python name resolves through LEGB and then BUILTINS -- and
! nowhere else.
!
! Grail compiles to Smalltalk, where a bare identifier resolves against the
! user's whole symbol list, and Grail's ``Python'' SymbolDictionary doubles as
! its implementation namespace.  Of its 259 entries only 93 are real builtins;
! the other 166 are module classes (``json'', ``math''), implementation classes
! (``PyDict'', ``PySocket'', ``BoundMethod'') and flattened ``module_attr''
! names (``sys_flags'', ``os_path'').  The symbol list reaches the whole
! GemStone kernel on top of that.
!
! So names CPython would never resolve bound anyway: ``json'' worked with no
! import, ``Array'' reached a kernel class, and -- the sharp one -- ``Decimal''
! silently bound to GemStone's ScaledDecimal, handing code a WRONG OBJECT
! rather than an error.
!
! NameAst >> isResolvableSymbol: now gates a user-written bare name on
! CPython's builtins namespace (builtins class >> ___builtinNamespaceNames___)
! before consulting the symbol list.  This gates only names the USER wrote;
! internal classes that codegen EMITS are written straight into the generated
! source and never pass through it.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BuiltinNamespaceNarrowingTestCase removeAllMethods.
BuiltinNamespaceNarrowingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BuiltinNamespaceNarrowingTestCase
setUp
	"Reload tests/python/builtin_namespace.py fresh each test."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'builtin_namespace' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_namespace.py')
		name: 'builtin_namespace'.
	probe := testModule @env1:probe.
%

category: 'Grail-Private'
method: BuiltinNamespaceNarrowingTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! ------------------- Names CPython does not resolve

category: 'Grail-Tests - narrowing'
method: BuiltinNamespaceNarrowingTestCase
testImplementationClassesDoNotResolve
	"Grail's own classes live in the same dictionary as the builtins, but
	they are not part of Python's namespace."

	self assert: (self at: 'impl_class_missing').
	self assert: (self at: 'impl_boundmethod_missing')
%

category: 'Grail-Tests - narrowing'
method: BuiltinNamespaceNarrowingTestCase
testModuleNamesDoNotResolveWithoutImport
	"``json'' used to work with no import statement at all, because the
	module class was reachable as a bare Smalltalk global."

	self assert: (self at: 'module_class_missing').
	self assert: (self at: 'module_math_missing')
%

category: 'Grail-Tests - narrowing'
method: BuiltinNamespaceNarrowingTestCase
testFlattenedModuleAttributeNamesDoNotResolve
	"Grail stores some module attributes flattened as ``module_attr''
	(``sys_flags'' for sys.flags).  That spelling is an implementation
	detail and must not be nameable from Python."

	self assert: (self at: 'flattened_attr_missing').
	self assert: (self at: 'flattened_ospath_missing')
%

category: 'Grail-Tests - narrowing'
method: BuiltinNamespaceNarrowingTestCase
testGemStoneKernelNamesDoNotResolve
	"The symbol list reaches the whole kernel; Python's namespace does not."

	self assert: (self at: 'kernel_array_missing').
	self assert: (self at: 'kernel_collection_missing')
%

category: 'Grail-Tests - narrowing'
method: BuiltinNamespaceNarrowingTestCase
testNameCollidingWithAKernelClassDoesNotBindTheWrongObject
	"The sharpest case.  ``Decimal'' is not a builtin in CPython -- it is
	decimal.Decimal, and a bare reference is a NameError.  In Grail it
	resolved to GemStone's ScaledDecimal, so code received a plausible but
	WRONG object instead of an error."

	self assert: (self at: 'wrong_object_missing')
%

! ------------------- What narrowing must not break

category: 'Grail-Tests - contract'
method: BuiltinNamespaceNarrowingTestCase
testRealBuiltinsStillResolve
	"Types, exceptions, functions and constants from the real builtins
	namespace are exactly what should still bind bare."

	self assert: (self at: 'builtin_type_works') equals: 7.
	self assert: (self at: 'builtin_exception_works') @env0:asString equals: 'boom'.
	self assert: (self at: 'builtin_func_works') equals: 3.
	self assert: (self at: 'builtin_constant_works')
%

category: 'Grail-Tests - contract'
method: BuiltinNamespaceNarrowingTestCase
testImportsStillResolve
	"The narrowed names are still reachable the way Python reaches them."

	self assert: (self at: 'import_works') @env0:asString equals: '[1]'.
	self assert: (self at: 'from_import_works') equals: 2
%

category: 'Grail-Tests - contract'
method: BuiltinNamespaceNarrowingTestCase
testModuleGlobalsStillResolve

	self assert: (self at: 'module_global_works') @env0:asString
		equals: 'module-global'
%

category: 'Grail-Tests - contract'
method: BuiltinNamespaceNarrowingTestCase
testModuleDundersStillResolve
	"dir(builtins) lists __name__, __doc__, __package__, __loader__ and
	__spec__, but in real code they are the enclosing MODULE's attributes.
	They are excluded from the manifest so they keep taking the
	module-attribute path rather than binding as builtins."

	self assert: (self at: 'module_dunder_works') @env0:asString
		equals: 'builtin_namespace'
%

! ------------------- The manifest itself

category: 'Grail-Tests - manifest'
method: BuiltinNamespaceNarrowingTestCase
testManifestIsCPythonBuiltinsNamespace
	"A spec, not an inventory of what Grail implements: the names Python
	itself lets an unqualified reference resolve to."

	| names |
	names := builtins ___builtinNamespaceNames___.
	self assert: (names includes: #'int').
	self assert: (names includes: #'ValueError').
	self assert: (names includes: #'len').
	self assert: (names includes: #'NotImplemented').
	self assert: (names includes: #'__debug__').
	"Not builtins in any Python."
	self deny: (names includes: #'json').
	self deny: (names includes: #'Decimal').
	self deny: (names includes: #'PyDict').
	self deny: (names includes: #'Array')
%

category: 'Grail-Tests - manifest'
method: BuiltinNamespaceNarrowingTestCase
testManifestExcludesModuleLevelDunders
	"These five are in dir(builtins) but belong to the module at runtime."

	| names |
	names := builtins ___builtinNamespaceNames___.
	#( #'__name__' #'__doc__' #'__package__' #'__loader__' #'__spec__' )
		do: [:sym | self deny: (names includes: sym)]
%

category: 'Grail-Tests - manifest'
method: BuiltinNamespaceNarrowingTestCase
testIsResolvableSymbolGatesOnTheManifest
	"The gate itself: a name must be BOTH in the builtins namespace and
	resolvable on the symbol list.  ``Array'' resolves on the symbol list
	but is not a builtin; ``int'' is both."

	self assert: (NameAst isResolvableSymbol: #'int').
	self deny: (NameAst isResolvableSymbol: #'Array').
	self deny: (NameAst isResolvableSymbol: #'json').
	self deny: (NameAst isResolvableSymbol: #'PyDict')
%
