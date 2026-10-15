Class {
	#name : 'RuntimeGapsBehindPickleTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
RuntimeGapsBehindPickleTestCase >> assertMatchesCPythonAt: key [
	"Every recorded answer is already a repr string, so the two compare as text."

	| actual expected |
	actual := (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key.
	expected := (testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key.
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
RuntimeGapsBehindPickleTestCase >> setUp [
	"Reload tests/python/runtime_gaps_behind_pickle.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'runtime_gaps_behind_pickle' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/runtime_gaps_behind_pickle.py')
		name: 'runtime_gaps_behind_pickle'.

]

{ #category : 'Grail-Tests - Functions' }
RuntimeGapsBehindPickleTestCase >> testAFunctionModuleCanBeDeleted [
	"``del f.__module__' is legal and leaves None behind."

	self assertMatchesCPythonAt: 'del_function_module'.

]

{ #category : 'Grail-Tests - Lone surrogates' }
RuntimeGapsBehindPickleTestCase >> testALoneSurrogateStrHasTheStrSurface [
	"replace / split / find / strip / the justifiers and predicates, translate, and
	the four places a surrogate NAME used to fail: hasattr, bytes(s, enc),
	getattr(module, s) and __import__(s)."

	self assertMatchesCPythonAt: 'surrogate_str_methods'.
	self assertMatchesCPythonAt: 'surrogate_translate'.
	self assertMatchesCPythonAt: 'surrogate_hasattr'.
	self assertMatchesCPythonAt: 'surrogate_bytes'.
	self assertMatchesCPythonAt: 'surrogate_getattr_module'.
	self assertMatchesCPythonAt: 'surrogate_import'.
	self assertMatchesCPythonAt: 'surrogate_import_missing'.

]

{ #category : 'Grail-Tests - Builtin methods' }
RuntimeGapsBehindPickleTestCase >> testBuiltinMethodsBelongToTheirBuiltin [
	"str.index is 'str.index' of str, not of CharacterCollection, and a method a
	Python class inherits from a builtin IS the builtin's -- which is what lets
	pickle save either by name.  A Python __init__ is still its own class's."

	self assertMatchesCPythonAt: 'builtin_qualnames'.
	self assertMatchesCPythonAt: 'builtin_objclass'.
	self assertMatchesCPythonAt: 'inherited_builtin_is_builtins'.
	self assertMatchesCPythonAt: 'pickle_builtin_methods'.
	self assertMatchesCPythonAt: 'explicit_base_inits'.
	self assertMatchesCPythonAt: 'python_init_qualname'.

]

{ #category : 'Grail-Tests - Class __dict__' }
RuntimeGapsBehindPickleTestCase >> testClassDictHoldsTheDescriptors [
	"A @staticmethod / @classmethod reads from the class __dict__ as the descriptor
	object, whose __func__ works and which pickle refuses."

	self assertMatchesCPythonAt: 'class_dict_kinds'.
	self assertMatchesCPythonAt: 'class_dict_funcs'.
	self assertMatchesCPythonAt: 'descriptor_pickle'.

]

{ #category : 'Grail-Tests - collections' }
RuntimeGapsBehindPickleTestCase >> testCollectionsHaveTheirOwnReprs [
	"defaultdict and OrderedDict print as CPython's do, and defaultdict's repr is its
	own method -- pprint dispatches on type(obj).__repr__."

	self assertMatchesCPythonAt: 'collections_reprs'.

]

{ #category : 'Grail-Tests - Interning' }
RuntimeGapsBehindPickleTestCase >> testInternedStringsAreTheSameObject [
	"sys.intern answers one object per string, and an instance __dict__ hands out
	that object for its keys, on every read."

	self assertMatchesCPythonAt: 'intern_same_object'.
	self assertMatchesCPythonAt: 'intern_int'.
	self assertMatchesCPythonAt: 'intern_subclass'.
	self assertMatchesCPythonAt: 'dict_key_is_stable'.
	self assertMatchesCPythonAt: 'dict_key_is_interned'.

]

{ #category : 'Grail-Tests - Messages' }
RuntimeGapsBehindPickleTestCase >> testMessagesNameCPythonTypes [
	"builtin_function_or_method / function rather than BoundMethod, and CPython's
	wording for an empty attribute name."

	self assertMatchesCPythonAt: 'callable_type_names'.
	self assertMatchesCPythonAt: 'empty_attribute_name'.

]

{ #category : 'Grail-Tests - os.path' }
RuntimeGapsBehindPickleTestCase >> testOsPathAgreesWithPosixpath [
	"dirname / basename / split / splitext / normpath, on the inputs posixpath is
	exact about -- dirname('a.txt') is '', split('/a') is ('/', 'a'), exactly two
	leading slashes survive normpath -- and on bytes, which ended the session."

	self assertMatchesCPythonAt: 'path_dirname'.
	self assertMatchesCPythonAt: 'path_basename'.
	self assertMatchesCPythonAt: 'path_split'.
	self assertMatchesCPythonAt: 'path_splitext'.
	self assertMatchesCPythonAt: 'path_normpath'.
	self assertMatchesCPythonAt: 'path_bytes'.
	self assertMatchesCPythonAt: 'fspath_int'.
	self assertMatchesCPythonAt: 'fspath_bad_return'.

]

{ #category : 'Grail-Tests - os.stat_result' }
RuntimeGapsBehindPickleTestCase >> testStatResultIsAStructSequence [
	"A tuple of the ten POSIX fields with the rest as attributes; it compares,
	pickles and constructs as CPython's does."

	self assertMatchesCPythonAt: 'stat_is_a_sequence'.
	self assertMatchesCPythonAt: 'stat_names'.
	self assertMatchesCPythonAt: 'stat_pickles'.
	self assertMatchesCPythonAt: 'stat_repr_prefix'.
	self assertMatchesCPythonAt: 'stat_from_range'.
	self assertMatchesCPythonAt: 'stat_too_short'.
	self assertMatchesCPythonAt: 'stat_not_a_sequence'.

]

{ #category : 'Grail-Tests - stdlib' }
RuntimeGapsBehindPickleTestCase >> testStdlibNamesExistAndServe [
	"urlretrieve, the two http.server handlers, mimetypes.guess_file_type -- and
	SimpleHTTPRequestHandler serving a file, a 404 and a directory redirect."

	self assertMatchesCPythonAt: 'stdlib_names'.
	self assertMatchesCPythonAt: 'simple_http_handler'.

]

{ #category : 'Grail-Tests - super()' }
RuntimeGapsBehindPickleTestCase >> testSuperBypassesAnInstanceOverride [
	"super().m() from inside an instance override of m reaches the class's m, even
	after another instance of the base had m overridden -- which put a self-send
	dispatcher on the base that super() used to run."

	self assertMatchesCPythonAt: 'super_bypasses_instance_override'.

]
