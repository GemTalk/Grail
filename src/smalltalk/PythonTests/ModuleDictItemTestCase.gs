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

! --- non-string keys are refused CATCHABLY -----------------------------------

category: 'Grail-Tests-ModuleDict'
method: ModuleDictItemTestCase
testNonStringKeyRaisesCatchableTypeError
	"The point is CATCHABLE.  A Smalltalk MNU here is invisible to Python's
	``except'', so the fixture's try/except would not have produced a value
	at all and this test would ERROR rather than fail."

	self
		assert: (self loadFixture @env1:set_non_string_key)
		equals: 'TypeError: attribute name must be string, not ''CustomStr'''
%

category: 'Grail-Tests-ModuleDict'
method: ModuleDictItemTestCase
testDeletingANonStringKeyRaisesCatchableTypeError
	"The new __delitem__ must not reintroduce the MNU on its own path."

	self
		assert: (self loadFixture @env1:del_non_string_key)
		equals: 'TypeError: attribute name must be string, not ''CustomStr'''
%

category: 'Grail-Tests-ModuleDict'
method: ModuleDictItemTestCase
testNonStringKeyOnAnInstanceDictAlsoRaises
	"The guard lives on PyInstanceDict, so an ordinary object's __dict__ is
	covered by the same rule as a module's."

	self
		assert: (self loadFixture @env1:set_non_string_key_on_instance)
		equals: 'TypeError: attribute name must be string, not ''CustomStr'''
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
