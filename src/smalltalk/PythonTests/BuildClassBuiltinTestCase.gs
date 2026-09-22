! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BuildClassBuiltinTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuildClassBuiltinTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BuildClassBuiltinTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BuildClassBuiltinTestCase
!
! ``__build_class__'' is what a class STATEMENT compiles to, and a
! ``__builtins__'' override owns it: ``exec(src, {'__builtins__': {}})'' must
! refuse a class definition with ``NameError: __build_class__ not found'', which
! is most of the point of passing an empty one.
!
! Grail does not route class creation through a builtin -- ClassDefAst emits
! importlib sends directly -- so there was nothing for the override to withhold,
! and a sandboxed exec defined classes freely.
!
! ASSERTING THE REQUIREMENT NEEDS THE NAME TO EXIST, and that is where the real
! defect was.  ``__build_class__'' was listed in ___builtinNamespaceNames___ --
! Grail's spec of dir(builtins) -- and implemented by no method, and dir() /
! __dict__ enumerate METHODS.  So every COPY of builtins came out without it,
! and an override is very often a copy: a bare ``exec(src)'' inside a function
! gets one.  A gate written before the name existed therefore refused class
! definitions CPython allows, and cost test_scope two tests when it was first
! written that way.
!
! THE ENUMERATION BUG UNDER THAT IS THE ONE WORTH KEEPING.  A selector counted
! as Grail machinery if it began with three underscores.  Grail's internal names
! are ``___name___'' -- three leading AND three trailing -- and a varargs Python
! builtin compiles to ``_<name>:kw:'', so a Python DUNDER builtin becomes
! ``___import__:kw:'' / ``___build_class__:kw:'': three leading and only TWO
! trailing.  The rule could not tell those apart from machinery, so both were
! missing from builtins.__dict__ while dir(builtins) listed them -- dir() for
! that module answers the curated spec list instead, so the two sides came from
! different places and disagreed silently.  Requiring the trailing ``___''
! separates them cleanly, and the same predicate now serves __dir__ and
! ___globalNames___ so they cannot drift apart again.
!
! ``set(vars(builtins)) == set(dir(builtins))'' is the row that states the
! invariant rather than an instance of it.
!
! __build_class__ is also a real builtin now, doing CPython's own sequence --
! make a namespace, run the body function against it, call the metaclass.
! Grail's class statement still does not use it; Python code that calls it
! directly now gets a class rather than a NameError.
!
! Drives tests/python/build_class_builtin.py, whose EXPECTED table was measured
! by RUNNING CPython 3.14.6.
!
! test_builtin's test_exec_globals_frozen.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BuildClassBuiltinTestCase removeAllMethods.
BuildClassBuiltinTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BuildClassBuiltinTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'build_class_builtin' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/build_class_builtin.py')
		name: 'build_class_builtin'.
%

category: 'Grail-Private'
method: BuildClassBuiltinTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - the name exists'
method: BuildClassBuiltinTestCase
testBothEnumerationsReportTheDunderBuiltins
	"They came from different places and disagreed: dir(builtins) answers the
	curated spec list, __dict__ walks the selectors, and the selector walk
	could not tell ``___build_class__:kw:'' from machinery."

	self assertMatchesCPythonAt: 'in_dict'.
	self assertMatchesCPythonAt: 'in_dir'.
	self assertMatchesCPythonAt: 'import_in_dict'.
	self assertMatchesCPythonAt: 'import_in_dir'.
%

category: 'Grail-Tests - the name exists'
method: BuildClassBuiltinTestCase
testDirAndVarsAgreeForBuiltins
	"The INVARIANT rather than an instance of it -- and the reason a copy of
	builtins is now a usable __builtins__."

	self assertMatchesCPythonAt: 'dir_and_vars_agree'.
	self assertMatchesCPythonAt: 'copy_carries_it'.
%

category: 'Grail-Tests - the class gate'
method: BuildClassBuiltinTestCase
testAClassStatementRequiresBuildClass
	"Two empty mappings refuse, and a COPY OF REAL BUILTINS does not -- the
	third row is the one a gate written before the name existed got wrong,
	and it is the shape a bare exec() inside a function actually produces."

	self assertMatchesCPythonAt: 'empty_builtins'.
	self assertMatchesCPythonAt: 'empty_frozendict'.
	self assertMatchesCPythonAt: 'frozen_real_builtins'.
%

category: 'Grail-Tests - Controls'
method: BuildClassBuiltinTestCase
testClassDefinitionIsUntouchedWithoutAnOverride
	"The gate is emitted only inside a doit whose builtins were replaced, so
	every ordinary class definition must be exactly as it was -- in an exec,
	at module scope, and with a built-in base."

	self assertMatchesCPythonAt: 'class_in_plain_exec'.
	self assertMatchesCPythonAt: 'class_at_module_scope'.
	self assertMatchesCPythonAt: 'class_with_a_base'.
	self assertMatchesCPythonAt: 'bare_exec_still_builds_classes'.
%

category: 'Grail-Tests - Controls'
method: BuildClassBuiltinTestCase
testMachineryStaysHidden
	"THE CONTROL FOR THE RULE CHANGE: loosening ``begins with ___'' must not
	start reporting Grail's own internals as Python names.  A ``___name___''
	selector still has three trailing underscores and is still skipped."

	self assertMatchesCPythonAt: 'internal_names_stay_hidden'.
%

category: 'Grail-Tests - Controls'
method: BuildClassBuiltinTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '14 checks, 0 disagreeing [], keys match: True'
%
