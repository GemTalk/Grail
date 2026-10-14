! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BareCachedPropertyCachesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BareCachedPropertyCachesTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BareCachedPropertyCachesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BareCachedPropertyCachesTestCase
!
! A bare ``@cached_property'' caches (#1444).  ClassDefAst recognised the bare
! name and compiled a getter paired with a storing setter, which never stored
! on a read: every read ran the method, so Flask's app.jinja_env was a new
! Jinja Environment, with an empty template cache, on every request.  The name
! is now an ordinary decorator applied at run time, as the dotted
! ``@functools.cached_property'' always was.  ``super().p'' over a parent's
! cached_property now asks the descriptor (Super >> ___bindHolderValue___:).
!
! Driven by tests/python/bare_cached_property_caches.py, whose EXPECTED table
! is CPython 3.14's output; its flask_rows() are Grail-only.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BareCachedPropertyCachesTestCase removeAllMethods.
BareCachedPropertyCachesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BareCachedPropertyCachesTestCase
setUp
	(importlib @env1:modules) removeKey: #'bare_cached_property_caches' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'bare_cached_property_caches'.
%

category: 'Grail-Setup'
method: BareCachedPropertyCachesTestCase
tearDown
	(importlib @env1:modules) removeKey: #'bare_cached_property_caches' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: BareCachedPropertyCachesTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/bare_cached_property_caches.py'
%

category: 'Grail-Private'
method: BareCachedPropertyCachesTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: BareCachedPropertyCachesTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 12.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

category: 'Grail-Tests'
method: BareCachedPropertyCachesTestCase
testFlaskAndWerkzeugCache
	| rows |
	rows := (testModule @env1:___pyAttrLoad___: #flask_rows)
		@env1:___pyCallValue___: #() kw: nil.
	self assert: (rows @env1:__len__) = 4.
	#('werkzeug cached_property caches'
	  'app.jinja_env is app.jinja_env'
	  'app.logger is app.logger'
	  'a filter and a global set on app.jinja_env render') do: [:label |
		self
			assert: (rows @env1:__getitem__: label) == true
			description: label]
%
