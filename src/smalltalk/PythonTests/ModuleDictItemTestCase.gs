! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleDictItemTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleDictItemTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ModuleDictItemTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleDictItemTestCase — item protocol on a namespace dict (PyModuleDict /
! PyInstanceDict), which is a VIEW over dynamic instance variables rather than
! the plain dict CPython has.
!
!   * ``del mod.__dict__[name]'' raised "'PyModuleDict' object does not
!     support item deletion" — there was no __delitem__ at all.
!   * A non-string key sent ``asSymbol'' to whatever it was handed, so
!     ``builtins.__dict__[CustomStr('iter')] = ...'' raised a Smalltalk MNU.
!     Grail cannot STORE such a key, but an uncatchable MNU escaping into
!     Python is the wrong way to say so: it defeats ``except'' and can take
!     the session down from inside a builtin callback.
!
! Both are reached by CPython's test_iter test_reduce_mutating_builtins_iter.
!
! Fixture: tests/python/module_dict_items.py
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleDictItemTestCase removeAllMethods.
ModuleDictItemTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ModuleDict'
method: ModuleDictItemTestCase
loadFixture
	"Load tests/python/module_dict_items.py fresh."

	importlib @env1:modules removeKey: #'module_dict_items' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_dict_items.py')
		name: 'module_dict_items'
%

! --- __delitem__ -------------------------------------------------------------

category: 'Grail-Tests-ModuleDict'
method: ModuleDictItemTestCase
testDelRemovesAModuleKey
	"set / read / ``del'' a key on a module's own __dict__."

	| r |
	r := self loadFixture @env1:del_own_module_key.
	self assert: (r @env1:__getitem__: 0) equals: 7.
	self assert: (r @env1:__getitem__: 1) equals: false
%

category: 'Grail-Tests-ModuleDict'
method: ModuleDictItemTestCase
testDelRemovesABuiltinsKey
	"builtins.__dict__ is the receiver CPython's test uses."

	| r |
	r := self loadFixture @env1:del_builtins_key.
	self assert: (r @env1:__getitem__: 0) equals: 1.
	self assert: (r @env1:__getitem__: 1) equals: false
%

category: 'Grail-Tests-ModuleDict'
method: ModuleDictItemTestCase
testDelMissingKeyRaisesKeyError
	"__delitem__ delegates to pop:, which already raised KeyError when
	absent — the same as CPython."

	self
		assert: (self loadFixture @env1:del_missing_key)
		equals: 'KeyError: ''grail_no_such_key_xyz'''
%

category: 'Grail-Tests-ModuleDict'
method: ModuleDictItemTestCase
testDelStatementOnMissingKeyRaisesKeyError
	"The ``del d[k]'' STATEMENT form, not just the explicit dunder call."

	self
		assert: (self loadFixture @env1:del_statement_missing_key)
		equals: 'KeyError: ''grail_no_such_key_xyz'''
%

! --- non-string keys are STORED, and never MNU ------------------------------

category: 'Grail-Tests-ModuleDict'
method: ModuleDictItemTestCase
testNonStringKeyIsStoredRatherThanRefused
	"These three used to assert ``TypeError: attribute name must be string''.
	CPython answers ``no raise'': a module or instance dict is an ordinary dict
	there and takes any hashable key, and this fixture's CustomStr is exactly
	that -- hashable, string-EQUAL, not a str.  Verified by running the fixture
	under CPython; see its header for the recipe, and for why the fixture gate
	cannot check it.

	What the three still cover is the property they were written for: a
	non-string key must never reach ``asSymbol'' and MNU.  A Smalltalk MNU is
	invisible to Python's ``except'', so the fixture's try/except would produce
	no value at all and these would ERROR rather than fail -- which is a
	different signal from a wrong string, and the one that matters."

	self
		assert: (self loadFixture @env1:set_non_string_key)
		equals: 'no raise'
%

category: 'Grail-Tests-ModuleDict'
method: ModuleDictItemTestCase
testDeletingANonStringKeyMatchesTheStringItEqualsQ
	"The invariant this change owns: a non-string key that compares EQUAL to a
	string behaves exactly like that string.  Asserted as an EQUALITY between the
	two answers rather than against a literal, because the literal here is not
	Grail's to choose.

	The probes are WARM -- materialise, delete, restore -- and self-contained.
	They used to rely on coldness (a builtin function only becomes a deletable
	binding on first read), but the builtins-rebinding change made first-class
	builtin reads cache through ___globalAt___:, so any earlier fixture in the
	session could warm ``iter'' and the two order-coupled cold probes
	desynchronised: the first delete consumed the binding the second then
	missed.

	Still covers the property the test was written for: a non-string key must
	never reach ``asSymbol'' and MNU.  An MNU is invisible to Python's
	``except'', so the fixture would return no value and this would ERROR."

	self
		assert: (self loadFixture @env1:del_non_string_key)
		equals: (self loadFixture @env1:del_string_key)
%

category: 'Grail-Tests-ModuleDict'
method: ModuleDictItemTestCase
testNonStringKeyOnAnInstanceDictIsStoredToo
	"The side table lives on PyInstanceDict, so an ordinary object's __dict__ is
	covered by the same rule as a module's -- PyModuleDict inherits it."

	self
		assert: (self loadFixture @env1:set_non_string_key_on_instance)
		equals: 'no raise'
%

category: 'Grail-Tests-ModuleDict'
method: ModuleDictItemTestCase
testStringKeysAreUndisturbed
	"The guard must not add a rule to ordinary string-keyed traffic."

	| r |
	r := self loadFixture @env1:string_keys_still_work.
	self assert: (r @env1:__getitem__: 0) equals: 'v'.
	self assert: (r @env1:__getitem__: 1) equals: true.
	self assert: (r @env1:__getitem__: 2) equals: 'v'
%
