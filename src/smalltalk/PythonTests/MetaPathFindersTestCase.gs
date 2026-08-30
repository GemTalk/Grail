! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MetaPathFindersTestCase'
  instVarNames: #( results)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
MetaPathFindersTestCase comment:
'``sys.meta_path'' -- PEP 302 / PEP 451 finders, and what they may shadow.

Grail let a caller install a finder into ``sys.meta_path'' and then never asked
it anything.  That is why ``import six.moves.urllib.parse'' raised
ModuleNotFoundError: six installs a meta-path importer that FABRICATES its
``six.moves.*'' modules, so with meta_path unread there is nothing on disk to
find.  ``importlib class >> ___findViaMetaPath___:'' now consults it, in
CPython''s place -- after the sys.modules cache, before the native filesystem
search, which is itself simply the last finder (CPython''s PathFinder).

The one deviation from CPython is the protection, and it is deliberate:
GrailBuiltinImporter -- seeded at sys.meta_path[0], serving the modules Grail
itself ships -- is asked FIRST whatever its index in the list.  Literal
position would not do, because ``sys.meta_path.insert(0, f)'' is how everyone
spells ``ask my finder first'', and Grail''s own runtime imports out of that
tree at moments no user code chose (warnings -> linecache/re, PyEnumTypes ->
inspect, CPythonShim -> contextvars).  Removing the object from meta_path is
the explicit opt-out; re-ordering is not.

See tests/python/meta_path_finders.py.  Its seven SHARED checks were measured
against CPython 3.14 first and pass there; its three GRAIL-ONLY checks are
expected to fail under CPython (the fixture prints them XFAIL) -- CPython lets
a finder shadow ``traceback'', which is not preloaded, and dropped the legacy
find_module protocol in 3.12.'
%

expectvalue /Class
doit
MetaPathFindersTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
MetaPathFindersTestCase removeAllMethods: 0.
MetaPathFindersTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: MetaPathFindersTestCase
setUp
	"Load the fixture and run every check.  The fixture installs and removes
	its finders inside each check (a context manager restores sys.meta_path),
	so nothing it does outlives this method."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'meta_path_finders' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/meta_path_finders.py')
		name: 'meta_path_finders'.
	results := testModule @env1:run
%

category: 'Grail-Helpers'
method: MetaPathFindersTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := results @env1:__getitem__: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: MetaPathFindersTestCase
testFinderServesModulesGrailDoesNotOwn
	"The point of the feature: a finder may invent a module, including a
	package and its children, and a dotted import reaches all of them.  Every
	check here also passes under CPython 3.14."

	self assertAll: #('finder_serves_unowned_module'
		'finder_serves_dotted_submodule'
		'finder_gets_parent_path_argument')
%

category: 'Grail-Tests'
method: MetaPathFindersTestCase
testFinderProtocolDetails
	"Declining, ordering, the cache short-circuit, a loader that defines
	exec_module with a create_module answering None (CPython''s
	module_from_spec case), and the dunders the machinery must then set on the
	module it built.  All CPython-validated."

	self assertAll: #('finder_declining_falls_through'
		'first_claiming_finder_wins'
		'cached_module_is_never_offered'
		'exec_module_without_create_module'
		'machinery_sets_module_dunders'
		'invalidate_caches_reaches_finders'
		'namespace_spec_without_a_loader')
%

category: 'Grail-Tests'
method: MetaPathFindersTestCase
testGrailOwnStdlibIsNotShadowable
	"The protection, stated as a test: a finder inserted at sys.meta_path[0]
	claiming ``traceback'' (a module Grail SHIPS) or ``os'' (a Smalltalk-native
	one) loses, with the sys.modules cache emptied first so the cache is not
	what is being measured.  CPython disagrees on both -- see the class comment."

	self assertAll: #('grail_stdlib_module_is_not_shadowable'
		'grail_native_module_is_not_shadowable')
%

category: 'Grail-Tests'
method: MetaPathFindersTestCase
testLegacyFindModuleProtocol
	"PEP 302''s find_module/load_module, which CPython removed in 3.12 and
	Grail keeps: the third-party finders that matter -- six''s included -- still
	ship it beside find_spec."

	self assertAll: #('legacy_find_module_protocol')
%
