! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ModuleDefRebindingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleDefRebindingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleDefRebindingTestCase - a top-level def rebinds a name an earlier statement
! stored, and an outer decorator over @classmethod / @staticmethod / @property
! receives the descriptor.  Drives tests/python/module_def_rebinding.py, which is
! self-running: check_python_fixtures.sh measures every check against CPython.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleDefRebindingTestCase removeAllMethods.
ModuleDefRebindingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Private'
method: ModuleDefRebindingTestCase
assertFixtureChecks: keys
	| mod results |
	importlib @env1:modules removeKey: #'module_def_rebinding' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_def_rebinding.py')
		name: 'module_def_rebinding'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	keys do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%

category: 'Grail-Tests - module rebinding'
method: ModuleDefRebindingTestCase
testTopLevelDefRebindsAnEarlierBinding
	"A top-level def compiles to a method on the module class, and a decorator,
	an assignment or a def nested in an if / try stores the module SLOT, which
	out-ranks the method.  The def now clears a slot an earlier statement
	stored (FunctionDefAst >> ___rebindsAnEarlierModuleBinding___), so the name
	means the def from there on -- and a later assignment still wins."

	self assertFixtureChecks: #('decorated_then_def' 'assigned_then_def'
		'nested_if_then_def' 'try_then_def' 'def_then_def_keeps_last'
		'assignment_after_def_wins')
%

category: 'Grail-Tests - module rebinding'
method: ModuleDefRebindingTestCase
testTopLevelDefRebindsAStarImportedName
	"``from X import *'' stores module slots chosen at run time, so a later
	top-level def of any name clears its slot (ImportFromAst >>
	___storesModuleSlot___:).  CPython's signal.py star-imports _signal and
	then defines signal() / getsignal() over it; the raw functions used to win."

	self assertFixtureChecks: #('star_import_then_def' 'star_import_then_decorated_def'
		'star_import_then_def_bare_call' 'star_import_other_names_kept')
%

category: 'Grail-Tests - module rebinding'
method: ModuleDefRebindingTestCase
testOverloadIsCPythons
	"typing.overload is CPython's again: the stubs answer _overload_dummy and
	the implementation displaces it; a lone stub raises when called.  Before
	the rebinding fix the dummy out-ranked the implementation, which is why
	typing.py used to deviate here."

	self assertFixtureChecks: #('overload_then_implementation' 'overload_stub_raises')
%

category: 'Grail-Tests - decorators'
method: ModuleDefRebindingTestCase
testOuterDecoratorSeesTheDescriptor
	"``@deco @classmethod def m'' is deco(classmethod(m)).  The chain used to
	hand deco the compiled method, so ``@override @classmethod'' marked the
	function (test_typing OverrideDecoratorTests).  Binding, calling and reading
	through each descriptor are pinned alongside."

	self assertFixtureChecks: #('outer_sees_classmethod' 'outer_sees_staticmethod'
		'outer_sees_property' 'override_classmethod_marks_the_descriptor'
		'override_staticmethod_marks_the_descriptor' 'override_property_marks_nothing'
		'classmethod_still_binds_cls' 'staticmethod_still_calls' 'property_still_reads')
%

category: 'Grail-Tests - decorators'
method: ModuleDefRebindingTestCase
testPropertyHasNoDict
	"The builtin property refuses a new attribute, as CPython's does; __doc__
	stays writable and a Python subclass keeps its dict."

	self assertFixtureChecks: #('property_refuses_new_attribute' 'property_accepts_doc'
		'property_subclass_has_a_dict')
%
