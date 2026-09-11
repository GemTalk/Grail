! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'UnboundCallArityTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
UnboundCallArityTestCase comment:
'``Base.method(instance, ...)'''' runs BASE''s method, at every arity.

An unbound call NAMES the implementation it wants.  UnboundMethod resolves
one by building the fixed-arity Smalltalk selector for the argument count
and running it non-virtually, and the table that built it stopped at three:
0, 1, 2, 3, and nil for anything else.

nil there means ``no fixed form exists'''', so a call with FOUR OR MORE
arguments skipped to the varargs branch -- and the varargs form is the
keyword-binding entry, whose last act is a VIRTUAL self-send.  A virtual
send goes back down to the subclass:

    Base.m4(sub, 1, 2, 3, 4)   answered ''''S4'''', Sub''s override
    Base.m3(sub, 1, 2, 3)      answered ''''B3'''', correctly

The consequence is worse than a wrong answer, because the ordinary way to
call a parent explicitly is exactly that shape -- ``def m4(self, a, b, c,
d): return Base.m4(self, a, b, c, d)'''' recursed until the stack died at
four arguments while working at three, as an uncatchable
AlmostOutOfStackError.  The guard that skips fixed-arity FORWARDERS, there
precisely because a forwarder re-sends virtually, had been protecting
arities 1..3 and nothing else.

THE SHARPEST FORM OF THE SAME DISPATCH is a metaclass ``def __new__(cls,
name, bases, ns, extra)'' -- four arguments after cls.  Its body sits on
the metaclass''s INSTANCE side and the call has the metaclass itself as
receiver, so the send resolved up the METACLASS chain and found type''s own
__new__ with every argument shifted one left.  type.gs had been reporting
that as ``type.__new__() argument 3 must be dict'''' with a comment saying
fixing the forwarder''s dispatch was its own change; this is that change,
and type.gs now REPAIRS the mis-forward instead of reporting it, telling
the two apart by whether the first argument is a Behavior.

Also here: type.__new__ takes its three arguments POSITIONALLY ONLY, which
Grail accepted by keyword because type had no varargs entry of its own and
the inherited one accepted anything; and types.prepare_class now pops
``metaclass'''' and computes the most derived one instead of answering a
stub.  Both are asserted, the second including the asymmetry
test_subclassinit relies on -- prepare_class does NOT raise for a keyword
the metaclass could not accept, because it never calls it.'
%

doit
UnboundCallArityTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
UnboundCallArityTestCase removeAllMethods: 0.
UnboundCallArityTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: UnboundCallArityTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'unbound_call_arity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unbound_call_arity.py')
		name: 'unbound_call_arity'.
%

category: 'Grail-Helpers'
method: UnboundCallArityTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: UnboundCallArityTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: UnboundCallArityTestCase
testAnUnboundCallRunsTheClassItNames
	"Arities 0 through 4 against a subclass that overrides every one of
	them.  Only arity 4 was wrong, which is why the others are here: they
	are the evidence that the arity, and not the call, is what broke."

	self assertAll: #('unbound_call_runs_the_named_class'
		'the_subclass_form_still_names_the_subclass')
%

category: 'Grail-Tests'
method: UnboundCallArityTestCase
testAnOrdinaryCallIsStillVirtual
	"The counterpart, and the reason the fix is a resolution change rather
	than a blanket non-virtual dispatch: a plain call through the instance
	must still reach the override."

	self assertAll: #('an_ordinary_call_is_still_virtual')
%

category: 'Grail-Tests'
method: UnboundCallArityTestCase
testTheExplicitParentCallTerminates
	"The idiom the defect broke, asserted as the recursion it caused --
	an uncatchable AlmostOutOfStackError at four arguments."

	self assertAll: #('explicit_parent_call_terminates')
%

category: 'Grail-Tests'
method: UnboundCallArityTestCase
testAMetaclassNewWithAnExtraParameter
	"The same dispatch in its sharpest form: four arguments after cls, a
	body on the metaclass's instance side, and a class as receiver.  The
	three-parameter metaclass beside it is what always worked, and must
	keep working."

	self assertAll: #('a_metaclass_new_with_an_extra_parameter'
		'a_plain_metaclass_new_still_works' 'calling_that_new_directly')
%

category: 'Grail-Tests'
method: UnboundCallArityTestCase
testTypeNewIsPositionalOnly
	"CPython refuses the keyword spelling; Grail accepted it and built the
	class, so a metaclass written that way appeared to work while its
	keywords went nowhere.  The positional form must still build."

	self assertAll: #('type_new_by_keyword_is_refused'
		'type_new_positionally_still_builds')
%

category: 'Grail-Tests'
method: UnboundCallArityTestCase
testPrepareClassChoosesTheMetaclass
	"It pops ``metaclass'', defaults to the bases' metaclass, falls back to
	type, and -- the asymmetry test_subclassinit relies on -- does NOT
	raise for a keyword the metaclass could not accept, because it never
	calls it."

	self assertAll: #('prepare_class_pops_the_metaclass'
		'prepare_class_defaults_to_the_bases_metaclass'
		'prepare_class_with_no_bases_is_type')
%
