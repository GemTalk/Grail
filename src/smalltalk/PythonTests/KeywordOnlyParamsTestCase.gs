! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for KeywordOnlyParamsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'KeywordOnlyParamsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
KeywordOnlyParamsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! KeywordOnlyParamsTestCase — keyword-only parameters (names after ``*args'')
! bind from kwargs and must not leak into a trailing ``**kwargs''.  The varargs
! prologue now drops the bound kw-only names from the **kwargs copy.  werkzeug's
! Client.open relies on this (its ``if not kwargs'' guard).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
KeywordOnlyParamsTestCase removeAllMethods.
KeywordOnlyParamsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-KeywordOnly'
method: KeywordOnlyParamsTestCase
loadFixture
	"Load tests/python/keyword_only_params.py fresh."

	importlib @env1:modules removeKey: #'keyword_only_params' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/keyword_only_params.py')
		name: 'keyword_only_params'
%

category: 'Grail-Tests-KeywordOnly'
method: KeywordOnlyParamsTestCase
testKwonlyBoundAndNotLeaked
	"kw-only values bind to their params; a following **kwargs stays
	empty (the werkzeug Client.open shape)."

	| d |
	d := self loadFixture @env1:kwonly_bound_and_not_leaked.
	self assert: (d @env1:__getitem__: 'buffered') equals: true.
	self assert: (d @env1:__getitem__: 'follow_redirects') equals: false.
	self assert: (d @env1:__getitem__: 'kwargs_empty') equals: true.
	self assert: (d @env1:__getitem__: 'extra_keys') size equals: 0
%

category: 'Grail-Tests-KeywordOnly'
method: KeywordOnlyParamsTestCase
testKwonlyDefaultsWhenAbsent
	"Omitted kw-only params take their defaults."

	| d |
	d := self loadFixture @env1:kwonly_defaults_when_absent.
	self assert: (d @env1:__getitem__: 'nargs') equals: 2.
	self assert: (d @env1:__getitem__: 'buffered') equals: false.
	self assert: (d @env1:__getitem__: 'follow_redirects') equals: false
%

category: 'Grail-Tests-KeywordOnly'
method: KeywordOnlyParamsTestCase
testExtrasLandInKwargs
	"Genuine extra keyword args remain in **kwargs; kw-only names do not."

	| d extras |
	d := self loadFixture @env1:extras_land_in_kwargs.
	self assert: (d @env1:__getitem__: 'buffered') equals: true.
	extras := d @env1:__getitem__: 'extra_keys'.
	self assert: extras size equals: 2.
	self assert: (extras @env1:__getitem__: 0) equals: 'ham'.
	self assert: (extras @env1:__getitem__: 1) equals: 'spam'
%

category: 'Grail-Tests-KeywordOnly'
method: KeywordOnlyParamsTestCase
testCallerDictNotMutated
	"Dropping a bound kw-only name from the **kwargs copy must not
	mutate the caller's dict splatted in via ``**shared'' — the copy
	exists precisely so the removeKey: is local."

	| r kwargsKeys sharedKeys |
	r := self loadFixture @env1:caller_dict_not_mutated.
	"opt bound to 5."
	self assert: (r @env1:__getitem__: 0) equals: 5.
	"**kwargs holds only the non-param key x."
	kwargsKeys := r @env1:__getitem__: 1.
	self assert: kwargsKeys size equals: 1.
	self assert: (kwargsKeys @env1:__getitem__: 0) equals: 'x'.
	"The caller's dict still has BOTH keys — unmutated."
	sharedKeys := r @env1:__getitem__: 2.
	self assert: sharedKeys size equals: 2.
	self assert: (sharedKeys @env1:__getitem__: 0) equals: 'opt'.
	self assert: (sharedKeys @env1:__getitem__: 1) equals: 'x'
%
