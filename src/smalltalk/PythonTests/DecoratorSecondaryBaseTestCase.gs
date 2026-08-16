! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'DecoratorSecondaryBaseTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DecoratorSecondaryBaseTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DecoratorSecondaryBaseTestCase - a method decorator must survive being
! inherited through a SECONDARY base.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DecoratorSecondaryBaseTestCase removeAllMethods.
DecoratorSecondaryBaseTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Multiple Inheritance'
method: DecoratorSecondaryBaseTestCase
testDecoratorSurvivesSecondaryBase
	"``class C(Primary, Mixin)'' puts Mixin second.  Grail gives a Python class
	ONE Smalltalk superclass -- the primary base -- and reproduces the others by
	copying their compiled methods down onto C
	(importlib>>___mergeSecondaryBases___).  A class-body decorator is not part
	of the compiled method: the method stays put and the DECORATED object is
	stored under the bare Python name in the base's class-attribute holder,
	which is what ``C.m'' actually reads.  So the copy has to bring the holder
	entry along (___copyDecoratorRebinding___) or the subclass silently gets the
	RAW, undecorated function.

	It did -- but only for a def compiling to a UNARY selector, which in Grail
	means exactly ``def m(self)''.  Every other signature compiles to a keyword
	selector, and ___copyDecoratorRebinding___ skipped those outright, on the
	reasoning that ``the unary selector in the same method dictionary already
	carries it''.  For a def with a default there IS no unary selector, so the
	rebinding was dropped.

	Found from test_traceback, where TracebackFormatMixin puts ``@cpython_only''
	on ``check_traceback_format(self, cleanup_func=None)''.  Through ``class
	TestTracebackFormat(unittest.TestCase, TracebackFormatMixin)'' the skip
	vanished, the real body ran, and its ``from _testcapi import ...'' raised
	ModuleNotFoundError -- two ERRORs where CPython skips.  The decorator was
	incidental: ANY decorator on ANY secondary-base method taking arguments was
	being discarded.

	The checks sweep SIGNATURE SHAPE, which is the axis the bug lived on, and
	three of them are CONTROLS that passed before the fix too (unary selector,
	mixin-first, own-definition-wins) -- they are what shows the fix is targeted
	rather than a blanket copy.  Measured: 5 of the 8 fail without it.

	All eight answer identically under real CPython, which applies decorators at
	the def statement and has no such distinction.  See
	tests/python/decorator_secondary_base.py."

	| mod |
	importlib @env1:modules removeKey: #'decorator_secondary_base' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/decorator_secondary_base.py')
		name: 'decorator_secondary_base'.
	#( 'a_no_argument_method_keeps_its_decorator'
	   'a_required_argument_keeps_its_decorator'
	   'a_default_argument_keeps_its_decorator'
	   'star_args_keeps_its_decorator'
	   'an_underscored_name_keeps_its_own_decorator'
	   'an_inherited_caller_sees_the_decorated_helper'
	   'a_leading_mixin_still_works'
	   'an_own_definition_still_wins' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'decorator check failed: ' , k , ' -> ' , answer printString]
%
