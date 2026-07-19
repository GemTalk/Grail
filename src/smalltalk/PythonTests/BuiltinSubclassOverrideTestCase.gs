! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BuiltinSubclassOverrideTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinSubclassOverrideTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
BuiltinSubclassOverrideTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BuiltinSubclassOverrideTestCase — a Python class that subclasses a built-in
! (dict) and overrides one of its methods with a defaulted/varargs signature.
! The override compiles to the varargs `_name:kw:` selector; the inherited
! built-in keeps fixed-arity `name:`.  BoundMethod >> value:value: must pick
! the MOST-DERIVED definition, so the subclass's varargs override beats the
! inherited built-in's fixed-arity method (the resolution werkzeug's
! MultiDict.get over dict.get depends on).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BuiltinSubclassOverrideTestCase removeAllMethods.
BuiltinSubclassOverrideTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-BuiltinSubclassOverride'
method: BuiltinSubclassOverrideTestCase
loadFixture
	"Load tests/python/builtin_subclass_override.py fresh."

	importlib @env1:modules removeKey: #'builtin_subclass_override' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_subclass_override.py')
		name: 'builtin_subclass_override'
%

category: 'Grail-Tests-BuiltinSubclassOverride'
method: BuiltinSubclassOverrideTestCase
testVarargsOverrideBeatsInheritedBuiltin
	"A varargs override (`get` with defaults) on a dict subclass wins
	over the inherited fixed-arity `dict.get` when invoked indirectly
	through BoundMethod."

	self assert: self loadFixture @env1:varargs_override_beats_inherited_builtin equals: true
%

category: 'Grail-Tests-BuiltinSubclassOverride'
method: BuiltinSubclassOverrideTestCase
testOverrideDefaultArgStillWorks
	"The varargs override's own default-argument branch still works
	(missing key returns the supplied default)."

	self assert: self loadFixture @env1:override_default_arg_still_works equals: true
%
