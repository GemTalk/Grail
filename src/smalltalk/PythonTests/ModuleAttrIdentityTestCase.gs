! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleAttrIdentityTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleAttrIdentityTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleAttrIdentityTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleAttrIdentityTestCase
!
! A class named after the MODULE ATTRIBUTE it implements must report CPython's
! identity, not Grail's flattened Smalltalk name.
!
! Grail's Python SymbolDictionary is FLAT, so a class CPython reaches only
! through a module is class-named for the pair: ``functools_partial'' for
! functools.partial, ``sys_flags'' for type(sys.flags), ``string_formatter''
! for string.Formatter.  That is an implementation detail, but it leaked into
! every Python-visible report:
!
!     functools.partial.__name__   ->  'functools_partial'  (CPython: 'partial')
!     string.Formatter.__name__    ->  'string_formatter'   (CPython: 'Formatter')
!     numbers.Number.__module__    ->  absent               (CPython: 'numbers')
!     os.path.__name__             ->  'os_path'            (CPython: 'posixpath')
!
! object class >> ___pythonModuleAttrIdentity___ now maps the Smalltalk class
! name to CPython's { name. module } -- the same shape and the same keying as
! ___pythonBuiltinTypeName___ -- and __name__, __qualname__, __module__ and
! module >> __name__ all read it.
!
! The fixture carries the whole contract as a table it also evaluates, so the
! test compares CPython's answer with Grail's for all 19 class entries at once
! and names the offenders on failure.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleAttrIdentityTestCase removeAllMethods.
ModuleAttrIdentityTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleAttrIdentityTestCase
setUp
	"Reload tests/python/module_attr_identity.py fresh each test."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'module_attr_identity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_attr_identity.py')
		name: 'module_attr_identity'.
	probe := testModule @env1:probe.
%

category: 'Grail-Private'
method: ModuleAttrIdentityTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Tests'
method: ModuleAttrIdentityTestCase
testEveryFlattenedClassReportsCPythonIdentity
	"All 19 class entries at once: __name__ and __module__ must equal what
	CPython 3.14 answers.  On failure the diff names the offenders rather
	than reporting a bare false."

	(self at: 'matches_expected') ifFalse: [
		self assert: (self at: 'report') @env0:asString
			equals: 'see tests/python/module_attr_identity.py EXPECTED'].
	self assert: (self at: 'matches_expected')
%

category: 'Grail-Tests'
method: ModuleAttrIdentityTestCase
testModulesKeepTheirRealDottedName
	"os.path and html.entities are MODULES, not classes.  A module has a
	__name__ but no __module__, and os.path IS the posixpath module in
	CPython -- so neither may report its flattened class name."

	self assert: (self at: 'os_path_name') @env0:asString equals: 'posixpath'.
	self assert: (self at: 'html_entities_name') @env0:asString
		equals: 'html.entities'
%

category: 'Grail-Tests'
method: ModuleAttrIdentityTestCase
testQualnameTracksName
	"Every entry is top-level in its module, so __qualname__ equals
	__name__ -- and must not fall back to the flattened spelling either."

	self assert: (self at: 'partial_qualname') @env0:asString equals: 'partial'.
	self assert: (self at: 'formatter_qualname') @env0:asString equals: 'Formatter'
%

category: 'Grail-Tests'
method: ModuleAttrIdentityTestCase
testInstanceModuleOnlyWhereCPythonHasOne
	"``functools.Placeholder.__module__'' is 'functools': the INSTANCE
	answers it, because CPython's _PlaceholderType is a heap type carrying
	__module__ in its dict.

	This must NOT become a general instance-side fallback to the class.
	CPython raises AttributeError for ``(1).__module__'' and for the sys
	structseq singletons (sys.flags, sys.implementation, ...), which are C
	types -- so those two stay absent here."

	self assert: (self at: 'placeholder_module') @env0:asString
		equals: 'functools'.
	self assert: (self at: 'sys_flags_instance_absent').
	self assert: (self at: 'sys_impl_instance_absent')
%
