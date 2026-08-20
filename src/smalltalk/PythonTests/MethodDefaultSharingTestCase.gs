! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MethodDefaultSharingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MethodDefaultSharingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MethodDefaultSharingTestCase
!
! WHEN, and HOW OFTEN, is a parameter default evaluated?
!
! CPython's rule is one sentence: once, at DEF time, in the enclosing scope, and
! every later call that omits the argument is handed that SAME object.  It is why
! the mutable-default gotcha exists, and why programs rely on it deliberately
! (``def spam(state=[0])'' as a counter).
!
! Grail used to have THREE answers, which is why the area looked healthy: a nested
! def got a def-time wrapper block and was already correct -- so the canonical
! ``lambda x=i: x'' loop-capture idiom worked -- while a module-level def memoised
! on first call, and a CLASS-BODY METHOD re-evaluated the expression on EVERY
! call.  A fresh list per call, nothing shared, and a side-effecting default firing
! once per call instead of once per def.
!
! The class-body case is what this pins.  For a method, the class body IS def time,
! so the default is evaluated there and stashed on the class; ClassDefAst >>
! emitMethodDefaultStoresOn:className: emits that store as the LAST thing in the
! body, while the body's emission context is still installed.  Emitting it outside
! that context is not a tidiness question -- a default naming a class-body local
! then resolves as a MODULE name and raises at import time, which is exactly what
! collections/abc.py's Mapping.pop does (``default=__marker'').
!
! See tests/python/method_default_sharing.py, whose checks are verified against
! real CPython by running the fixture directly (python3 tests/python/...).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MethodDefaultSharingTestCase removeAllMethods.
MethodDefaultSharingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - defaults'
method: MethodDefaultSharingTestCase
testDefTimeDefaults
	"Every check answers true when Grail agrees with CPython."

	| mod |
	importlib @env1:modules removeKey: #'method_default_sharing' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_default_sharing.py')
		name: 'method_default_sharing'.
	#( 'a_method_shares_one_mutable_default'
	   'a_method_default_is_shared_across_instances'
	   'a_method_default_is_evaluated_once'
	   'a_method_default_of_none_still_binds'
	   'an_explicit_argument_still_wins'
	   'a_subclass_reaching_super_keeps_its_own_default'
	   'a_staticmethod_default_still_works'
	   'a_classmethod_default_still_works'
	   'a_nested_def_captures_at_def_time'
	   'a_module_level_class_body_local_can_be_a_default'
	   'a_nested_class_body_local_can_be_a_default' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		"Report what the check ANSWERED: these return evidence rather than false
		 (``second call saw [2]''), which is the difference between a diagnosis and
		 a rerun."
		self assert: (answer = true)
			description: 'default-sharing check failed: ' , k , ' -> ' , answer printString].
%
