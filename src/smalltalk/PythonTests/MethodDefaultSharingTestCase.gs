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
! The same three-answer split held for KEYWORD-ONLY defaults, and outlasted the
! positional fix: both METHOD generators emitted a keyword-only default INLINE in
! the method body, so it was re-evaluated per call AND its free names resolved as
! module globals.  A class-body name after a bare ``*'' therefore raised NameError
! -- urllib3's ``def __init__(self, host, *, socket_options=default_socket_options)''
! could not construct at all, while the positional half of the same signature
! worked, which made it look like a keyword-only PARSING bug rather than a scope
! one.  Both generators now share emitDefTimeDefaultFor:node:on: with the
! positional binding, so the two kinds cannot drift apart again.
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
	   'a_nested_class_body_local_can_be_a_default'
	   "KEYWORD-ONLY defaults -- the same rule, the same two generators, and
	    until this list grew, the same defect unfixed.  See the fixture's
	    section comment."
	   'a_class_body_name_resolves_in_a_keyword_only_default'
	   'the_urllib3_connection_shape_constructs'
	   'a_module_level_class_body_local_can_be_a_keyword_only_default'
	   'a_method_shares_one_mutable_keyword_only_default'
	   'a_module_level_def_shares_one_mutable_keyword_only_default'
	   'a_keyword_only_default_is_evaluated_once'
	   'a_keyword_only_default_of_none_still_binds'
	   'an_explicit_keyword_argument_still_wins'
	   'a_missing_required_keyword_only_still_raises'
	   'a_subclass_reaching_super_keeps_its_own_keyword_only_default'
	   'varargs_then_a_keyword_only_default_resolves'
	   'a_keyword_only_default_alongside_kwargs_resolves'
	   'a_keyword_only_default_may_be_a_call'
	   'a_staticmethod_keyword_only_default_still_works'
	   'a_classmethod_keyword_only_default_still_works'
	   "The last two are NEGATIVE CONTROLS: the closure generator, which was
	    already right and must not be routed through the new store, and the
	    method BODY, which must keep skipping the class namespace."
	   'a_nested_def_keyword_only_default_still_works'
	   'the_body_does_not_see_the_class_scope' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		"Report what the check ANSWERED: these return evidence rather than false
		 (``second call saw [2]''), which is the difference between a diagnosis and
		 a rerun."
		self assert: (answer = true)
			description: 'default-sharing check failed: ' , k , ' -> ' , answer printString].
%
