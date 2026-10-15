! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ClassModuleFollowsNameTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassModuleFollowsNameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassModuleFollowsNameTestCase - a class's __module__ follows a rebound __name__.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassModuleFollowsNameTestCase removeAllMethods.
ClassModuleFollowsNameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Module names'
method: ClassModuleFollowsNameTestCase
testAClassModuleIsTheNameWhenTheClassStatementRuns
	"CPython opens a class body with ``__module__ = __name__'', a run-time
	read.  Grail compiles a module's __module__ in as a literal, so a module
	that rebinds __name__ at top level (_pydecimal: ``__name__ = 'decimal''')
	reads it at run time instead (ClassDefAst >>
	___readsRebindableModuleName___).  _pydecimal's classes answered
	_pydecimal.Decimal, which statistics' doctests print as decimal.Decimal."

	| mod |
	importlib @env1:modules removeKey: #'class_module_follows_name' ifAbsent: [].
	[mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_module_follows_name.py')
		name: 'class_module_follows_name'.
	#( 'a_class_before_keeps_the_original'
	   'a_class_after_takes_the_new_name'
	   'a_class_after_the_restore_has_the_original'
	   'the_repr_names_the_new_module'
	   'pydecimal_classes_are_decimal' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'module-name check failed: ' , k , ' -> ' , answer printString]]
		ensure: [
			importlib @env1:modules removeKey: #'class_module_follows_name' ifAbsent: [].
			self ___forgetCanonicalModule___: 'class_module_follows_name']
%
