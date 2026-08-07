! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DecoratedMethodSelfCallTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DecoratedMethodSelfCallTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DecoratedMethodSelfCallTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DecoratedMethodSelfCallTestCase - `self.m()` must see a decorator's wrapper
! ===============================================================================
! Guards CallAst>>classSelfSendSelector / classSelfSendVarargsSelector: a
! decorated instance method must NOT take the direct-selector fast path,
! because that selector is the raw function while the wrapper lives in the
! class dict.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DecoratedMethodSelfCallTestCase removeAllMethods.
DecoratedMethodSelfCallTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - decorators'
method: DecoratedMethodSelfCallTestCase
testSelfCallSeesDecoratorWrapper
	"``self.m()'' on a DECORATED instance method must answer what the
	decorator produced, like every other call shape.

	A decorated def has two distinct entities: the compiled Smalltalk
	method -- the RAW, undecorated function -- and the class-dict entry,
	which is the decorator's RESULT.  The self-send fast path emitted a
	direct selector send and so reached the raw function, while
	``f := self.m'', ``getattr(self, 'm')()'', ``other.m()'' and a call
	from outside the class all went through ___pyAttrLoad___ and saw the
	wrapper.  Only the self-call was wrong, which is what made it hard to
	spot.

	The visible symptom was ``with self.cm() as v:'' raising
	'PythonGenerator object does not support the context manager
	protocol' for an @contextlib.contextmanager method.

	The fixture also pins that an UNDECORATED method still takes the fast
	path (the suppression must be narrow) and that a user-written
	decorator works, not just contextlib's.

	NOT covered, because it is still broken: the same shape on a
	@classmethod.  A class-side method is not reachable through an
	instance's ___pyAttrLoad___ in Grail, so suppressing its fast path
	turns ``self.cm0()'' into an AttributeError -- the suppression is
	deliberately limited to instance methods.  That is why
	datetimetester's test_system_transitions, whose helper stacks
	@classmethod over @contextlib.contextmanager, still fails."

	| mod results |
	importlib @env1:modules removeKey: #'decorated_method_self_call' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/decorated_method_self_call.py')
		name: 'decorated_method_self_call'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('wrapper_via_self_call' 'wrapper_via_local_then_call'
	  'wrapper_via_getattr' 'wrapper_via_other_receiver'
	  'wrapper_via_outside' 'wrapper_is_not_raw_generator'
	  'with_through_self' 'undecorated_fast_path'
	  'user_decorator_through_self') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
