Class {
	#name : 'ImportlibResourcesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Reload' }
ImportlibResourcesTestCase >> testAnchorResolvesThroughGrailsOwnStdlibRoot [
	"GRAIL-ONLY, and the reason it is not in the CPython fixture: the answer is
	a path inside this checkout.

	``files()'' does not re-derive a location.  It imports the anchor and reads
	the __path__ that importlib >> ___moduleNameToPath___: already recorded, so
	a package resolves to the root the IMPORT found it under -- here Grail's
	bundled stdlib, which that resolver deliberately searches BEFORE sys.path so
	a caller cannot shadow Grail's own modules.  Re-deriving the path in Python
	would have been free to disagree with the import; this pins that it cannot."

	| root |
	root := self eval: 'from importlib.resources import files
str(files("importlib"))'.
	self assert: root asString
		equals: importlib grailDir , '/src/python/stdlib/importlib'.

]

{ #category : 'Grail-Tests-Reload' }
ImportlibResourcesTestCase >> testAnUnknownAnchorRaisesModuleNotFoundError [
	"An anchor is imported, so a name that names nothing fails the way an
	import fails -- not as a bare path miss.  That is what lets a caller tell
	``no such package'' from ``package has no such resource''."

	| ok |
	ok := self eval: 'from importlib.resources import files
try:
    files("no_such_package_xyzzy")
    result = "no error"
except ModuleNotFoundError:
    result = "ModuleNotFoundError"
result'.
	self assert: ok asString equals: 'ModuleNotFoundError'.

]

{ #category : 'Grail-Tests-Reload' }
ImportlibResourcesTestCase >> testCertifiWhereIdiomLocatesABundledFile [
	"The exact shape of certifi.where(), which is the call that was broken:
	files(pkg).joinpath(name), wrapped in as_file, entered BY HAND (certifi
	keeps the manager in a global and hands __exit__ to atexit rather than
	using a ``with'' statement), then str()'d and opened.

	Run against Grail's own stdlib rather than certifi so the test needs no
	pip install; the certifi package itself is verified by hand -- see the PR."

	| result |
	result := self eval: 'from importlib.resources import as_file, files
import os
ctx = as_file(files("importlib").joinpath("util.py"))
located = str(ctx.__enter__())
ok = os.path.isfile(located)
with open(located) as fp:
    ok = ok and len(fp.read()) > 0
ctx.__exit__(None, None, None)
ok'.
	self assert: result equals: true.

]

{ #category : 'Grail-Tests-Reload' }
ImportlibResourcesTestCase >> testFilesWithNoAnchorRaisesTypeError [
	"GRAIL-ONLY -- CPython would contradict this, which is why it lives here.

	CPython 3.12+ lets ``files()'' be called with no argument and infers the
	caller's package from its globals.  Grail does not represent a module body
	as a Python frame, so the caller cannot be identified; raising beats
	guessing at a package and silently reading someone else's directory."

	| ok |
	ok := self eval: 'from importlib.resources import files
try:
    files()
    result = "no error"
except TypeError as e:
    result = "TypeError"
result'.
	self assert: ok asString equals: 'TypeError'.

]

{ #category : 'Grail-Tests-Reload' }
ImportlibResourcesTestCase >> testFixtureChecksAgreeWithCPython [
	"Every check in tests/python/importlib_resources.py, each answering True
	when Grail matches what CPython 3.14 actually did when the file was run
	under it.  The list is spelled out rather than discovered so that a check
	silently disappearing from the fixture fails here instead of quietly
	shrinking the suite.

	The fixture is importlib_resources_API.py, and the suffix is load-bearing:
	Grail names a module's Smalltalk class after its dotted path with the dots
	replaced by underscores, so ``importlib.resources'' IS the class
	``importlib_resources''.  Loading a top-level fixture under that name built
	a second class of the same name and clobbered the module under test -- every
	later resource call died with ``NameError: name '_os' is not defined'', and
	this test passed only when it happened to run first in the session."

	| mod |
	importlib @env1:modules removeKey: #'importlib_resources_api' ifAbsent: [].
	importlib @env1:modules removeKey: #'pkg_resource_fixture' ifAbsent: [].
	importlib @env1:modules removeKey: #'pkg_resource_fixture.sub' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/importlib_resources_api.py')
		name: 'importlib_resources_api'.
	#( 'files_of_a_package_is_its_directory'
	   'files_accepts_a_module_object'
	   'joinpath_finds_a_data_file'
	   'truediv_is_joinpath'
	   'read_text_returns_the_contents'
	   'read_text_honours_an_explicit_encoding'
	   'read_bytes_returns_bytes'
	   'open_reads_text_and_binary'
	   'joinpath_walks_several_segments'
	   'iterdir_lists_the_package_contents'
	   'a_subpackage_anchors_its_own_directory'
	   'as_file_yields_a_real_path'
	   'as_file_can_be_entered_by_hand'
	   'a_missing_resource_is_not_a_file'
	   'reading_a_missing_resource_raises_filenotfound'
	   'a_directory_is_not_a_resource'
	   'legacy_read_helpers_match_the_file'
	   'legacy_open_helpers_match_the_file'
	   'legacy_path_yields_a_real_path'
	   'legacy_contents_lists_the_package'
	   'what_files_answers_is_a_traversable'
	   'the_resources_abc_submodule_is_importable'
	   'traversable_is_not_re_exported_from_importlib_abc' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'importlib.resources check failed: ' , k].

]

{ #category : 'Grail-Tests-Reload' }
ImportlibResourcesTestCase >> testResourcesOfAnAnchorAreTheFilesBesideIt [
	"A resource is an ordinary file next to the package -- Grail reads module
	source off the real filesystem through GsFile, so there is no zip or loader
	indirection to model.  Reading one of Grail's own stdlib sources as a
	RESOURCE demonstrates exactly that, and needs no fixture."

	| head |
	head := self eval: 'from importlib.resources import files
files("importlib").joinpath("util.py").read_text()[:9]'.
	self assert: head asString equals: '# Minimal'.

]

{ #category : 'Grail-Tests-Reload' }
ImportlibResourcesTestCase >> testSearchRootsMirrorTheResolverOrder [
	"GRAIL-ONLY: importlib._search_roots() is the Python-side mirror of the
	root list ___moduleNameToPath___: builds, and ``files()'' falls back to it
	for a module with no __file__.  Its ORDER is the load-bearing part --
	grailDir and the bundled stdlib ahead of sys.path -- because answering a
	different root than the import used would hand back a different file than
	the one that got imported."

	| roots |
	roots := self eval: 'import importlib
importlib._search_roots()[:2]'.
	self assert: (roots @env1:__getitem__: 0) asString
		equals: importlib grailDir.
	self assert: (roots @env1:__getitem__: 1) asString
		equals: importlib grailDir , '/src/python/stdlib'.

]
