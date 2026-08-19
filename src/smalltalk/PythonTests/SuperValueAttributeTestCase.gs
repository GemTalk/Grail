! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SuperValueAttributeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SuperValueAttributeTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SuperValueAttributeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SuperValueAttributeTestCase
!
! A DATA ATTRIBUTE READ THROUGH ``super()''.
!
! Some attributes are values, not callables.  A Smalltalk-backed class says so
! with the class-side ``___pythonValueAttrs___'' hook, and object >>
! ___pyAttrLoad___ has always honoured it: ``s.family'' answers 2, not a bound
! method.  ``super().family'' did not.  It answered a SuperBoundMethod -- the
! callable proxy Super.gs builds for a deferred method resolution -- where a
! value was due.
!
! THE FAILURE IS SILENT, which is what makes it worth a test rather than a
! one-line fix.  A proxy is a perfectly good object: it has a class, a repr, and
! it compares unequal to everything without complaining.  Nothing raises until
! something treats it as a number, arbitrarily far from the super() call.
!
! IT IS ALSO NOT A CORNER.  This is the shape CPython's own socket.py uses to
! widen the primitive layer's ints into IntEnums:
!
!     @property
!     def family(self):
!         return _intenum_converter(super().family, AddressFamily)
!
! -- four times, for family/type/proto/timeout.  With the proxy, the vendored
! facade's family and type came out as ``<SuperBoundMethod object at 0x...>'',
! which is how this was found: it is the next blocker after _socket (#566) and
! Enum._convert_ (#569) on the way to running CPython's socket.py unmodified.
!
! CALLED THROUGH THE PROXY, NOT PERFORMED ON THE OBJECT.  The obvious fix --
! ``obj perform: aSym env: 1'' -- is wrong in a way that is worse than the bug:
! performing the name on the object finds the MOST DERIVED implementation, which
! for the shape above is the very property making the super() call.  That is
! unbounded recursion, not a wrong value.  SuperBoundMethod already resolves
! against cls's PARENT chain, which is exactly what super() means, so the fix
! builds the proxy and invokes it with no arguments.
!
! The hook is asked of ``cls superClass'', not of the object's class: super()
! skips cls by definition.  ``respondsTo:'' walks the chain, so a hook inherited
! from further up still counts.
!
! WHAT THE CONTROLS PROTECT.  Only names the parent advertises as value
! attributes may be invoked on read.  An ordinary method reached through super()
! must still come back callable, and one taking arguments must still receive
! them -- a fix that eagerly invoked everything would satisfy the value checks
! and break every ``super().m(...)'' in the corpus.  testMethodThroughSuperStill*
! are those controls.
!
! STILL BROKEN, and recorded rather than hidden: a plain Python ``@property'' on
! a parent, read through super(), also answers a proxy.  That is a DIFFERENT
! mechanism -- Grail recognises such a property by a getter/setter PAIR of
! compiled methods, a test that lives inline in object >> ___pyAttrLoad___ and
! carries several exclusions the comments there mark as measured rather than
! reasoned (fixed-arity forwarders, arity-widening overrides).  Reusing it from
! Super.gs means factoring that predicate out of the hottest path in the system,
! which deserves its own change and its own full-suite run.  The fixture asserts
! the limitation as a documented Grail-only check, so CPython disagreeing with
! it is an XFAIL; when it reads XPASS the gap has closed.
!
! A second, pre-existing gap left alone: super() reads a parent's class-attribute
! store from the COMMITTED store only, not the session-local canonical overlay,
! so ``super().d'' for a descriptor assigned as a class attribute raises
! AttributeError before any descriptor logic could run.  Super.gs's own comment
! already records that; a descriptor branch was drafted here and removed again
! because nothing in reach could demonstrate it firing.
!
! Fixture: tests/python/super_value_attribute.py (self-verifying under CPython
! 3.14.6 -- all 10 checks pass there unchanged, plus the one documented XFAIL).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: SuperValueAttributeTestCase
setUp
	probe := self ___loadProbe___: 'super_value_attribute'.
%

category: 'Grail-Private'
method: SuperValueAttributeTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'RESULTS'
%

category: 'Grail-Private'
method: SuperValueAttributeTestCase
resultAt: aKey
	"The fixture stores true for a passing check, or a diagnostic STRING for
	one that raised -- so a failure prints what went wrong instead of just
	``expected true''."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

! ---- the bug ----------------------------------------------------------------

category: 'Grail-Tests'
method: SuperValueAttributeTestCase
testValueAttributeThroughSuperAnswersItsValue
	"THE BUG.  ``super().family'' answered a SuperBoundMethod instead of 2.
	Read through the object directly it was always 2, which is what made the
	divergence easy to miss."

	self assert: (self resultAt: 'value_attr_family') equals: 'True'.
%

category: 'Grail-Tests'
method: SuperValueAttributeTestCase
testEveryAdvertisedValueAttributeIsCovered
	"family/type/proto/timeout -- all four of the names socket.py reads this
	way, including the one whose value is None, since ``None'' and ``a proxy''
	are both non-numbers and a fix that answered nil would pass a laxer test."

	self assert: (self resultAt: 'value_attr_type') equals: 'True'.
	self assert: (self resultAt: 'value_attr_proto') equals: 'True'.
	self assert: (self resultAt: 'value_attr_timeout_is_none') equals: 'True'.
%

category: 'Grail-Tests'
method: SuperValueAttributeTestCase
testTheValueIsAnIntNotMerelyNotAProxy
	"Distinguishes ``the proxy is gone'' from ``the right value arrived''."

	self assert: (self resultAt: 'value_attr_is_an_int') equals: 'True'.
%

category: 'Grail-Tests'
method: SuperValueAttributeTestCase
testTheValueMatchesAnUnsubclassedInstance
	"The super()-derived value equals what a plain, unsubclassed socket reports
	for the same attribute.  Compares against a real second object rather than
	a literal, so it would catch a fix that answered a plausible constant."

	self assert: (self resultAt: 'value_attr_agrees_with_a_plain_socket')
		equals: 'True'.
%

! ---- the controls -----------------------------------------------------------

category: 'Grail-Tests'
method: SuperValueAttributeTestCase
testMethodThroughSuperStillAnswersSomethingCallable
	"The narrow scope of the fix.  Only names in ___pythonValueAttrs___ are
	invoked on read; an ordinary method must still come back as a callable
	proxy and run when called."

	self assert: (self resultAt: 'method_via_super_is_still_callable')
		equals: 'True'.
	self assert: (self resultAt: 'ordinary_method_via_super_still_binds')
		equals: 'True'.
%

category: 'Grail-Tests'
method: SuperValueAttributeTestCase
testMethodThroughSuperStillReceivesItsArguments
	"``super().settimeout(1.5)'' -- arity resolution through the proxy is
	unchanged.  Eagerly invoking on read would have called it with none."

	self assert: (self resultAt: 'method_via_super_takes_arguments')
		equals: 'True'.
%

category: 'Grail-Tests'
method: SuperValueAttributeTestCase
testPurePythonMethodChainingThroughSuperIsUnaffected
	"The commonest use of super() in the corpus: a subclass method calling its
	parent's.  Nothing here involves value attributes, and it must stay exactly
	as it was."

	self assert: (self resultAt: 'pure_python_method_via_super') equals: 'True'.
%

! ---- the gap that remains ---------------------------------------------------

category: 'Grail-Tests'
method: SuperValueAttributeTestCase
testPurePythonPropertyThroughSuperIsStillAProxy
	"A DOCUMENTED LIMITATION, asserted so that closing it is noticed.  A plain
	``@property'' on a parent read through super() still answers a proxy: Grail
	recognises such a property by a getter/setter PAIR of compiled methods, a
	predicate that lives inline in object >> ___pyAttrLoad___ with exclusions
	its own comments mark as measured rather than reasoned.  Reusing it here
	means factoring it out of the hottest path in the system.

	When this test starts FAILING, the gap has closed and the assertion should
	be inverted rather than deleted -- and the fixture's GRAIL_ONLY entry moved
	up with it."

	self assert: (self resultAt: 'pure_python_property_via_super_is_a_proxy')
		equals: 'True'.
%

set compile_env: 0
