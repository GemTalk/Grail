! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MetaclassMroHookTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassMroHookTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MetaclassMroHookTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MetaclassMroHookTestCase
!
! A METACLASS'S ``mro()'' HOOK.
!
! ``mro()'' is not an observer.  CPython calls it from inside type.__new__ and
! the list it RETURNS becomes the class's __mro__ -- which is why the usual
! override ends in ``return super().mro()'', and why one that returns something
! else genuinely changes attribute lookup and issubclass.
!
! Grail never called it.  It also DERIVES the linearization on demand rather than
! storing one (importlib >> ___mroOf___:), which is the deeper mismatch: CPython
! has a hook because it has a stored tp_mro to produce.  Honouring the hook here
! means recording what it answered and having that single derivation site prefer
! it.  test_super's test___class___mro is the upstream case; with this, test_super
! passes whole -- 40 tests, no failures, no errors.
!
! TWO SEPARATE GAPS, and the second is easy to miss because the first hides it.
! ``super().mro()'' -- the way essentially every real override delegates --
! raised ``'super' object has no attribute 'mro'''.  Grail's ``type'' is not a
! Python class with a method dictionary: its behaviour lives on Smalltalk's
! Behavior, which a CLASS answers directly.  So ``A.mro()'' had always worked
! while the super() spelling had not, and a hook wired up without that fix would
! have been called and then died on its own first statement.
!
! THE ENVIRONMENT IS THE FILTER for that bridge, and it is the right one rather
! than a convenient one: Grail compiles type's Python-visible protocol onto
! Behavior in ENVIRONMENT 1, while Smalltalk's own internals (``superclass'',
! ``name'', ``selectors'') are env 0 and stay invisible.  Asking for an env-1
! method on the receiver's metaclass side asks precisely ``does type define this
! in Python?'', with no list to keep in step with Class.gs.
!
! THE GUARD IS WHAT KEEPS THIS FREE.  ``mro'' lives on Behavior in env 1, so an
! unguarded probe finds one for EVERY metaclass alive and would put a hook call
! on the creation of every metaclass-governed class in the corpus.
! ___grailMetaclassOverridesMro___: requires the owner to sit STRICTLY BELOW type
! -- an mro written in Python -- which is the same shape of test, and the same
! trap, as ___grailMetaclassConstructs___: (where an unguarded __new__ probe
! answered true universally and dispatched ABCMeta).
!
! AN IDENTITY REGISTRY, not a class attribute, holds the recorded answer.  A
! ___dynamicClassAttr___ probe would add a whole superclass walk to every MRO
! computation in the system, and -- because it walks -- a SUBCLASS would inherit
! its parent's override and report the parent's linearization as its own.  The
! registry is keyed by identity, so neither happens; ___miRegistry___ is the
! established pattern and carries the same session-local tradeoff.
!
! Fixture: tests/python/metaclass_mro_hook.py (self-verifying under CPython
! 3.14).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: MetaclassMroHookTestCase
setUp
	probe := self ___loadProbe___: 'metaclass_mro_hook'.
%

category: 'Grail-Private'
method: MetaclassMroHookTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: MetaclassMroHookTestCase
reprAt: aKey
	"The fixture's entries are nested Python lists; compare their repr so a
	failure prints both sides whole."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests'
method: MetaclassMroHookTestCase
testTheHookIsCalledDuringClassCreation
	"The headline: Grail never called a metaclass's mro() at all.  The second
	half of the pair is the control -- a hook that ran but whose answer was
	dropped would still leave __mro__ starting with the class, so this test
	alone does not establish that the RETURN VALUE matters."

	self assert: (self reprAt: 'hook_is_called') equals: '[[''A''], True]'.
%

category: 'Grail-Tests'
method: MetaclassMroHookTestCase
testEveryClassInTheChainGetsItsOwnCall
	"Wired into class CREATION, not into one class statement.  A subclass of a
	class whose metaclass overrides mro() gets its own call with its own class,
	and its own linearization -- ``B'' first, not A's recorded answer.  That
	second half is what a chain-walking read of the recorded value would have
	got wrong, which is why the answer lives in an identity registry."

	self assert: (self reprAt: 'called_for_every_class_in_the_chain')
		equals: '[[''A'', ''B''], [''B'', ''A'']]'.
%

category: 'Grail-Tests'
method: MetaclassMroHookTestCase
testTheReturnedLinearizationIsHonoured
	"THE TEST THAT SAYS THE HOOK IS REAL.  mro() PRODUCES the linearization
	rather than observing it, so splicing a class into the answer is visible to
	__mro__, to mro(), and to issubclass.  An implementation that called the hook
	and discarded its result would pass every other test in this class and fail
	this one."

	self assert: (self reprAt: 'custom_mro_takes_effect')
		equals: '[True, [''A'', ''Extra''], True]'.
%

category: 'Grail-Tests'
method: MetaclassMroHookTestCase
testTheHookCanReachAZeroParameterMethodAndReadDunderClass
	"test_super's own shape.  mro() reaches a zero-parameter function through the
	class __dict__ and calls it with nothing -- which Python 3 allows and Grail
	refused until #519 -- and that function reads ``__class__'', which must
	ALREADY be the class under construction by the time the hook runs.  Three
	separate pieces meeting in one call."

	self assert: (self reprAt: 'zero_param_from_dict') equals: '[1, True]'.
%

category: 'Grail-Tests'
method: MetaclassMroHookTestCase
testAMetaclassThatDoesNotDefineMroIsUntouched
	"THE GUARD, and the reason this change costs the corpus nothing.  ``mro''
	lives on Behavior in env 1, so an unguarded probe finds one for every
	metaclass alive; requiring the owner to sit strictly below type restricts it
	to an mro written in Python, which outside test_super is nothing at all.
	Same shape of trap as ___grailMetaclassConstructs___:, where an unguarded
	__new__ probe answered true universally."

	self assert: (self reprAt: 'a_metaclass_without_mro_is_untouched')
		equals: '[[''new''], True]'.
%
