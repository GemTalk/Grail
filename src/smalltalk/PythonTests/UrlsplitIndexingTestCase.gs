! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UrlsplitIndexingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UrlsplitIndexingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
UrlsplitIndexingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! UrlsplitIndexingTestCase — urllib.parse.urlsplit's _SplitResult is indexable
! and tuple-unpackable (CPython's is a namedtuple).  The shim now defines
! __getitem__ / __len__ so ``scheme, netloc, ... = urlsplit(u)`` binds the
! components, not the index positions.  werkzeug's base_url setter depends on
! this.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UrlsplitIndexingTestCase removeAllMethods.
UrlsplitIndexingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Urlsplit'
method: UrlsplitIndexingTestCase
loadFixture
	"Load tests/python/urlsplit_indexing.py fresh."

	importlib @env1:modules @env0:removeKey: #'urlsplit_indexing' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/urlsplit_indexing.py')
		name: 'urlsplit_indexing'
%

category: 'Grail-Tests-Urlsplit'
method: UrlsplitIndexingTestCase
testAttributeAccess
	"Named-field access still works."

	| r |
	r := self loadFixture @env1:attribute_access.
	self assert: (r @env1:__getitem__: 0) equals: 'http'.
	self assert: (r @env1:__getitem__: 1) equals: 'localhost:8080'.
	self assert: (r @env1:__getitem__: 2) equals: '/p'.
	self assert: (r @env1:__getitem__: 3) equals: 'q=1'.
	self assert: (r @env1:__getitem__: 4) equals: 'f'
%

category: 'Grail-Tests-Urlsplit'
method: UrlsplitIndexingTestCase
testIndexAccess
	"``r[i]`` returns the i-th component, not the index i."

	| r |
	r := self loadFixture @env1:index_access.
	self assert: (r @env1:__getitem__: 0) equals: 'http'.
	self assert: (r @env1:__getitem__: 1) equals: 'localhost'.
	self assert: (r @env1:__getitem__: 2) equals: '/p'.
	self assert: (r @env1:__getitem__: 3) equals: 'q=1'
%

category: 'Grail-Tests-Urlsplit'
method: UrlsplitIndexingTestCase
testTupleUnpacking
	"``a, b, c, d, e = urlsplit(u)`` binds the components."

	| r |
	r := self loadFixture @env1:tuple_unpacking.
	self assert: (r @env1:__getitem__: 0) equals: 'https'.
	self assert: (r @env1:__getitem__: 1) equals: 'h'.
	self assert: (r @env1:__getitem__: 2) equals: '/x'
%

category: 'Grail-Tests-Urlsplit'
method: UrlsplitIndexingTestCase
testCleanUrlHasNoQueryOrFragment
	"The shape werkzeug's base_url setter unpacks — a clean URL has
	empty query and fragment (previously bound to truthy indices 3/4,
	tripping a spurious ValueError)."

	| r |
	r := self loadFixture @env1:clean_url_has_no_query_or_fragment.
	self assert: (r @env1:__getitem__: 0) equals: 'http'.
	self assert: (r @env1:__getitem__: 1) equals: 'localhost'.
	self assert: (r @env1:__getitem__: 2) equals: false.
	self assert: (r @env1:__getitem__: 3) equals: false
%
