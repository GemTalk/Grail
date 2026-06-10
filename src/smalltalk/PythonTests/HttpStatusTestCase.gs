! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for HttpStatusTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'HttpStatusTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
HttpStatusTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! HttpStatusTestCase
!
! Exercises http.HTTPStatus (the wrapper IntEnum stand-in): member
! attribute access, int-like forward/reverse comparison, value lookup,
! hashing, repr/str, and the name-derivation edge cases.  Drives
! tests/python/use_http_status.py, which stashes results in a dict.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
HttpStatusTestCase removeAllMethods.
HttpStatusTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: HttpStatusTestCase
setUp
	"Reload tests/python/use_http_status.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'use_http_status' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/use_http_status.py')
		name: 'use_http_status'.
%

category: 'Grail-Private'
method: HttpStatusTestCase
resultAt: key
	"Read a value the fixture stashed in its module-level dict ``r``."

	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests'
method: HttpStatusTestCase
testMemberAttributes
	self assert: (self resultAt: 'ok_value') equals: 200.
	self assert: (self resultAt: 'ok_phrase') equals: 'OK'.
	self assert: (self resultAt: 'ok_name') equals: 'OK'.
	self assert: (self resultAt: 'nf_value') equals: 404.
	self assert: (self resultAt: 'nf_phrase') equals: 'Not Found'.
	self assert: (self resultAt: 'nf_desc') equals: 'Nothing matches the given URI'.
	self assert: (self resultAt: 'int_nf') equals: 404.
	self assert: (self resultAt: 'continue_value') equals: 100.
	self assert: (self resultAt: 'gateway_timeout') equals: 504.
%

category: 'Grail-Tests'
method: HttpStatusTestCase
testForwardComparisons
	self assert: (self resultAt: 'eq_int').
	self assert: (self resultAt: 'eq_member').
	self deny: (self resultAt: 'eq_wrong').
	self assert: (self resultAt: 'lt').
	self assert: (self resultAt: 'le').
	self assert: (self resultAt: 'gt').
	self assert: (self resultAt: 'ge').
	self assert: (self resultAt: 'ne').
%

category: 'Grail-Tests'
method: HttpStatusTestCase
testReverseComparisons
	"int-on-the-left, member-on-the-right — exercises Grail's Integer
	dunder __index__ fallback."

	self assert: (self resultAt: 'req_eq').
	self assert: (self resultAt: 'req_lt').
	self assert: (self resultAt: 'req_le').
%

category: 'Grail-Tests'
method: HttpStatusTestCase
testHashAndLookup
	self assert: (self resultAt: 'hash_eq').
	self assert: (self resultAt: 'lookup_phrase') equals: 'Not Found'.
	self assert: (self resultAt: 'lookup_eq').
	self assert: (self resultAt: 'lookup_value') equals: 500.
	self assert: (self resultAt: 'invalid_raises').
%

category: 'Grail-Tests'
method: HttpStatusTestCase
testReprAndStr
	self assert: (self resultAt: 'repr') equals: '<HTTPStatus.NOT_FOUND: 404>'.
	self assert: (self resultAt: 'str') equals: '200'.
%

category: 'Grail-Tests'
method: HttpStatusTestCase
testNameEdgeCases
	"Apostrophe and hyphen are stripped/normalized to underscores."

	self assert: (self resultAt: 'teapot_value') equals: 418.
	self assert: (self resultAt: 'teapot_phrase') equals: 'I''m a Teapot'.
	self assert: (self resultAt: 'teapot_name') equals: 'IM_A_TEAPOT'.
	self assert: (self resultAt: 'hyphen_name') equals: 'NON_AUTHORITATIVE_INFORMATION'.
	self assert: (self resultAt: 'multi_status_name') equals: 'MULTI_STATUS'.
%
