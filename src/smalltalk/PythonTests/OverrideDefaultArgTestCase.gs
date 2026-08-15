! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'OverrideDefaultArgTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OverrideDefaultArgTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OverrideDefaultArgTestCase - an override that widens the signature with a
! defaulted parameter still overrides, including for calls made from base code.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OverrideDefaultArgTestCase removeAllMethods.
OverrideDefaultArgTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - dispatch'
method: OverrideDefaultArgTestCase
testOverrideWithADefaultedParameter
	"Python dispatches on the NAME, so widening an override's signature with a
	defaulted parameter is still an override -- for every caller, base-class code
	included.

	Grail broke that for exactly one caller shape.  A simple-positional def
	compiles to a FIXED-ARITY selector (``m:''), while a def carrying a default
	compiles only to the varargs form (``_m:kw:'').  Base-class code calling
	``self.m(x)'' emits a fixed-arity send, which found the BASE's ``m:'' and
	never reached the subclass at all.  Calls from OUTSIDE go through attribute
	lookup, which resolves by name and always worked -- so the failure was
	invisible from the caller's side, silent (no DNU, no error), and showed up
	only as the wrong method quietly running.

	FunctionDefAst>>needsFixedArityForwarders now emits a fixed-arity forwarder
	for each arity a defaulted def accepts, each one delegating to the varargs
	body so the omitted arguments take their defaults.  That is the reverse of a
	direction the codebase already had: needsVarargsForwarder emits a varargs
	COMPANION for simple-positional defs so keyword call sites bind.

	This is the shape stdlib subclassing takes whenever CPython grows a keyword
	-- ``def format_frame_summary(self, frame_summary, colorize=False)''
	overriding a base ``def format_frame_summary(self, frame_summary)'' is real
	code from test_traceback -- so the gap reached well beyond a contrived case.

	The ARITY-0 forwarder is the delicate one, and it constrained the fix.  A
	unary ``m'' alongside ``m:'' is exactly the shape of a synthesized property
	getter/setter pair, so ___pyAttrLoad___ read an ordinary method as a
	property and PERFORMED it: ``obj.m'' answered the method's RESULT and a
	later ``obj.m(x)'' tried to call that result.  Measured, not reasoned -- it
	broke ``import werkzeug.local'' through re/_parser's
	``State.opengroup(self, name=None)'', whose result is a group id.  The
	forwarders therefore compile into their own method category and the pair
	test consults it, which is the only thing that distinguishes them.

	All eight checks are verified against real CPython by running the fixture
	directly.  See tests/python/override_default_arg.py."

	| mod |
	importlib @env1:modules removeKey: #'override_default_arg' ifAbsent: [].
	mod := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/override_default_arg.py')
		name: 'override_default_arg'.
	#( 'a_same_arity_override_wins_from_outside'
	   'a_same_arity_override_wins_from_base_code'
	   'an_extra_default_override_wins_from_outside'
	   'an_extra_default_override_wins_from_base_code'
	   'the_default_is_applied_when_the_base_calls_it'
	   'the_override_still_accepts_the_extra_argument'
	   'a_zero_arg_override_still_wins_from_outside'
	   'a_zero_arg_base_call_reaches_the_override' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'override check failed: ' , k , ' -> ' , answer printString]
%
