! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AttributeStoreTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AttributeStoreTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AttributeStoreTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AttributeStoreTestCase
!
! Python: `obj.foo = value` writes via type(obj).__setattr__, which by
! default stores into the instance dict.  A regular method named `foo`
! is NOT a data descriptor — the store does NOT dispatch to it; the
! instance attribute simply shadows the method on later reads.
!
! Pre-fix, Grail's AssignAst (for non-self receivers) and
! builtins.setattr emitted/sent `obj @env1:foo: value`, so a class
! method `foo:` was incorrectly invoked as a "setter".  Fix: both
! paths write straight to dynamicInstVarAt:put: regardless of whether
! a same-named selector exists on the class.
!
! THE MIRROR IMAGE of that bug lived on just as long, in the other
! direction, and is what tests/python/unknown_method_call.py covers:
! PythonInstance's DNU read ANY unknown one-argument keyword send as
! an attribute STORE and ANSWERED THE ARGUMENT, so a call to a
! one-argument method the class does not have did not raise -- it
! invented an attribute and handed back its own argument.  So
! `d.quantize(Decimal("0.01"))` answered 0.01: a plausible-looking
! wrong NUMBER in money code, with no error raised anywhere.  It
! raises AttributeError now, and a Smalltalk-side store uses
! ___pyAttrStore___:put:, which cannot be mistaken for a call.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AttributeStoreTestCase removeAllMethods.
AttributeStoreTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AttributeStoreTestCase
setUp
	"Reload tests/python/attribute_store.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'attribute_store' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/attribute_store.py')
		name: 'attribute_store'.
%

category: 'Grail-Tests - Direct attr store'
method: AttributeStoreTestCase
testDirectStoreWritesValue
	"After `c.value = 42`, reading c.value returns 42."

	self assert: (testModule @env1:___pyAttrLoad___: #direct_value_after) equals: 42.
%

category: 'Grail-Tests - Direct attr store'
method: AttributeStoreTestCase
testDirectStoreDoesNotInvokeMethod
	"The `value:` method on Counter must NOT be invoked by `c.value = 42`.
	Pre-fix, AssignAst's non-self path emitted `obj @env1:value: 42`
	which dispatched to the method — appending 42 to side_effects."

	self assert: (testModule @env1:___pyAttrLoad___: #direct_side_effects_count) equals: 0.
%

category: 'Grail-Tests - setattr builtin'
method: AttributeStoreTestCase
testSetattrWritesValue
	"After setattr(c, 'value', 99), reading c.value returns 99."

	self assert: (testModule @env1:___pyAttrLoad___: #setattr_value_after) equals: 99.
%

category: 'Grail-Tests - setattr builtin'
method: AttributeStoreTestCase
testSetattrDoesNotInvokeMethod
	"builtins.setattr must store into the dict slot, not dispatch
	to a same-named class method."

	self assert: (testModule @env1:___pyAttrLoad___: #setattr_side_effects_count) equals: 0.
%

category: 'Grail-Tests - Sanity'
method: AttributeStoreTestCase
testStoreOfBrandNewAttrStillWorks
	"Sanity: a non-colliding attribute name still round-trips."

	self assert: (testModule @env1:___pyAttrLoad___: #brand_new_attr_after) equals: 'hello'.
%

category: 'Grail-Tests - setattr builtin'
method: AttributeStoreTestCase
testSetattrReturnsNone
	"Per CPython, builtins.setattr returns None.  Capturing the
	return value of setattr(c, 'foo', 42) must yield None, NOT the
	stored 42 (which is what we'd get if the helper bubbled aValue
	out for codegen convenience)."

	self assert: (testModule @env1:___pyAttrLoad___: #setattr_return_is_none) equals: true.
%

category: 'Grail-Tests - Sanity'
method: AttributeStoreTestCase
testUnshadowedMethodStillCallable
	"Sanity: until shadowed, the method is reachable through the class.
	c4.value(7) appends 7 to side_effects."

	| sideEffects |
	sideEffects := testModule @env1:___pyAttrLoad___: #unshadowed_side_effects.
	self assert: sideEffects size equals: 1.
	self assert: (sideEffects at: 1) equals: 7.
%

category: 'Grail-Setup'
method: AttributeStoreTestCase
loadUnknownCallFixture
	"Load tests/python/unknown_method_call.py fresh.

	Its own loader rather than setUp's: the two fixtures answer different
	questions, and a test that names which one it read is easier to place
	when it fails."

	importlib @env1:modules removeKey: #'unknown_method_call' ifAbsent: [].
	^ importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/unknown_method_call.py')
		name: 'unknown_method_call'
%

category: 'Grail-Setup'
method: AttributeStoreTestCase
loadStoreFixture
	"tests/python/attribute_store.py, freshly loaded.  setUp already puts it
	in ``testModule''; the Context checks reload it so the prec they read is
	the module's own import-time value and not one an earlier test left
	behind."

	importlib @env1:modules removeKey: #'attribute_store' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/attribute_store.py')
		name: 'attribute_store'
%

category: 'Grail-Tests - Unknown one-arg call'
method: AttributeStoreTestCase
testEveryUnknownCallShapeMatchesCPython
	"The whole table in one assertion, reported as ROWS: what a check
	actually GOT is the whole diagnosis here, because the regression this
	guards produces a plausible-looking wrong VALUE rather than an error, and
	a bare count describes nothing.

	The count is asserted separately -- ``no failures'' out of an empty table
	is a well-formed number describing nothing.  Every expectation in that
	table is measured against CPython by scripts/check_python_fixtures.sh."

	| mod |
	mod := self loadUnknownCallFixture.
	self assert: (mod @env1:check_count) equals: 8.
	self assert: (mod @env1:failures) equals: ''
%

category: 'Grail-Tests - Unknown one-arg call'
method: AttributeStoreTestCase
testUnknownOneArgCallRaisesAttributeError
	"The headline shape, named on its own so a failure says which one:
	``p.quantize(7)'' on a class with no ``quantize'' must raise, not
	answer 7."

	self
		assert: (self loadUnknownCallFixture
			@env1:___pyAttrLoad___: #unknown_one_arg)
		equals: 'AttributeError: ''Plain'' object has no attribute ''quantize'''
%

category: 'Grail-Tests - Unknown one-arg call'
method: AttributeStoreTestCase
testUnknownOneArgCallCreatesNoAttribute
	"The store the old reading performed is observable after the fact: a
	failed call must leave no ``quantize'' behind."

	self
		assert: (self loadUnknownCallFixture
			@env1:___pyAttrLoad___: #unknown_one_arg_created_attr)
		equals: false
%

category: 'Grail-Tests - Unknown one-arg call'
method: AttributeStoreTestCase
testModuleFastPathOnAnInstanceRaisesAttributeError
	"The Python shape that reaches the direct one-argument send.  Grail
	compiles ``math.floor(3.7)'' to ``math floor: 3.7'' because the NAME
	``math'' resolves to a module at compile time; rebinding it to an
	instance -- which CPython allows, and which CallAst deliberately does
	not treat as disabling the fast path -- lands that send on a
	PythonInstance.  It answered 3.7, having stored 3.7 under ``floor''."

	| mod |
	mod := self loadUnknownCallFixture.
	self assert: (mod @env1:___pyAttrLoad___: #module_shadow)
		equals: 'AttributeError: ''Plain'' object has no attribute ''floor'''.
	self assert: (mod @env1:___pyAttrLoad___: #module_shadow_created_attr)
		equals: false.
	"Again from inside a function body: codegen picks the call shape at the
	call site, so the two need not agree."
	self assert: (mod @env1:module_shadow_in_function)
		equals: 'AttributeError: ''Plain'' object has no attribute ''floor'''
%

category: 'Grail-Tests - Unknown one-arg call'
method: AttributeStoreTestCase
testStoresStillWorkAfterTheCallShapeRaises
	"The controls.  A one-argument STORE, a setattr of a brand-new name and
	a KNOWN one-argument method call all still do what they did -- what the
	fix gives up at DNU time is one READING of a message, not the store."

	| mod known |
	mod := self loadUnknownCallFixture.
	self assert: (mod @env1:___pyAttrLoad___: #store_still_works)
		equals: 'stored'.
	self assert: (mod @env1:___pyAttrLoad___: #setattr_still_works)
		equals: 'ROUND_UP'.
	known := mod @env1:___pyAttrLoad___: #known_call.
	self assert: (known @env1:__getitem__: 0) equals: 'known'.
	self assert: (known @env1:__getitem__: 1) equals: 5
%

category: 'Grail-Tests - Unknown one-arg call'
method: AttributeStoreTestCase
testSmalltalkSideStoreEntryPointStillWorks
	"``___pyAttrStore___:put:'' is what a Smalltalk caller uses now that the
	one-argument keyword send raises.  The value must be visible to the
	Python read path and in __dict__ -- which is the point of the entry point
	being the canonical one rather than a second door -- and the send that
	used to do this must now raise."

	| mod cls obj |
	mod := self loadUnknownCallFixture.
	cls := mod @env1:___pyAttrLoad___: #Plain.
	obj := cls @env1:value: { } value: nil.
	obj @env1:___pyAttrStore___: #quantize put: 42.
	self assert: (obj @env1:___pyAttrLoad___: #quantize) equals: 42.
	self assert: (obj @env1:__dict__ at: #quantize) equals: 42.
	self should: [obj @env1:quantize: 43] raise: AttributeError
%

category: 'Grail-Tests - Context store'
method: AttributeStoreTestCase
testStoringDecimalContextPrecDoesNotCrash
	"``decimal.getcontext().prec = 10'' was reported to take the process
	down with a GemStone OffsetError (2003, objErrBadOffsetIncomplete,
	max:2 actual:3) -- an attribute store running off the end of the
	receiver's instance-variable space.  On this commit it does not, in any
	of the shapes probed: a script, ``grail -c'', the REPL, a function body,
	a method body, augmented assignment, setattr, a freshly constructed
	Context and DefaultContext.  Context holds exactly two attributes, so
	this is the smallest interesting store on a stdlib object -- overwrite
	each of the two and read both back.

	PINNED, not fixed, and deliberately so: an uncatchable crash on this
	shape does not make this test FAIL, it makes it ERROR, which is the
	signal wanted.

	The fixture NORMALIZES prec before reading it: getcontext() answers one
	module-global Context that outlives a reload of the fixture, so an
	earlier load in the same session has already left prec at 10 and the
	``before'' value would otherwise depend on test order."

	| mod |
	mod := self loadStoreFixture.
	self assert: (mod @env1:___pyAttrLoad___: #context_prec_before) equals: 28.
	self assert: (mod @env1:___pyAttrLoad___: #context_prec_after) equals: 10.
	self assert: (mod @env1:___pyAttrLoad___: #context_rounding_after)
		equals: 'ROUND_UP'
%

category: 'Grail-Tests - Context store'
method: AttributeStoreTestCase
testDecimalContextPrecRemainsInert
	"Being able to SET prec is not precision control, and this is the
	assertion that keeps the test above from reading as though it were: the
	same exact division answers the SAME string at prec 28 and at prec 2,
	where CPython answers 28 digits and then ``0.34''.

	Grail's Decimal is an exact rational carrying no exponent, so real prec,
	per-operation rounding and traps need the coefficient+exponent
	re-representation tracked as issue #846.  A GRAIL-ONLY claim; the
	fixture method says so too."

	| mod wide narrow |
	mod := self loadStoreFixture.
	wide := mod @env1:division_at_prec: 28.
	narrow := mod @env1:division_at_prec: 2.
	self assert: wide equals: narrow.
	self deny: narrow = '0.34'
%

category: 'Grail-Setup'
method: AttributeStoreTestCase
loadExplicitDunderFixture
	"Load tests/python/explicit_dunder_call.py fresh."

	importlib @env1:modules removeKey: #'explicit_dunder_call' ifAbsent: [].
	^ importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/explicit_dunder_call.py')
		name: 'explicit_dunder_call'
%

category: 'Grail-Tests - Explicit dunder call'
method: AttributeStoreTestCase
testEveryExplicitDunderCallShapeMatchesCPython
	"The whole table in one assertion: the bound call that killed the gem,
	the five spellings that always worked, a class defining its own
	__setattr__, both two-argument bound dunders that were never broken, and
	the one-argument side of the boundary.

	Reported as ROWS -- but note the failure mode of the headline case is not
	a wrong row.  An uncatchable OffsetError takes the shard down, so a
	regression ERRORS this test rather than failing it.

	Every expectation is measured against CPython by
	scripts/check_python_fixtures.sh; the count is asserted separately
	because ``no failures'' out of an empty table is a well-formed number
	describing nothing."

	| mod |
	mod := self loadExplicitDunderFixture.
	self assert: (mod @env1:check_count) equals: 17.
	self assert: (mod @env1:failures) equals: ''
%

category: 'Grail-Tests - Explicit dunder call'
method: AttributeStoreTestCase
testBoundSetattrStoresInsteadOfKillingTheGem
	"The headline shape, named on its own so a failure says which one.
	``p.__setattr__('x', 1)'' must STORE -- not merely fail politely, and
	certainly not die with ``OffsetError 2003, objErrBadOffsetIncomplete,
	max:2 actual:3'', which is an env-0 kernel error no Python ``except'' can
	see and which took the whole process down with rc=1.

	Cause: ``object class >> ___setattr__: args kw: kwargs'' serves the
	UNBOUND ``object.__setattr__(inst, name, value)'' spelling, and that
	selector is letter for letter the VARARGS spelling of the BOUND call.
	___pyAttrLoad___'s @classmethod-through-an-instance probe read the
	collision as a class-side method, bound the call to the CLASS, and the
	unbound helper indexed ``args at: 3'' on a two-element array."

	| mod |
	mod := self loadExplicitDunderFixture.
	self assert: (mod @env1:bound_setattr_stores) equals: 'value 1'.
	"THE RETURN VALUE DIVERGES, and it is written down here rather than
	quietly asserted: CPython's object.__setattr__ answers None, Grail
	answers the value it stored.  ___pyAttrStore___ returns aValue on
	purpose, so codegen can use a store as an expression (chained
	assignment, tuple unpack), and object >> __setattr__:_: hands that
	straight back.  Pre-existing -- the crash simply hid it -- and changing
	it means changing a return the assignment codegen reads, which is its
	own change with its own blast radius.  builtins.setattr already answers
	None (testSetattrReturnsNone); the dunder does not."
	self assert: (mod @env1:bound_setattr_returns_none) equals: 'value 1'
%

category: 'Grail-Tests - Explicit dunder call'
method: AttributeStoreTestCase
testTheSpellingsThatAlwaysWorkedStillWork
	"The whole point of scoping the veto narrowly.  Every spelling that
	passes self explicitly -- and plain assignment, and the setattr builtin
	-- went through a different path and must be untouched.  These are also
	the ONLY spellings the vendored stdlib uses: a grep of src/python/stdlib
	finds no bound ``x.__setattr__(name, value)'' at all, which is why
	nothing in the corpus ever hit the crash."

	| mod |
	mod := self loadExplicitDunderFixture.
	self assert: (mod @env1:unbound_setattr) equals: 'value 1'.
	self assert: (mod @env1:super_setattr) equals: 'value 1'.
	self assert: (mod @env1:type_setattr) equals: 'value 1'.
	self assert: (mod @env1:plain_assignment) equals: 'value 1'.
	self assert: (mod @env1:setattr_builtin) equals: 'value 1'.
	"A class that DEFINES __setattr__ and delegates through the unbound form
	-- the werkzeug.local / collections idiom.  The bound call must run that
	override, as CPython does, and the log proves it did."
	self assert: (mod @env1:overriding_plain_assignment) equals: 'value [''x'']'.
	self assert: (mod @env1:overriding_bound_call) equals: 'value (1, [''x''])'
%

category: 'Grail-Tests - Explicit dunder call'
method: AttributeStoreTestCase
testTwoArgumentBoundDundersWereNeverTheProblem
	"Pinned so nobody reads an arity rule out of this fix.  ``__setitem__''
	and a descriptor's ``__set__'' are two-argument bound dunder calls that
	worked before the change and work after it -- object class defines no
	unbound ``___setitem__:kw:'' / ``___set__:kw:'' helper for their names to
	collide with.  Exactly two names in the tree have one: __setattr__ and
	__new__."

	| mod |
	mod := self loadExplicitDunderFixture.
	self assert: (mod @env1:bound_setitem) equals: 'value {''k'': 9}'.
	self assert: (mod @env1:bound_descriptor_set)
		equals: 'value (''descriptor-ran'', 5)'
%

category: 'Grail-Tests - Explicit dunder call'
method: AttributeStoreTestCase
testOneArgumentBoundDundersStayWorking
	"The other side of the boundary the veto sits on.  A one-argument bound
	dunder never reached the colliding varargs slot, and must not start
	behaving differently because the probe now stands down for a
	two-argument one."

	| mod |
	mod := self loadExplicitDunderFixture.
	self assert: (mod @env1:bound_getattribute) equals: 'value ''kept-value'''.
	self assert: (mod @env1:bound_delattr) equals: 'value False'.
	self assert: (mod @env1:bound_reduce_ex) equals: 'value True'
%

category: 'Grail-Tests - Explicit dunder call'
method: AttributeStoreTestCase
testRealClassMethodsThroughAnInstanceAreUntouched
	"The contract the veto had to leave alone, and the one a careless
	widening of it would break.  A real @classmethod or @staticmethod
	reached through an INSTANCE still binds to the class.

	That is exactly what ___metaVarargsIsUnboundDunderHelper___: refuses to
	veto: it requires that NO true metaclass owns any fixed-arity slot of
	the name -- a real @classmethod always compiles to one -- and that the
	receiver's own instance side owns one instead.  Neither holds for a
	genuine class-side method, so the probe runs unchanged for them.

	``MyDict().fromkeys(['a'])'' is the built-in shape test_dict
	test_fromkeys pins, asserted here too so a failure points at this probe
	rather than at the dict tests."

	| mod |
	mod := self loadExplicitDunderFixture.
	self assert: (mod @env1:classmethod_through_instance)
		equals: 'value (''WithClassMethod'', 7)'.
	self assert: (mod @env1:classmethod_two_args)
		equals: 'value (''WithClassMethod'', 1, 2)'.
	self assert: (mod @env1:staticmethod_through_instance)
		equals: 'value (''static'', 3)'.
	self assert: (mod @env1:dict_subclass_fromkeys)
		equals: 'value {''a'': None}'
%
