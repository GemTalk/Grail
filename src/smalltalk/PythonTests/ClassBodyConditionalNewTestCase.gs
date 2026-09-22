! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyConditionalNewTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyConditionalNewTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyConditionalNewTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyConditionalNewTestCase - a conditional def __new__ is a definition
! ===============================================================================
! A ``def __new__'' inside an ``if'' in a class body crashed the gem with an
! UNCATCHABLE ``ExecBlock does not understand #new''.
!
! A def at the top of a class body compiles to a method.  A def inside an
! ``if'' is a conditional binding, so it reaches
! object >> ___classBodyDefinitionalStore___:put: -- which tested only whether
! the name had a getter/setter SHAPE.  Every class answers both __new__ and
! __new__:, so the store read them as an accessor pair and CALLED
! object.__new__ with the function standing in for the class to instantiate.
!
! The gate that knows better already existed: ___mayDispatchToSetter___: excludes
! __new__, because the one-argument __new__ takes a CLASS, not a value.  The
! other two stores (__setattr__, ___pyAttrStore___) consulted it; this one never
! had.  Its own comment named the two it knew about.
!
! Found through CPython's pathlib, whose WindowsPath defines __new__ only off
! Windows -- so pathlib could not even be imported.
!
! tests/python/class_body_conditional_new.py holds the 7 checks below, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.  Four of them are
! CONTROLS for the paths that share the gate, so a fix that broke the accessor
! pair for ordinary data would fail here too.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyConditionalNewTestCase removeAllMethods.
ClassBodyConditionalNewTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - class body'
method: ClassBodyConditionalNewTestCase
testEveryConditionalNewCheckAgreesWithCPython
	"Every check in tests/python/class_body_conditional_new.py, which the
	fixture gate also runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING
	fails too -- a fixture that stopped defining checks would otherwise pass
	this test with an empty loop."

	| fixture results names |

	importlib @env1:modules removeKey: #'class_body_conditional_new' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_conditional_new.py')
		name: 'class_body_conditional_new'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('a_conditional_init_still_works'
	  'a_conditional_new_builds_the_instance'
	  'a_conditional_new_that_refuses_refuses'
	  'a_conditional_rebind_of_a_class_attribute_still_wins'
	  'a_new_in_the_else_branch_is_used'
	  'an_unconditional_new_still_works'
	  'assigning_new_after_the_class_exists_still_works').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 7
%
