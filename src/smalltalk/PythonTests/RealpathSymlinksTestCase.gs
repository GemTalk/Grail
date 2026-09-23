! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RealpathSymlinksTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RealpathSymlinksTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
RealpathSymlinksTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! RealpathSymlinksTestCase - os.path.realpath resolves symbolic links
! ===============================================================================
! realpath answered abspath: it normalised the path and resolved NOTHING, so
! realpath(link) answered the link's own name, and pathlib's Path.resolve()
! inherited that -- it calls os.path.realpath(self, strict=strict).
!
! It is CPython's own posixpath.realpath now.  Grail ships posixpath (pathlib
! imports it) and it already worked when called directly, so the fix is a
! delegation rather than a second copy of the component walk: each component is
! re-resolved against the directory holding it, '..' unwinds AFTER following,
! and a symlink LOOP is noticed and reported as ELOOP under strict.
!
! tests/python/realpath_symlinks.py holds the 18 checks, run under real CPython
! 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RealpathSymlinksTestCase removeAllMethods.
RealpathSymlinksTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: RealpathSymlinksTestCase
setUp

	importlib @env1:modules removeKey: #'realpath_symlinks' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/realpath_symlinks.py')
		name: 'realpath_symlinks'
%

category: 'Grail-Helpers'
method: RealpathSymlinksTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: RealpathSymlinksTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - os.path'
method: RealpathSymlinksTestCase
testRealpathResolvesALinkWhereverItAppears

	self assertAll: #('realpath_resolves_a_link_to_a_directory'
		'realpath_resolves_a_link_in_the_middle_of_a_path'
		'realpath_resolves_a_relative_link_against_its_own_directory'
		'realpath_resolves_a_chain_of_links'
		'realpath_unwinds_dotdot_after_following'
		'realpath_resolves_a_relative_argument_against_the_directory')
%

category: 'Grail-Tests - os.path'
method: RealpathSymlinksTestCase
testRealpathAnswersWhatCannotBeResolvedUnchanged

	self assertAll: #('realpath_answers_a_missing_path_unchanged'
		'realpath_answers_what_a_dangling_link_names'
		'realpath_leaves_a_path_with_no_links_alone'
		'realpath_agrees_with_posixpath_itself')
%

category: 'Grail-Tests - os.path'
method: RealpathSymlinksTestCase
testStrictRealpathRaisesWhereCPythonRaises

	self assertAll: #('strict_realpath_resolves_what_is_there'
		'strict_realpath_of_a_dangling_link_is_file_not_found'
		'strict_realpath_of_a_missing_component_is_file_not_found')
%

category: 'Grail-Tests - os.path'
method: RealpathSymlinksTestCase
testASymlinkLoopIsAnsweredAndThenReported

	self assertAll: #('realpath_of_a_loop_answers_the_path_it_could_not_resolve'
		'strict_realpath_of_a_loop_raises_too_many_levels')
%

category: 'Grail-Tests - os.path'
method: RealpathSymlinksTestCase
testPathResolveResolvesTheLinkToo

	self assertAll: #('path_resolve_resolves_the_link'
		'path_resolve_answers_a_path_object'
		'path_resolve_strict_of_a_dangling_link_is_file_not_found')
%

category: 'Grail-Tests - os.path'
method: RealpathSymlinksTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 18 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 18
%
