! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReSubCallableTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReSubCallableTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ReSubCallableTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ReSubCallableTestCase — re.sub / pattern.sub with a CALLABLE replacement.
! A Grail Python callable is a 2-arg block ([:positional :kwargs | ...]); the
! SrePattern expansion helper used to invoke it with `value: m` (1 arg) and
! raised "block evaluated with 1 argument when 2 were expected".  werkzeug's
! cookie quoting (`_cookie_slash_re.sub(lambda m: _map[m.group()], ...)`)
! depends on this.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ReSubCallableTestCase removeAllMethods.
ReSubCallableTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ReSubCallable'
method: ReSubCallableTestCase
loadFixture
	"Load tests/python/re_sub_callable.py fresh."

	importlib @env1:modules @env0:removeKey: #'re_sub_callable' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/re_sub_callable.py')
		name: 're_sub_callable'
%

category: 'Grail-Tests-ReSubCallable'
method: ReSubCallableTestCase
testSubStrCallable
	"A lambda replacement over a str subject."

	self assert: self loadFixture @env1:sub_str_callable equals: 'aXbXc'
%

category: 'Grail-Tests-ReSubCallable'
method: ReSubCallableTestCase
testSubBytesCallable
	"A lambda replacement over a bytes subject (the werkzeug cookie
	shape)."

	self assert: self loadFixture @env1:sub_bytes_callable equals: 'aXbXc' @env0:asByteArray
%

category: 'Grail-Tests-ReSubCallable'
method: ReSubCallableTestCase
testSubCallableUsesGroup
	"The replacement reads m.group() — the exact werkzeug cookie
	quoting shape."

	self assert: self loadFixture @env1:sub_callable_uses_group equals: 'a\"b\\c'
%

category: 'Grail-Tests-ReSubCallable'
method: ReSubCallableTestCase
testSubNamedDefCallable
	"A named def (not a lambda) as the replacement."

	self assert: self loadFixture @env1:sub_named_def_callable equals: 'ABCDEF'
%

category: 'Grail-Tests-ReSubCallable'
method: ReSubCallableTestCase
testSubnCallableCounts
	"subn returns (result, count) with a callable replacement."

	| r |
	r := self loadFixture @env1:subn_callable_counts.
	self assert: (r @env1:__getitem__: 0) equals: 'a#b#c#'.
	self assert: (r @env1:__getitem__: 1) equals: 3
%
