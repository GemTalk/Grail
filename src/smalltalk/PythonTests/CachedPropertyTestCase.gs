! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CachedPropertyTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CachedPropertyTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
CachedPropertyTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CachedPropertyTestCase — @cached_property realized via getter+setter pairing
! (the mechanism behind werkzeug Request.args / .headers / .cookies).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CachedPropertyTestCase removeAllMethods.
CachedPropertyTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-cached_property'
method: CachedPropertyTestCase
loadFixture
	"Load tests/python/cached_property_demo.py fresh (drop werkzeug +
	the fixture so source edits are reflected)."

	| mods keys |
	mods := importlib @env1:modules.
	keys := mods @env0:keys @env0:select: [:k |
		(k @env0:asString @env0:= 'werkzeug')
			@env0:or: [(k @env0:asString @env0:indexOfSubCollection: 'werkzeug.') @env0:> 0]].
	keys @env0:do: [:k | mods @env0:removeKey: k ifAbsent: []].
	mods @env0:removeKey: #'cached_property_demo' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/cached_property_demo.py')
		name: 'cached_property_demo'
%

category: 'Grail-Tests-cached_property'
method: CachedPropertyTestCase
testReadsCachedProperty
	"A bare ``instance.attr'' read on a @cached_property invokes the
	getter and returns the value (not a BoundMethod)."

	| mod |
	mod := self loadFixture.
	self assert: mod @env1:reads_cached_property equals: true.
	self assert: mod @env1:cached_property_is_not_boundmethod equals: true.
	self assert: mod @env1:getter_actually_runs equals: true
%

category: 'Grail-Tests-cached_property'
method: CachedPropertyTestCase
testPlainMethodUnaffected
	"A regular undecorated method is not turned into a value attribute
	— it stays a callable."

	| mod |
	mod := self loadFixture.
	self assert: mod @env1:plain_method_still_callable equals: true
%
