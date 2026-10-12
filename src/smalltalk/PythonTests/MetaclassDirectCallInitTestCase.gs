! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MetaclassDirectCallInitTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassDirectCallInitTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MetaclassDirectCallInitTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MetaclassDirectCallInitTestCase
!
! Calling a metaclass directly -- ``Meta(name, bases, ns)'', which is how
! six.add_metaclass builds -- runs the metaclass's __init__ over the class it
! built, as CPython's type.__call__ does (#1411).  Grail ran __new__ and skipped
! __init__, so python-dateutil's tz singletons failed on the attribute their
! metaclass __init__ sets.  The fix is object >> ___grailInitBuiltClass___:pos:kw:,
! reached from the generated constructor when construction hands back a class.
!
! Driven by tests/python/metaclass_direct_call_init.py, whose EXPECTED table is
! CPython 3.14's output.  The class-statement row is the control, and the
! non-instance __new__ row pins CPython's rule that __init__ is then skipped.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MetaclassDirectCallInitTestCase removeAllMethods.
MetaclassDirectCallInitTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MetaclassDirectCallInitTestCase
setUp
	(importlib @env1:modules) removeKey: #'metaclass_direct_call_init' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_direct_call_init.py')
		name: 'metaclass_direct_call_init'.
%

category: 'Grail-Setup'
method: MetaclassDirectCallInitTestCase
tearDown
	(importlib @env1:modules) removeKey: #'metaclass_direct_call_init' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Tests'
method: MetaclassDirectCallInitTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 13.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
