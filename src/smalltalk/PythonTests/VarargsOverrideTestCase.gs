! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'VarargsOverrideTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
VarargsOverrideTestCase comment:
'A ``*args'''' override must replace the method it overrides.

Grail compiles ``def m(self, x)'''' to a fixed-arity Smalltalk selector and
``def m(self, *a)'''' to a varargs one, so a call of ``m(1)'''' sends the
fixed-arity selector.  ClassDefAst already emits fixed-arity FORWARDERS so
that an override written with a different signature still wins -- that
machinery exists precisely for this hazard, and its own comment describes
it.  But FunctionDefAst >> fixedArityForwarderArities enumerated NAMED
positional parameters, and a ``*args'''' def has none, so such a def got no
forwarders and could not shadow a base method of ANY arity.

    class Mixin: pass
    class ACM:
        def __exit__(self, exc_type, exc_value, traceback): return ''BASE''
    class Sub(Mixin, ACM):
        def __exit__(self, *d): return ''OWN''
    Sub().__exit__(None, None, None)      answered ''BASE''

NOT A ``with'''' BUG -- a DIRECT call picked the base too, silently, with no
DNU.  It is how contextlib''s ported ExitStack came to unwind nothing:
every call reached AbstractContextManager.__exit__ instead.

THE OLD EXCLUSION WAS REASONABLE AND WRONG.  ``*args'''' accepts any number
of positionals, so the forwarders "cannot be enumerated" -- true, and
beside the point.  The set that matters is not every arity the def
accepts, it is every arity the SUPERCLASS already implements under that
name, and each emitted forwarder is wrapped in ___grailSuperImplements___:
so a candidate the base does not have is never compiled.  Offering
candidates therefore costs nothing where there is no base method to
shadow.

FOUR PAST THE NAMED PARAMETERS is the reach (___varargForwarderReach___).
It bounds which fixed-arity ENTRY POINTS are offered, not what the def
accepts -- a test here calls a ``*args'''' method with seven arguments to
say so.  __init__ stays excluded: routing construction through varargs is
what sidesteps the positional-arity cap, and a fixed-arity entry point
would put it back.'
%

doit
VarargsOverrideTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
VarargsOverrideTestCase removeAllMethods: 0.
VarargsOverrideTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: VarargsOverrideTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'varargs_override' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/varargs_override.py')
		name: 'varargs_override'.
%

category: 'Grail-Helpers'
method: VarargsOverrideTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: VarargsOverrideTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: VarargsOverrideTestCase
testAStarOverrideWinsOverTheInheritedMethod
	"The reported shape, through a direct call and through ``with'' -- the
	direct call is the half that shows it is not a with-statement bug."

	self assertAll: #('dunder_through_a_direct_call' 'dunder_through_with')
%

category: 'Grail-Tests'
method: VarargsOverrideTestCase
testEveryArityIsCovered
	"Nought through four, and a base whose own signature already has
	``*args'' after a named parameter."

	self assertAll: #('arity_zero' 'arity_one' 'arity_four'
		'named_plus_star')
%

category: 'Grail-Tests'
method: VarargsOverrideTestCase
testTheBaseStillAnswersForItself
	"The regression half.  Adding forwarders to a SUBCLASS must not change
	what the base does when nobody overrode it, and must not disturb a
	``*args'' method with no inherited namesake at all."

	self assertAll: #('the_base_still_answers_for_itself'
		'an_override_that_does_not_shadow_is_unaffected')
%

category: 'Grail-Tests'
method: VarargsOverrideTestCase
testTheOverrideStillTakesAnythingItCouldBefore
	"The forwarders bound which fixed-arity entry points EXIST; they do not
	bound what the def accepts.  Seven positionals and a keyword still
	arrive, and keywords still reach an override through the varargs
	selector."

	self assertAll: #('a_star_method_still_takes_any_arity'
		'keywords_still_reach_a_star_override')
%

category: 'Grail-Tests'
method: VarargsOverrideTestCase
testInitIsStillVarargsOnly
	"Deliberately excluded: compilesAsVarargs forces __init__ to the
	varargs form on purpose, and a fixed-arity entry point would
	reintroduce the positional-arity cap that routing around it avoids."

	self assertAll: #('init_is_still_excluded')
%

category: 'Grail-Tests'
method: VarargsOverrideTestCase
testAnUnboundBaseCallStillReachesTheBase
	"The forwarder is a TRAMPOLINE -- its body is a virtual re-send of the
	varargs form -- so running one for ``Base.m(self, ...)'' lands back on
	the subclass override that made the call.  test_with's MockNested is
	that shape and recursed until the stack ran out; UnboundMethod now
	skips forwarders, telling them apart by their method category."

	self assertAll: #('an_unbound_base_call_does_not_recurse'
		'an_unbound_base_call_from_a_fixed_override'
		'an_unbound_base_call_through_with')
%
