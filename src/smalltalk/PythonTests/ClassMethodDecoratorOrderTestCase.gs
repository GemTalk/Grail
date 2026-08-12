! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ClassMethodDecoratorOrderTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassMethodDecoratorOrderTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassMethodDecoratorOrderTestCase - @classmethod composed with a wrapping
! decorator, in both stacking orders.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassMethodDecoratorOrderTestCase removeAllMethods.
ClassMethodDecoratorOrderTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - decorators'
method: ClassMethodDecoratorOrderTestCase
testClassMethodDecoratorOrder
	"``@classmethod @deco def m(cls, x)'' is classmethod(deco(m)): deco wraps
	the RAW function, which still takes ``cls'', and classmethod binds it
	afterwards.  Grail handed deco a BoundMethod on the CLASS -- already
	bound -- so cls was consumed by the binding and the wrapper never saw
	it: CPython passes (cls, 1) where Grail passed (1,).

	The chain base for that shape is now an UnboundMethod rooted at the
	METAclass, which is callable as (cls, ...), and the chain's result is
	re-wrapped in the PyClassMethod descriptor that the class-attribute read
	paths already honour.  Both objects already existed; only the
	composition was wrong.

	Order matters, and getting it wrong is not hypothetical:
	``@singledispatchmethod @classmethod def m'' stacks the other way --
	the classmethod applies FIRST and singledispatchmethod's descriptor is
	what the class must hold -- and re-wrapping that broke four
	TestSingleDispatch tests before the outermost-only gate went in.

	Also pinned: an UNDECORATED classmethod is untouched at every arity and
	access shape, and a decorated @staticmethod keeps its old emit (its
	receiver is ignored, so a bound base is harmless)."

	| mod results |
	importlib @env1:modules removeKey: #'classmethod_decorator_order' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/classmethod_decorator_order.py')
		name: 'classmethod_decorator_order'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('via_class' 'via_instance' 'via_self' 'binds_subclass'
	  'cm_via_class_wrapped' 'with_via_class' 'with_via_self'
	  'plain_cm_via_class' 'plain_cm_via_instance' 'plain_cm_via_self'
	  'static_with_decorator' 'classmethod_inner_keeps_outer') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
