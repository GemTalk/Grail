! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleCachedAbsentTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleCachedAbsentTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleCachedAbsentTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleCachedAbsentTestCase
!
! ``module.__cached__'' is DELIBERATELY ABSENT.  This pins the decision so a
! later change cannot quietly supply one.
!
! WHAT IT MEANS IN CPYTHON: the path of the module's compiled BYTECODE FILE.
! Derived, not primary -- _init_module_attrs assigns ``module.__cached__ =
! spec.cached'', and ModuleSpec>>cached computes that from ``origin'' via
! cache_from_source.
!
! IT IS NOT A MODULE CACHE, and the name invites that misreading.  Grail's cache
! of imported modules is sys.modules and its cache of compiled code is the
! module CLASS in the extent.  Neither is a file; neither is what the attribute
! names.  Reporting either would be a wrong answer wearing a familiar name --
! which is the regression this test exists to catch.
!
! WHY NOT A PATH ANYWAY.  Grail never writes a .pyc.  A faithful implementation
! would still hand out a path, because ModuleSpec>>cached does NOT check the
! file exists -- CPython gives the path a .pyc WOULD have.  So fidelity here
! means naming a file Grail will never write, and code reading __cached__ does
! so to find or invalidate a compiled artifact.  Absence is the truthful answer.
!
! ABSENCE IS A LEGAL CPYTHON STATE.  _init_module_attrs sets the attribute only
! ``if spec.cached is not None'', and a C-implemented module has none at all:
! measured on 3.14.6, ``hasattr(sys, '__cached__')'' is False.  Grail's modules
! take that shape.
!
! NO tests/python FIXTURE, deliberately.  The self-running fixture gate runs a
! fixture as __main__ under CPython, where a .py module DOES have __cached__, so
! every check here would have to be an XFAIL against a CPython that disagrees by
! design.  The behaviour under test is Grail's, and is asserted directly.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleCachedAbsentTestCase removeAllMethods.
ModuleCachedAbsentTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Private'
method: ModuleCachedAbsentTestCase
aLoadedModule
	"Any ordinary .py-backed module.  textwrap is small, has no imports of
	consequence and is already loaded by most runs."

	^ importlib
		loadModuleFromPath: (importlib grailDir , '/src/python/stdlib/textwrap.py')
		name: 'textwrap'
%

category: 'Grail-Tests'
method: ModuleCachedAbsentTestCase
testReadingCachedRaisesAttributeError
	"An AttributeError, not None.  None is a DIFFERENT claim -- ``there is a
	cache slot and it is empty'' rather than ``there is no such attribute'' --
	and hasattr() has to be false to match a C-implemented CPython module.

	The error carries CPython's ``name'', so traceback.py's suggestion machinery
	and ``except AttributeError as e: if e.name == ...'' both work."

	| mod raised |
	mod := self aLoadedModule.
	raised := false.
	[mod @env1:___pyAttrLoad___: #'__cached__']
		@env0:on: (Python at: #'AttributeError')
		do: [:ex | raised := true. ex @env0:return: nil].
	self assert: raised description: 'reading __cached__ must raise AttributeError'.
%

category: 'Grail-Tests'
method: ModuleCachedAbsentTestCase
testCachedIsNotAnEntryInTheNamespace
	"Not in the namespace either, so dir(), vars() and iteration do not list it
	-- matching a C module.  This is the half a later ``helpful'' change would
	break by stamping a fabricated __pycache__ path at import."

	| mod |
	mod := self aLoadedModule.
	self deny: (mod @env0:includesKey: #'__cached__')
		description: '__cached__ must not be an entry in the module namespace'.
	self deny: ((mod @env0:dynamicInstVarAt: #'__cached__') notNil)
		description: '__cached__ must not be stored as a dynamic instVar'.
%
